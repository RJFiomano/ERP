"""
Serviço para gestão de estoque e movimentações
"""
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date
from uuid import UUID, uuid4
import logging
from decimal import Decimal
import xml.etree.ElementTree as ET

from app.database.connection import get_db_connection
from app.models.response import APIResponse

logger = logging.getLogger(__name__)

class StockService:
    """Serviço para operações de estoque"""
    
    # ===== ENTRADAS DE ESTOQUE =====
    
    async def create_stock_entry(self, entry_data: Dict[str, Any], user_id: UUID) -> APIResponse:
        """Criar nova entrada de estoque"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Validar fornecedor no sistema unificado
            cursor.execute("""
                SELECT p.id, p.nome FROM pessoas p
                JOIN pessoa_papeis pp ON p.id = pp.pessoa_id
                WHERE p.id = %s AND pp.papel = 'FORNECEDOR' AND pp.is_active = true AND p.is_active = true
            """, (entry_data['supplier_id'],))
            supplier = cursor.fetchone()
            if not supplier:
                return APIResponse(success=False, message="Fornecedor não encontrado")
            
            # Criar entrada principal
            entry_id = uuid4()
            cursor.execute("""
                INSERT INTO entradas_estoque (
                    id, pessoa_id, pedido_id, user_id, 
                    nfe_numero, nfe_serie, nfe_chave_acesso, nfe_data_emissao, nfe_valor_total,
                    data_recebimento, tipo_entrada, observacoes,
                    created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING numero_entrada
            """, (
                entry_id,
                entry_data['supplier_id'],
                entry_data.get('purchase_order_id'),
                user_id,
                entry_data.get('nfe_number'),
                entry_data.get('nfe_series'),
                entry_data.get('nfe_access_key'),
                entry_data.get('nfe_issue_date'),
                entry_data.get('nfe_total_value'),
                entry_data.get('received_date', datetime.now()),
                entry_data.get('entry_type', 'compra'),
                entry_data.get('notes'),
                user_id
            ))
            
            entry_number = cursor.fetchone()[0]
            
            # Adicionar itens
            items = entry_data.get('items', [])
            total_entry = Decimal('0.00')
            
            for i, item in enumerate(items, 1):
                # Validar produto
                cursor.execute("SELECT id, name FROM products WHERE id = %s", (item['product_id'],))
                product = cursor.fetchone()
                if not product:
                    conn.rollback()
                    return APIResponse(success=False, message=f"Produto {item['product_id']} não encontrado")
                
                quantity = Decimal(str(item['quantity']))
                unit_price = Decimal(str(item['unit_price']))
                unit_cost = Decimal(str(item.get('unit_cost', unit_price)))
                total_item = unit_cost * quantity
                total_entry += total_item
                
                cursor.execute("""
                    INSERT INTO entradas_estoque_itens (
                        entrada_id, product_id, quantidade_nota, quantidade_recebida,
                        preco_unitario, custo_unitario, valor_total_item,
                        lote, data_validade, numero_item,
                        nfe_produto_codigo, nfe_produto_descricao
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    entry_id, item['product_id'], quantity, quantity,
                    unit_price, unit_cost, total_item,
                    item.get('batch'), item.get('expiration_date'), i,
                    item.get('nfe_product_code'), item.get('nfe_description')
                ))
            
            # Atualizar totais da entrada
            cursor.execute("""
                UPDATE entradas_estoque 
                SET total_produtos = %s, total_nota = %s
                WHERE id = %s
            """, (total_entry, total_entry, entry_id))
            
            conn.commit()
            
            return APIResponse(
                success=True,
                data={
                    'id': str(entry_id),
                    'entry_number': entry_number,
                    'supplier_name': supplier[1],
                    'total': float(total_entry),
                    'items_count': len(items)
                },
                message=f"Entrada {entry_number} criada com sucesso"
            )
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao criar entrada de estoque: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao criar entrada: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    async def process_stock_entry(self, entry_id: UUID, user_id: UUID) -> APIResponse:
        """Processar entrada de estoque (dar baixa efetiva no estoque)"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Buscar entrada
            cursor.execute("""
                SELECT id, numero_entrada, status FROM entradas_estoque 
                WHERE id = %s
            """, (entry_id,))
            
            entry = cursor.fetchone()
            if not entry:
                return APIResponse(success=False, message="Entrada não encontrada")
            
            if entry[2] == 'lancado':
                return APIResponse(success=False, message="Entrada já foi processada")
            
            # Buscar itens da entrada
            cursor.execute("""
                SELECT 
                    product_id, quantidade_conferida, custo_unitario,
                    lote, data_validade, numero_item
                FROM entradas_estoque_itens 
                WHERE entrada_id = %s
            """, (entry_id,))
            
            items = cursor.fetchall()
            
            for item in items:
                product_id = item[0]
                quantity = item[1] or 0
                unit_cost = item[2] or 0
                batch = item[3]
                expiration_date = item[4]
                
                if quantity <= 0:
                    continue
                
                # Buscar estoque atual
                cursor.execute("""
                    SELECT quantidade_disponivel, custo_medio FROM estoque_atual 
                    WHERE product_id = %s
                """, (product_id,))
                
                current_stock = cursor.fetchone()
                current_qty = current_stock[0] if current_stock else Decimal('0')
                current_cost = current_stock[1] if current_stock else Decimal('0')
                
                # Calcular novo custo médio
                new_cost = self._calculate_average_cost(
                    current_qty, current_cost, quantity, unit_cost
                )
                new_quantity = current_qty + quantity
                
                # Criar movimentação
                cursor.execute("""
                    INSERT INTO movimentacoes_estoque (
                        product_id, tipo_movimentacao, quantidade_anterior,
                        quantidade_movimentada, quantidade_atual,
                        custo_unitario, custo_medio_anterior, custo_medio_atual,
                        valor_total_movimentacao, entrada_estoque_id, user_id,
                        lote, data_validade, observacoes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    product_id, 'entrada_compra', current_qty, quantity, new_quantity,
                    unit_cost, current_cost, new_cost, quantity * unit_cost,
                    entry_id, user_id, batch, expiration_date,
                    f"Entrada {entry[1]} - Item {item[5]}"
                ))
            
            # Atualizar status da entrada
            cursor.execute("""
                UPDATE entradas_estoque 
                SET status = 'lancado', data_lancamento = CURRENT_TIMESTAMP,
                    updated_by = %s
                WHERE id = %s
            """, (user_id, entry_id))
            
            conn.commit()
            
            return APIResponse(
                success=True,
                message=f"Entrada {entry[1]} processada com sucesso"
            )
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao processar entrada: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao processar entrada: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    def _calculate_average_cost(self, current_qty: Decimal, current_cost: Decimal, 
                              new_qty: Decimal, new_cost: Decimal) -> Decimal:
        """Calcular custo médio ponderado"""
        if current_qty <= 0:
            return new_cost
        
        if new_qty <= 0:
            return current_cost
        
        total_value = (current_qty * current_cost) + (new_qty * new_cost)
        total_qty = current_qty + new_qty
        
        return total_value / total_qty if total_qty > 0 else Decimal('0')
    
    # ===== MOVIMENTAÇÕES =====
    
    async def create_stock_movement(self, movement_data: Dict[str, Any], user_id: UUID) -> APIResponse:
        """Criar movimentação de estoque manual"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            product_id = movement_data['product_id']
            movement_type = movement_data['movement_type']
            quantity = Decimal(str(movement_data['quantity']))
            unit_cost = Decimal(str(movement_data.get('unit_cost', 0)))
            
            # Validar tipo de movimentação
            valid_types = [
                'entrada_ajuste', 'saida_ajuste', 'saida_perda', 
                'saida_uso_interno', 'entrada_devolucao', 'saida_devolucao'
            ]
            if movement_type not in valid_types:
                return APIResponse(success=False, message="Tipo de movimentação inválido")
            
            # Buscar produto
            cursor.execute("SELECT id, name FROM products WHERE id = %s", (product_id,))
            product = cursor.fetchone()
            if not product:
                return APIResponse(success=False, message="Produto não encontrado")
            
            # Buscar estoque atual
            cursor.execute("""
                SELECT quantidade_disponivel, custo_medio FROM estoque_atual 
                WHERE product_id = %s
            """, (product_id,))
            
            current_stock = cursor.fetchone()
            current_qty = current_stock[0] if current_stock else Decimal('0')
            current_cost = current_stock[1] if current_stock else Decimal('0')
            
            # Determinar se é entrada ou saída
            is_entry = movement_type.startswith('entrada_')
            movement_qty = quantity if is_entry else -quantity
            new_quantity = current_qty + movement_qty
            
            # Validar estoque não negativo (exceto para ajustes)
            if new_quantity < 0 and movement_type not in ['entrada_ajuste', 'saida_ajuste']:
                return APIResponse(success=False, message="Estoque insuficiente")
            
            # Calcular novo custo médio
            if is_entry and unit_cost > 0:
                new_cost = self._calculate_average_cost(
                    current_qty, current_cost, quantity, unit_cost
                )
            else:
                new_cost = current_cost
            
            # Criar movimentação
            cursor.execute("""
                INSERT INTO movimentacoes_estoque (
                    product_id, tipo_movimentacao, quantidade_anterior,
                    quantidade_movimentada, quantidade_atual,
                    custo_unitario, custo_medio_anterior, custo_medio_atual,
                    valor_total_movimentacao, user_id, observacoes, motivo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                product_id, movement_type, current_qty, movement_qty, new_quantity,
                unit_cost, current_cost, new_cost, abs(movement_qty) * unit_cost,
                user_id, movement_data.get('notes'), movement_data.get('reason')
            ))
            
            movement_id = cursor.fetchone()[0]
            conn.commit()
            
            return APIResponse(
                success=True,
                data={
                    'movement_id': str(movement_id),
                    'product_name': product[1],
                    'previous_stock': float(current_qty),
                    'new_stock': float(new_quantity),
                    'movement_quantity': float(movement_qty)
                },
                message="Movimentação de estoque criada com sucesso"
            )
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao criar movimentação: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao criar movimentação: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    # ===== CONSULTAS =====
    
    async def get_stock_current(self, filters: Dict[str, Any] = None) -> APIResponse:
        """Buscar situação atual do estoque"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            where_conditions = []
            params = []
            
            filters = filters or {}
            
            if filters.get('product_id'):
                where_conditions.append("ea.product_id = %s")
                params.append(filters['product_id'])
            
            if filters.get('category_id'):
                where_conditions.append("p.category_id = %s")
                params.append(filters['category_id'])
            
            if filters.get('low_stock_only'):
                where_conditions.append("ea.precisa_reposicao = true")
            
            if filters.get('zero_stock_only'):
                where_conditions.append("ea.estoque_zerado = true")
            
            if filters.get('negative_stock_only'):
                where_conditions.append("ea.estoque_negativo = true")
            
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            query = f"""
                SELECT 
                    ea.product_id, p.name, p.barcode, p.sale_price,
                    ea.quantidade_disponivel, ea.quantidade_reservada, ea.quantidade_total,
                    ea.custo_medio, ea.valor_estoque,
                    ea.estoque_minimo, ea.estoque_maximo, ea.ponto_reposicao,
                    ea.precisa_reposicao, ea.estoque_zerado, ea.estoque_negativo,
                    ea.ultima_entrada, ea.ultima_saida,
                    pc.name as category_name
                FROM estoque_atual ea
                JOIN products p ON ea.product_id = p.id
                LEFT JOIN product_categories pc ON p.category_id = pc.id
                {where_clause}
                ORDER BY p.name
                LIMIT %s OFFSET %s
            """
            
            limit = min(filters.get('limit', 100), 500)
            offset = filters.get('offset', 0)
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            stocks = cursor.fetchall()
            
            result = []
            for stock in stocks:
                margin = 0
                if stock[7] and stock[7] > 0 and stock[3]:  # custo_medio > 0 and sale_price exists
                    margin = ((stock[3] - stock[7]) / stock[7]) * 100
                
                result.append({
                    'product_id': str(stock[0]),
                    'product_name': stock[1],
                    'barcode': stock[2],
                    'sale_price': float(stock[3]) if stock[3] else 0,
                    'stock': {
                        'available': float(stock[4]) if stock[4] else 0,
                        'reserved': float(stock[5]) if stock[5] else 0,
                        'total': float(stock[6]) if stock[6] else 0
                    },
                    'cost': {
                        'average_cost': float(stock[7]) if stock[7] else 0,
                        'stock_value': float(stock[8]) if stock[8] else 0
                    },
                    'limits': {
                        'minimum': float(stock[9]) if stock[9] else 0,
                        'maximum': float(stock[10]) if stock[10] else 0,
                        'reorder_point': float(stock[11]) if stock[11] else 0
                    },
                    'alerts': {
                        'needs_restock': stock[12],
                        'zero_stock': stock[13],
                        'negative_stock': stock[14]
                    },
                    'last_movements': {
                        'last_entry': stock[15].isoformat() if stock[15] else None,
                        'last_exit': stock[16].isoformat() if stock[16] else None
                    },
                    'category': stock[17],
                    'margin_percentage': round(margin, 2)
                })
            
            return APIResponse(
                success=True,
                data=result,
                message=f"{len(result)} produtos encontrados"
            )
            
        except Exception as e:
            logger.error(f"Erro ao buscar estoque: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao buscar estoque: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    async def get_stock_movements(self, filters: Dict[str, Any] = None) -> APIResponse:
        """Buscar histórico de movimentações"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            where_conditions = []
            params = []
            
            filters = filters or {}
            
            if filters.get('product_id'):
                where_conditions.append("me.product_id = %s")
                params.append(filters['product_id'])
            
            if filters.get('movement_type'):
                where_conditions.append("me.tipo_movimentacao = %s")
                params.append(filters['movement_type'])
            
            if filters.get('date_from'):
                where_conditions.append("me.data_movimentacao >= %s")
                params.append(filters['date_from'])
            
            if filters.get('date_to'):
                where_conditions.append("me.data_movimentacao <= %s")
                params.append(filters['date_to'])
            
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            query = f"""
                SELECT 
                    me.id, me.product_id, p.name as product_name, p.barcode,
                    me.tipo_movimentacao, me.quantidade_anterior, me.quantidade_movimentada,
                    me.quantidade_atual, me.custo_unitario, me.valor_total_movimentacao,
                    me.data_movimentacao, me.observacoes, me.motivo,
                    me.lote, me.data_validade,
                    u.email as user_email,
                    ee.numero_entrada
                FROM movimentacoes_estoque me
                JOIN products p ON me.product_id = p.id
                LEFT JOIN auth.users u ON me.user_id = u.id
                LEFT JOIN entradas_estoque ee ON me.entrada_estoque_id = ee.id
                {where_clause}
                ORDER BY me.data_movimentacao DESC
                LIMIT %s OFFSET %s
            """
            
            limit = min(filters.get('limit', 100), 500)
            offset = filters.get('offset', 0)
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            movements = cursor.fetchall()
            
            result = []
            for mov in movements:
                result.append({
                    'id': str(mov[0]),
                    'product': {
                        'id': str(mov[1]),
                        'name': mov[2],
                        'barcode': mov[3]
                    },
                    'movement': {
                        'type': mov[4],
                        'previous_quantity': float(mov[5]),
                        'movement_quantity': float(mov[6]),
                        'current_quantity': float(mov[7])
                    },
                    'cost': {
                        'unit_cost': float(mov[8]) if mov[8] else 0,
                        'total_value': float(mov[9]) if mov[9] else 0
                    },
                    'date': mov[10].isoformat() if mov[10] else None,
                    'notes': mov[11],
                    'reason': mov[12],
                    'batch': mov[13],
                    'expiration_date': mov[14].isoformat() if mov[14] else None,
                    'user': mov[15],
                    'entry_number': mov[16]
                })
            
            return APIResponse(
                success=True,
                data=result,
                message=f"{len(result)} movimentações encontradas"
            )
            
        except Exception as e:
            logger.error(f"Erro ao buscar movimentações: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao buscar movimentações: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    # ===== IMPORTAÇÃO NFE =====
    
    async def import_nfe_xml(self, xml_content: str, supplier_id: UUID, user_id: UUID) -> APIResponse:
        """Importar dados de NFe a partir do XML"""
        try:
            # Parsear XML
            root = ET.fromstring(xml_content)
            
            # Extrair informações principais da NFe
            # Namespace da NFe
            ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
            
            inf_nfe = root.find('.//nfe:infNFe', ns)
            if inf_nfe is None:
                return APIResponse(success=False, message="XML da NFe inválido")
            
            # Dados da NFe
            ide = inf_nfe.find('nfe:ide', ns)
            emit = inf_nfe.find('nfe:emit', ns)
            total = inf_nfe.find('.//nfe:total/nfe:ICMSTot', ns)
            
            nfe_data = {
                'numero': ide.find('nfe:nNF', ns).text if ide.find('nfe:nNF', ns) is not None else None,
                'serie': ide.find('nfe:serie', ns).text if ide.find('nfe:serie', ns) is not None else None,
                'chave': inf_nfe.get('Id', '').replace('NFe', '') if inf_nfe.get('Id') else None,
                'data_emissao': ide.find('nfe:dhEmi', ns).text[:10] if ide.find('nfe:dhEmi', ns) is not None else None,
                'valor_total': float(total.find('nfe:vNF', ns).text) if total.find('nfe:vNF', ns) is not None else 0
            }
            
            # Extrair itens
            det_list = inf_nfe.findall('nfe:det', ns)
            items = []
            
            for det in det_list:
                prod = det.find('nfe:prod', ns)
                imposto = det.find('nfe:imposto', ns)
                
                if prod is not None:
                    item = {
                        'nfe_item_numero': int(det.get('nItem', 0)),
                        'codigo_produto': prod.find('nfe:cProd', ns).text if prod.find('nfe:cProd', ns) is not None else '',
                        'descricao': prod.find('nfe:xProd', ns).text if prod.find('nfe:xProd', ns) is not None else '',
                        'ncm': prod.find('nfe:NCM', ns).text if prod.find('nfe:NCM', ns) is not None else '',
                        'quantidade': float(prod.find('nfe:qCom', ns).text) if prod.find('nfe:qCom', ns) is not None else 0,
                        'valor_unitario': float(prod.find('nfe:vUnCom', ns).text) if prod.find('nfe:vUnCom', ns) is not None else 0,
                        'valor_total': float(prod.find('nfe:vProd', ns).text) if prod.find('nfe:vProd', ns) is not None else 0,
                        'unidade': prod.find('nfe:uCom', ns).text if prod.find('nfe:uCom', ns) is not None else 'UN'
                    }
                    
                    # Extrair impostos se disponíveis
                    if imposto is not None:
                        icms = imposto.find('.//nfe:ICMS', ns)
                        ipi = imposto.find('.//nfe:IPI', ns)
                        
                        if icms is not None:
                            item['icms_valor'] = 0  # Implementar extração detalhada conforme necessário
                        
                        if ipi is not None:
                            item['ipi_valor'] = 0  # Implementar extração detalhada conforme necessário
                    
                    items.append(item)
            
            return APIResponse(
                success=True,
                data={
                    'nfe_info': nfe_data,
                    'items': items,
                    'xml_content': xml_content
                },
                message=f"NFe {nfe_data['numero']} importada com {len(items)} itens"
            )
            
        except ET.ParseError as e:
            return APIResponse(
                success=False,
                message=f"Erro ao processar XML: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Erro ao importar NFe: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao importar NFe: {str(e)}"
            )