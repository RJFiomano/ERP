"""
Serviço para gestão de compras e pedidos de compra
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from uuid import UUID, uuid4
import logging
from decimal import Decimal
import json
import base64

from app.database.connection import get_db_connection
from app.models.response import APIResponse
from app.config import settings

# Imports para email - usando smtplib síncrono que funciona melhor no FastAPI
try:
    import smtplib
    import threading
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.mime.application import MIMEApplication
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False

# Importações para PDF
REPORTLAB_AVAILABLE = True  # Assumir que está disponível

def safe_format_date(date_obj):
    """Formata data de forma segura, seja datetime ou string"""
    if date_obj is None:
        return None
    
    # Se é datetime, formatar apenas a data (sem timezone issues)
    if hasattr(date_obj, 'strftime'):
        return date_obj.strftime('%Y-%m-%d')
    
    # Se é string, retornar apenas a parte da data
    if isinstance(date_obj, str):
        # Se tem formato datetime completo, pegar apenas a data
        if 'T' in date_obj:
            return date_obj.split('T')[0]
        return date_obj[:10] if len(date_obj) >= 10 else date_obj
        
    return str(date_obj)

logger = logging.getLogger(__name__)

class PurchaseService:
    """Serviço para operações de compra"""
    
    def __init__(self):
        pass
    
    # ===== FORNECEDORES =====
    
    async def get_suppliers(self, filters: Dict[str, Any] = None) -> APIResponse:
        """Buscar lista de fornecedores do sistema unificado"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Buscar fornecedores do sistema unificado de pessoas
            where_conditions = ["pp.papel = 'FORNECEDOR'", "pp.is_active = true", "p.is_active = true"]
            params = []
            
            filters = filters or {}
            
            if filters.get('search'):
                where_conditions.append("(p.nome ILIKE %s OR p.documento ILIKE %s)")
                search_param = f"%{filters['search']}%"
                params.extend([search_param, search_param])
            
            where_clause = "WHERE " + " AND ".join(where_conditions)
            
            query = f"""
                SELECT 
                    p.id, p.nome, p.documento, p.email,
                    ph.number as phone,
                    fd.prazo_entrega, fd.condicoes_pagamento, fd.observacoes_comerciais
                FROM pessoas p
                JOIN pessoa_papeis pp ON p.id = pp.pessoa_id
                LEFT JOIN fornecedores_dados fd ON p.id = fd.pessoa_id
                LEFT JOIN phones ph ON p.id = ph.pessoa_id AND ph.is_primary = true
                {where_clause}
                ORDER BY p.nome
                LIMIT %s OFFSET %s
            """
            
            limit = min(filters.get('limit', 50), 200)
            offset = filters.get('offset', 0)
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            suppliers = cursor.fetchall()
            
            result = []
            for supplier in suppliers:
                result.append({
                    'id': str(supplier[0]),
                    'name': supplier[1],
                    'document': supplier[2],
                    'email': supplier[3],
                    'phone': supplier[4],
                    'delivery_time': supplier[5] or 0,
                    'payment_terms': supplier[6] or 'a_vista',
                    'notes': supplier[7],
                    'is_active': True
                })
            
            return APIResponse(
                success=True,
                data=result,
                message=f"{len(result)} fornecedores encontrados"
            )
            
        except Exception as e:
            logger.error(f"Erro ao buscar fornecedores: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao buscar fornecedores: {str(e)}"
            )
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
    
    async def update_supplier_data(self, supplier_id: UUID, supplier_data: Dict[str, Any]) -> APIResponse:
        """Atualizar dados específicos do fornecedor no sistema unificado"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Atualizar dados específicos na tabela fornecedores_dados
            update_fields = []
            params = []
            
            if 'delivery_time' in supplier_data:
                update_fields.append("prazo_entrega = %s")
                params.append(supplier_data['delivery_time'])
            
            if 'payment_terms' in supplier_data:
                update_fields.append("condicoes_pagamento = %s")
                params.append(supplier_data['payment_terms'])
            
            if 'supplier_notes' in supplier_data:
                update_fields.append("observacoes_comerciais = %s")
                params.append(supplier_data['supplier_notes'])
            
            if not update_fields:
                return APIResponse(success=True, message="Nenhum campo para atualizar")
            
            # Verificar se fornecedor existe
            cursor.execute("""
                SELECT p.id, p.nome FROM pessoas p
                JOIN pessoa_papeis pp ON p.id = pp.pessoa_id
                WHERE p.id = %s AND pp.papel = 'FORNECEDOR' AND pp.is_active = true
            """, (str(supplier_id),))
            
            pessoa = cursor.fetchone()
            if not pessoa:
                return APIResponse(success=False, message="Fornecedor não encontrado")
            
            # Inserir ou atualizar dados específicos do fornecedor
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            params.append(str(supplier_id))
            
            query = f"""
                INSERT INTO fornecedores_dados (pessoa_id, {', '.join([f.split(' = ')[0] for f in update_fields[:-1]])})
                VALUES (%s, {', '.join(['%s'] * (len(params) - 1))})
                ON CONFLICT (pessoa_id) DO UPDATE SET
                {', '.join(update_fields)}
                RETURNING pessoa_id
            """
            
            all_params = [str(supplier_id)] + params[:-1] + params
            cursor.execute(query, all_params)
            
            conn.commit()
            return APIResponse(
                success=True,
                data={'id': str(pessoa[0]), 'name': pessoa[1]},
                message="Dados do fornecedor atualizados com sucesso"
            )
                
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao atualizar fornecedor: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao atualizar fornecedor: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    # ===== PEDIDOS DE COMPRA =====
    
    async def create_purchase_order(self, order_data: Dict[str, Any], user_id: UUID) -> APIResponse:
        """Criar novo pedido de compra"""
        try:
            logger.info(f"Dados do pedido recebidos: {order_data}")
            logger.info(f"User ID: {user_id}")
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Validar fornecedor no sistema unificado
            cursor.execute("""
                SELECT p.id, p.nome FROM pessoas p
                JOIN pessoa_papeis pp ON p.id = pp.pessoa_id
                WHERE p.id = %s AND pp.papel = 'FORNECEDOR' AND pp.is_active = true AND p.is_active = true
            """, (str(order_data['supplier_id']),))
            supplier = cursor.fetchone()
            if not supplier:
                return APIResponse(success=False, message="Fornecedor não encontrado ou inativo")
            
            # Criar pedido principal
            order_id = str(uuid4())
            cursor.execute("""
                INSERT INTO pedidos_compra (
                    id, supplier_id, user_id, data_entrega_prevista,
                    condicoes_pagamento, local_entrega, observacoes,
                    urgencia, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING numero_pedido
            """, (
                order_id,
                str(order_data['supplier_id']),
                str(user_id),
                order_data.get('delivery_date'),
                order_data.get('payment_terms', 'a_vista'),
                order_data.get('delivery_location'),
                order_data.get('notes'),
                order_data.get('urgency', 'normal'),
                str(user_id)
            ))
            
            order_number = cursor.fetchone()[0]
            
            # Adicionar itens
            items = order_data.get('items', [])
            # Para pedidos de cotação, não calculamos totais
            total_order = Decimal('0.00')
            
            for i, item in enumerate(items, 1):
                # Validar produto
                cursor.execute("SELECT id, name, sale_price FROM products WHERE id = %s", (str(item['product_id']),))
                product = cursor.fetchone()
                if not product:
                    conn.rollback()
                    return APIResponse(success=False, message=f"Produto {item['product_id']} não encontrado")
                
                quantity = Decimal(str(item['quantity']))
                # Para pedidos de compra (cotação), não calculamos valores
                unit_price = Decimal('0')  
                discount = Decimal('0')
                final_price = Decimal('0')
                subtotal = Decimal('0')
                
                cursor.execute("""
                    INSERT INTO pedidos_compra_itens (
                        pedido_id, product_id, quantidade, quantidade_pedida, preco_unitario,
                        desconto_item, preco_final, subtotal_item, valor_total_item, numero_item,
                        observacoes_item
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    order_id, str(item['product_id']), quantity, quantity, unit_price,
                    discount, final_price, subtotal, subtotal, i, item.get('notes')
                ))
            
            # Atualizar totais do pedido
            cursor.execute("""
                UPDATE pedidos_compra 
                SET subtotal = %s, valor_total = %s
                WHERE id = %s
            """, (total_order, total_order, order_id))
            
            conn.commit()
            
            return APIResponse(
                success=True,
                data={
                    'id': str(order_id),
                    'order_number': order_number,
                    'supplier_name': supplier[1],
                    'total': float(total_order),
                    'items_count': len(items)
                },
                message=f"Pedido {order_number} criado com sucesso"
            )
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao criar pedido de compra: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao criar pedido: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    async def get_purchase_orders(self, filters: Dict[str, Any] = None) -> APIResponse:
        """Buscar pedidos de compra"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Construir query
            where_conditions = []
            params = []
            
            filters = filters or {}
            
            if filters.get('supplier_id'):
                where_conditions.append("pc.pessoa_id = %s")
                params.append(filters['supplier_id'])
            
            if filters.get('status'):
                where_conditions.append("pc.status = %s")
                params.append(filters['status'])
            
            if filters.get('date_from'):
                where_conditions.append("pc.data_pedido >= %s")
                params.append(filters['date_from'])
            
            if filters.get('date_to'):
                where_conditions.append("pc.data_pedido <= %s")
                params.append(filters['date_to'])
            
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            query = f"""
                SELECT 
                    pc.id, pc.numero_pedido, pc.status, pc.urgencia,
                    pc.data_pedido, pc.data_entrega_prevista,
                    p.nome as supplier_name, p.documento as supplier_document,
                    u.email as created_by_email,
                    (SELECT COUNT(*) FROM pedidos_compra_itens WHERE pedido_id = pc.id) as items_count
                FROM pedidos_compra pc
                JOIN pessoas p ON pc.pessoa_id = p.id
                LEFT JOIN users u ON pc.user_id = u.id
                {where_clause}
                ORDER BY pc.data_pedido DESC
                LIMIT %s OFFSET %s
            """
            
            limit = min(filters.get('limit', 50), 200)
            offset = filters.get('offset', 0)
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            orders = cursor.fetchall()
            
            result = []
            for order in orders:
                result.append({
                    'id': str(order[0]),
                    'order_number': order[1],
                    'status': order[2],
                    'urgency': order[3],
                    'order_date': safe_format_date(order[4]),
                    'delivery_date': safe_format_date(order[5]),
                    'supplier_name': order[6],
                    'supplier_document': order[7],
                    'created_by': order[8],
                    'items_count': order[9]
                })
            
            return APIResponse(
                success=True,
                data=result,
                message=f"{len(result)} pedidos encontrados"
            )
            
        except Exception as e:
            logger.error(f"Erro ao buscar pedidos: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao buscar pedidos: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    async def get_purchase_order_details(self, order_id: UUID) -> APIResponse:
        """Buscar detalhes completos de um pedido"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Buscar pedido principal
            cursor.execute("""
                SELECT 
                    pc.id, pc.numero_pedido, pc.pessoa_id, pc.data_pedido, 
                    pc.data_entrega_prevista, pc.subtotal, pc.valor_total, pc.status, 
                    pc.urgencia, pc.condicoes_pagamento, pc.local_entrega, pc.observacoes,
                    p.nome as supplier_name, p.documento as supplier_document,
                    ph.number as phone, p.email
                FROM pedidos_compra pc
                JOIN pessoas p ON pc.pessoa_id = p.id
                LEFT JOIN phones ph ON p.id = ph.pessoa_id AND ph.is_primary = true
                WHERE pc.id = %s
            """, (str(order_id),))
            
            order = cursor.fetchone()
            if not order:
                return APIResponse(success=False, message="Pedido não encontrado")
            
            # Buscar itens
            cursor.execute("""
                SELECT 
                    pci.id, pci.pedido_id, pci.product_id, pci.quantidade, pci.quantidade_pedida,
                    pci.preco_unitario, pci.desconto_item, pci.preco_final, pci.subtotal_item, 
                    pci.valor_total_item, pci.numero_item, pci.observacoes_item,
                    p.name as product_name, p.barcode, p.sale_price
                FROM pedidos_compra_itens pci
                JOIN products p ON pci.product_id = p.id
                WHERE pci.pedido_id = %s
                ORDER BY pci.numero_item
            """, (str(order_id),))
            
            items = cursor.fetchall()
            
            # Montar resposta
            # Índices: 0=id, 1=numero_pedido, 2=pessoa_id, 3=data_pedido, 4=data_entrega_prevista, 
            # 5=subtotal, 6=valor_total, 7=status, 8=urgencia, 9=condicoes_pagamento, 
            # 10=local_entrega, 11=observacoes, 12=supplier_name, 13=supplier_document, 14=phone, 15=email
            order_data = {
                'id': str(order[0]),
                'order_number': order[1],
                'supplier': {
                    'id': str(order[2]),
                    'name': order[12],  # supplier_name
                    'document': order[13],  # supplier_document
                    'phone': order[14],  # phone
                    'email': order[15]  # email
                },
                'status': order[7],
                'urgency': order[8],
                'dates': {
                    'order_date': safe_format_date(order[3]),  # data_pedido
                    'delivery_expected': safe_format_date(order[4]),  # data_entrega_prevista
                    'delivery_confirmed': None  # não temos esse campo ainda
                },
                'values': {
                    'subtotal': 0,  # Zerado para pedidos de cotação
                    'discount': 0,
                    'shipping': 0,
                    'taxes': 0,
                    'total': 0  # Zerado para pedidos de cotação
                },
                'payment_terms': order[9],  # condicoes_pagamento
                'delivery_location': order[10],  # local_entrega
                'notes': order[11],  # observacoes
                'items': []
            }
            
            # Adicionar itens
            # Índices dos itens: 0=id, 1=pedido_id, 2=product_id, 3=quantidade, 4=quantidade_pedida,
            # 5=preco_unitario, 6=desconto_item, 7=preco_final, 8=subtotal_item, 9=valor_total_item, 
            # 10=numero_item, 11=observacoes_item, 12=product_name, 13=barcode, 14=sale_price
            for item in items:
                order_data['items'].append({
                    'id': str(item[0]),
                    'product': {
                        'id': str(item[2]),  # product_id
                        'name': item[12],    # product_name
                        'barcode': item[13]  # barcode
                    },
                    'quantities': {
                        'ordered': float(item[4]) if item[4] else 0,    # quantidade_pedida
                        'received': 0  # ainda não implementado
                    },
                    # Preços removidos para pedidos de cotação
                    'prices': {
                        'unit_price': 0,
                        'discount': 0,
                        'final_price': 0,
                        'subtotal': 0
                    },
                    'item_number': item[10],  # numero_item
                    'notes': item[11]  # observacoes_item
                })
            
            return APIResponse(
                success=True,
                data=order_data,
                message="Detalhes do pedido carregados"
            )
            
        except Exception as e:
            logger.error(f"Erro ao buscar detalhes do pedido: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao buscar pedido: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    async def update_purchase_order(self, order_id: UUID, order_data: Dict[str, Any], user_id: UUID) -> APIResponse:
        """Atualizar pedido de compra"""
        try:
            logger.error(f"=== SERVICE: INICIANDO ATUALIZAÇÃO DO PEDIDO {order_id} ===")
            logger.error(f"SERVICE: Dados recebidos: {order_data}")
            logger.error(f"SERVICE: User ID: {user_id}")
            logger.error(f"SERVICE: Items recebidos: {order_data.get('items', [])}")
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Verificar se o pedido existe e pode ser editado
            cursor.execute("""
                SELECT id, numero_pedido, status FROM pedidos_compra 
                WHERE id = %s
            """, (order_id,))
            
            order = cursor.fetchone()
            if not order:
                return APIResponse(success=False, message="Pedido não encontrado")
            
            if order[2] in ['recebido', 'cancelado']:
                return APIResponse(success=False, message="Pedido não pode ser editado neste status")
            
            # Validar fornecedor no sistema unificado
            cursor.execute("""
                SELECT p.id, p.nome FROM pessoas p
                JOIN pessoa_papeis pp ON p.id = pp.pessoa_id
                WHERE p.id = %s AND pp.papel = 'FORNECEDOR' AND pp.is_active = true AND p.is_active = true
            """, (order_data['supplier_id'],))
            supplier = cursor.fetchone()
            if not supplier:
                return APIResponse(success=False, message="Fornecedor não encontrado ou inativo")
            
            # Atualizar pedido principal
            cursor.execute("""
                UPDATE pedidos_compra 
                SET pessoa_id = %s, data_entrega_prevista = %s, 
                    condicoes_pagamento = %s, local_entrega = %s,
                    observacoes = %s, urgencia = %s, status = %s, updated_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                order_data['supplier_id'],
                order_data.get('delivery_date'),
                order_data.get('payment_terms', 'a_vista'),
                order_data.get('delivery_location'),
                order_data.get('notes'),
                order_data.get('urgency', 'normal'),
                order_data.get('status', 'rascunho'),
                user_id,
                order_id
            ))
            
            # Remover itens existentes
            cursor.execute("DELETE FROM pedidos_compra_itens WHERE pedido_id = %s", (order_id,))
            
            # Adicionar novos itens
            items = order_data.get('items', [])
            # Para pedidos de cotação, não calculamos totais
            total_order = Decimal('0.00')
            
            for i, item in enumerate(items, 1):
                # Validar produto
                cursor.execute("SELECT id, name, sale_price FROM products WHERE id = %s", (str(item['product_id']),))
                product = cursor.fetchone()
                if not product:
                    conn.rollback()
                    return APIResponse(success=False, message=f"Produto {item['product_id']} não encontrado")
                
                quantity = Decimal(str(item['quantity']))
                # Para pedidos de compra (cotação), não calculamos valores
                unit_price = Decimal('0')  
                discount = Decimal('0')
                final_price = Decimal('0')
                subtotal = Decimal('0')
                
                cursor.execute("""
                    INSERT INTO pedidos_compra_itens (
                        pedido_id, product_id, quantidade, quantidade_pedida, preco_unitario,
                        desconto_item, preco_final, subtotal_item, valor_total_item, numero_item,
                        observacoes_item
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    order_id, str(item['product_id']), quantity, quantity, unit_price,
                    discount, final_price, subtotal, subtotal, i, item.get('notes')
                ))
            
            # Atualizar totais do pedido
            cursor.execute("""
                UPDATE pedidos_compra 
                SET subtotal = %s, valor_total = %s
                WHERE id = %s
            """, (total_order, total_order, order_id))
            
            conn.commit()
            logger.error("=== SERVICE: COMMIT REALIZADO COM SUCESSO ===")
            
            result = APIResponse(
                success=True,
                data={
                    'id': str(order_id),
                    'order_number': order[1],
                    'supplier_name': supplier[1],
                    'total': float(total_order),
                    'items_count': len(items)
                },
                message=f"Pedido {order[1]} atualizado com sucesso"
            )
            
            logger.error(f"SERVICE: Resposta de sucesso: {result}")
            return result
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao atualizar pedido de compra: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao atualizar pedido: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()

    async def update_purchase_order_status(self, order_id: UUID, new_status: str, user_id: UUID) -> APIResponse:
        """Atualizar status do pedido de compra"""
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            logger.error(f"🔄 SERVICE: Atualizando status do pedido {order_id} para {new_status}")
            
            valid_statuses = ['rascunho', 'enviado', 'confirmado', 'parcial', 'recebido', 'cancelado']
            if new_status not in valid_statuses:
                return APIResponse(success=False, message="Status inválido")
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE pedidos_compra 
                SET status = %s
                WHERE id = %s
                RETURNING numero_pedido
            """, (new_status, order_id))
            
            result = cursor.fetchone()
            if result:
                conn.commit()
                logger.error(f"✅ SERVICE: Status atualizado com sucesso! Pedido {result[0]} → {new_status}")
                return APIResponse(
                    success=True,
                    message=f"Status do pedido {result[0]} atualizado para {new_status}"
                )
            else:
                logger.error(f"❌ SERVICE: Pedido {order_id} não encontrado!")
                return APIResponse(success=False, message="Pedido não encontrado")
                
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao atualizar status do pedido: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao atualizar status: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()

    async def delete_purchase_order(self, order_id: UUID, user_id: UUID) -> APIResponse:
        """Excluir pedido de compra"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Verificar se o pedido existe e pode ser excluído
            cursor.execute("""
                SELECT id, numero_pedido, status FROM pedidos_compra 
                WHERE id = %s
            """, (order_id,))
            
            order = cursor.fetchone()
            if not order:
                return APIResponse(success=False, message="Pedido não encontrado")
            
            # Não permitir excluir pedidos já recebidos
            if order[2] == 'recebido':
                return APIResponse(success=False, message="Não é possível excluir pedidos já recebidos")
            
            # Excluir itens do pedido primeiro (devido à foreign key)
            cursor.execute("DELETE FROM pedidos_compra_itens WHERE pedido_id = %s", (order_id,))
            
            # Excluir pedido
            cursor.execute("DELETE FROM pedidos_compra WHERE id = %s", (order_id,))
            
            conn.commit()
            
            return APIResponse(
                success=True,
                message=f"Pedido {order[1]} excluído com sucesso"
            )
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao excluir pedido de compra: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao excluir pedido: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()

    async def generate_purchase_order_pdf(self, order_data: Dict[str, Any]) -> bytes:
        """Gerar PDF do pedido de compra"""
        try:
            logger.error(f"🔥 GERANDO PDF - DADOS: {order_data.get('order_number', 'N/A')}")
            
            # Importações do reportlab
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
            from reportlab.lib.units import inch
            from io import BytesIO
            
            logger.error("📦 Reportlab importado com sucesso!")
            
            # Criar buffer
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
            
            # Estilos
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=18, spaceAfter=30, alignment=1)
            
            # Conteúdo do PDF
            story = []
            
            # Título
            story.append(Paragraph(f"PEDIDO DE COMPRA Nº {order_data.get('order_number', 'N/A')}", title_style))
            story.append(Spacer(1, 12))
            
            # Informações básicas do pedido
            logger.error(f"📝 Estrutura dos dados: {list(order_data.keys())}")
            
            # Informações do fornecedor
            supplier_info = order_data.get('supplier', {})
            story.append(Paragraph(f"<b>Fornecedor:</b> {supplier_info.get('name', 'N/A')}", styles['Normal']))
            story.append(Spacer(1, 6))
            
            # Data
            story.append(Paragraph(f"<b>Status:</b> {order_data.get('status', 'N/A')}", styles['Normal']))
            story.append(Spacer(1, 12))
            
            # Itens simplificados
            story.append(Paragraph("<b>ITENS DO PEDIDO:</b>", styles['Heading2']))
            story.append(Spacer(1, 6))
            
            items = order_data.get('items', [])
            if items:
                for i, item in enumerate(items, 1):
                    product = item.get('product', {})
                    quantities = item.get('quantities', {})
                    prices = item.get('prices', {})
                    
                    item_text = f"{i}. {product.get('name', 'N/A')} - Qtd: {quantities.get('ordered', 0)} - Total: R$ {prices.get('subtotal', 0):.2f}"
                    story.append(Paragraph(item_text, styles['Normal']))
                    story.append(Spacer(1, 3))
            else:
                story.append(Paragraph("Nenhum item encontrado", styles['Normal']))
            
            story.append(Spacer(1, 12))
            
            # Total
            values = order_data.get('values', {})
            total_value = values.get('total', 0)
            story.append(Paragraph(f"<b>VALOR TOTAL: R$ {total_value:.2f}</b>", styles['Heading2']))
            
            # Observações
            if order_data.get('notes'):
                story.append(Spacer(1, 12))
                story.append(Paragraph("<b>Observacoes:</b>", styles['Normal']))
                story.append(Paragraph(str(order_data.get('notes')), styles['Normal']))
            
            # Gerar PDF
            logger.error("🔨 Construindo PDF...")
            doc.build(story)
            
            # Obter bytes
            pdf_bytes = buffer.getvalue()
            buffer.close()
            
            logger.error(f"✅ PDF CRIADO! Tamanho: {len(pdf_bytes)} bytes")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"💥 ERRO na geração PDF: {str(e)}", exc_info=True)
            raise Exception(f"Erro PDF: {str(e)}")
    
    def format_date_for_pdf(self, date_str: str) -> str:
        """Formatar data para exibição no PDF"""
        if not date_str:
            return 'N/A'
        try:
            if isinstance(date_str, str):
                # Extrair só a parte da data se for datetime ISO
                date_part = date_str.split('T')[0] if 'T' in date_str else date_str
                # Tentar parsear como YYYY-MM-DD
                dt = datetime.strptime(date_part, '%Y-%m-%d')
                return dt.strftime('%d/%m/%Y')
        except Exception as e:
            logger.warning(f"Erro ao formatar data '{date_str}': {e}")
            return str(date_str) if date_str else 'N/A'
    
    async def send_order_by_email(self, order_id: UUID, email: str) -> APIResponse:
        """Enviar pedido por email usando SMTP síncrono em thread"""
        from app.config import settings
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        logger.error(f"📧 INICIANDO ENVIO EMAIL para {email}")
        
        if not EMAIL_AVAILABLE:
            logger.error("❌ Bibliotecas de email não disponíveis")
            return APIResponse(
                success=True,
                message=f"Email simulado (bibliotecas não disponíveis): {email}",
                data={"email": email, "simulated": True}
            )
        
        try:
            # Buscar dados do pedido
            order_response = await self.get_purchase_order_details(order_id)
            if not order_response.success:
                return APIResponse(success=False, message="Pedido não encontrado")
            
            order_data = order_response.data
            order_number = order_data.get('order_number', 'N/A')
            supplier_info = order_data.get('supplier', {})
            supplier_name = supplier_info.get('name', 'N/A')
            values = order_data.get('values', {})
            total = values.get('total', 0)
            items = order_data.get('items', [])
            
            # Gerar PDF primeiro
            pdf_content = None
            try:
                pdf_content = await self._generate_order_pdf(order_data)
                if pdf_content:
                    logger.error("📎 PDF gerado com sucesso!")
            except Exception as pdf_error:
                logger.error(f"⚠️ Erro ao gerar PDF: {pdf_error}")
            
            # Função síncrona para enviar email em thread separada
            def send_email_sync():
                try:
                    # Usar configurações do .env via settings
                    smtp_host = settings.smtp_host
                    smtp_port = settings.smtp_port
                    smtp_username = settings.smtp_username
                    smtp_password = settings.smtp_password
                    smtp_from = settings.smtp_from
                    
                    # Verificar se as credenciais estão configuradas
                    if not smtp_host or not smtp_username or not smtp_password:
                        return False, "⚠️ SMTP não configurado no .env"
                    
                    # Criar conteúdo do email
                    items_html = ""
                    for item in items:
                        product_name = item.get('product', {}).get('name', 'Item')
                        quantity = item.get('quantities', {}).get('ordered', 0)
                        notes = item.get('notes', '-')
                        
                        items_html += f"""
                        <tr style="border: 1px solid #ddd;">
                            <td style="padding: 8px;">{product_name}</td>
                            <td style="padding: 8px; text-align: center;">{quantity}</td>
                            <td style="padding: 8px;">{notes}</td>
                        </tr>
                        """
                    
                    # Corpo HTML do email
                    html_body = f"""
                    <html>
                    <body style="font-family: Arial, sans-serif; margin: 20px;">
                        <h2 style="color: #2196F3;">Pedido de Compra #{order_number}</h2>
                        
                        <p>Prezado(a) <strong>{supplier_name}</strong>,</p>
                        
                        <p>Solicitamos cotação para os itens relacionados abaixo. Por favor, nos informe preços, prazos de entrega e condições de pagamento.</p>
                        
                        <h3>Itens para Cotação:</h3>
                        <table style="border-collapse: collapse; width: 100%; margin: 20px 0; border: 1px solid #ddd;">
                            <thead>
                                <tr style="background-color: #f5f5f5;">
                                    <th style="padding: 12px; border: 1px solid #ddd;">Produto</th>
                                    <th style="padding: 12px; border: 1px solid #ddd;">Quantidade</th>
                                    <th style="padding: 12px; border: 1px solid #ddd;">Observações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items_html}
                            </tbody>
                        </table>
                        
                        <p><strong>Aguardamos sua cotação com:</strong></p>
                        <ul>
                            <li>Preços unitários para cada item</li>
                            <li>Prazo de entrega</li>
                            <li>Condições de pagamento</li>
                            <li>Validade da proposta</li>
                        </ul>
                        
                        <hr style="margin: 30px 0;">
                        <p style="font-size: 12px; color: #666;">
                            Este email foi enviado automaticamente pelo Sistema ERP.<br>
                            Em caso de dúvidas, entre em contato conosco.
                        </p>
                    </body>
                    </html>
                    """
                    
                    # Criar mensagem
                    msg = MIMEMultipart()
                    msg['From'] = smtp_from
                    msg['To'] = email
                    msg['Subject'] = f"Solicitação de Cotação #{order_number} - {supplier_name}"
                    
                    # Anexar corpo HTML
                    msg.attach(MIMEText(html_body, 'html', 'utf-8'))
                    
                    # Anexar PDF se disponível
                    if pdf_content:
                        pdf_attachment = MIMEApplication(pdf_content, _subtype='pdf')
                        pdf_attachment.add_header(
                            'Content-Disposition', 
                            'attachment', 
                            filename=f'solicitacao-cotacao-{order_number}.pdf'
                        )
                        msg.attach(pdf_attachment)
                    
                    # Enviar usando smtplib síncrono
                    server = smtplib.SMTP(smtp_host, smtp_port)
                    server.starttls()
                    server.login(smtp_username, smtp_password)
                    
                    text = msg.as_string()
                    server.sendmail(smtp_from, [email], text)
                    server.quit()
                    
                    return True, "Email enviado com sucesso!"
                    
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"💥 Erro no envio síncrono: {e}")
                    
                    # Mensagens específicas para erros comuns
                    if "Username and Password not accepted" in error_msg:
                        return False, "❌ Credenciais Gmail inválidas! Para corrigir:\n1. Acesse https://myaccount.google.com/security\n2. Ative 'Verificação em 2 etapas'\n3. Vá em 'Senhas de app'\n4. Gere nova senha para 'Mail'\n5. Substitua SMTP_PASSWORD no .env pela nova senha"
                    elif "Connection timed out" in error_msg:
                        return False, "⏰ Timeout na conexão SMTP. Verifique firewall/proxy."
                    else:
                        return False, f"Erro SMTP: {error_msg}"
            
            # Executar envio em thread para não bloquear o FastAPI
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor(max_workers=1) as executor:
                success, message = await loop.run_in_executor(executor, send_email_sync)
            
            if success:
                logger.error(f"✅ EMAIL enviado com sucesso para {email}")
                return APIResponse(
                    success=True, 
                    message=f"Email enviado com sucesso para {email}",
                    data={
                        "email": email, 
                        "order_number": order_number,
                        "pdf_attached": bool(pdf_content),
                        "real_email": True
                    }
                )
            else:
                logger.error(f"❌ Erro no envio: {message}")
                return APIResponse(success=False, message=f"Erro no envio: {message}")
            
        except Exception as e:
            logger.error(f"💥 ERRO geral no envio de email: {str(e)}", exc_info=True)
            return APIResponse(success=False, message=f"Erro no serviço de email: {str(e)}")
    
    async def _send_real_email_OLD(self, order_id: UUID, email: str, settings) -> APIResponse:
        """Enviar email real usando aiosmtplib"""
        try:
            import aiosmtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            from email.mime.application import MIMEApplication
            
            logger.error(f"📧 ENVIANDO EMAIL REAL para {email}")
            
            # Buscar dados do pedido
            order_response = await self.get_purchase_order_details(order_id)
            if not order_response.success:
                return APIResponse(success=False, message="Pedido não encontrado")
            
            order_data = order_response.data
            order_number = order_data.get('order_number', 'N/A')
            supplier_info = order_data.get('supplier', {})
            supplier_name = supplier_info.get('name', 'N/A')
            values = order_data.get('values', {})
            total = values.get('total', 0)
            items = order_data.get('items', [])
            
            # Criar conteúdo HTML do email
            items_html = ""
            for item in items:
                product_name = item.get('product', {}).get('name', 'Item')
                quantity = item.get('quantities', {}).get('ordered', 0)
                notes = item.get('notes', '-')
                
                items_html += f"""
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">{product_name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{quantity}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{notes}</td>
                </tr>
                """
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; margin: 20px;">
                <h2 style="color: #2196F3;">Solicitação de Cotação #{order_number}</h2>
                
                <p>Prezado(a) <strong>{supplier_name}</strong>,</p>
                
                <p>Segue anexo nossa solicitação de cotação para os itens relacionados abaixo.</p>
                
                <h3>Itens para Cotação:</h3>
                <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Produto</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Quantidade</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Observações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <p><strong>Por favor, nos envie sua cotação com:</strong></p>
                <ul>
                    <li>Preços unitários para cada item</li>
                    <li>Prazos de entrega</li>
                    <li>Condições de pagamento</li>
                    <li>Validade da proposta</li>
                </ul>
                
                <hr style="margin: 30px 0;">
                <p style="font-size: 12px; color: #666;">
                    Este email foi enviado automaticamente pelo Sistema ERP.<br>
                    Em caso de dúvidas, entre em contato conosco.
                </p>
            </body>
            </html>
            """
            
            # Criar mensagem
            msg = MIMEMultipart()
            msg['From'] = settings.smtp_from
            msg['To'] = email
            msg['Subject'] = f"Solicitação de Cotação #{order_number} - {supplier_name}"
            
            # Anexar corpo HTML
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))
            
            # Gerar e anexar PDF
            try:
                pdf_content = await self._generate_order_pdf(order_data)
                if pdf_content:
                    pdf_attachment = MIMEApplication(pdf_content, _subtype='pdf')
                    pdf_attachment.add_header(
                        'Content-Disposition', 
                        'attachment', 
                        filename=f'solicitacao-cotacao-{order_number}.pdf'
                    )
                    msg.attach(pdf_attachment)
                    logger.error("📎 PDF anexado ao email!")
            except Exception as pdf_error:
                logger.error(f"⚠️ Erro ao anexar PDF: {pdf_error}")
            
            # Configurações SMTP
            smtp_kwargs = {
                'hostname': settings.smtp_host,
                'port': settings.smtp_port,
                'start_tls': True,
                'username': settings.smtp_username,
                'password': settings.smtp_password,
                'timeout': 30
            }
            
            logger.error(f"📤 Enviando email via SMTP: {settings.smtp_host}:{settings.smtp_port}")
            
            # Enviar email
            await aiosmtplib.send(msg, **smtp_kwargs)
            
            logger.error(f"✅ EMAIL REAL enviado com sucesso para {email}")
            return APIResponse(
                success=True, 
                message=f"Email enviado com sucesso para {email}",
                data={
                    "email": email, 
                    "order_number": order_number,
                    "pdf_attached": True,
                    "real_email": True
                }
            )
            
        except Exception as e:
            logger.error(f"💥 ERRO ao enviar email real: {str(e)}", exc_info=True)
            # Se falhar, usar fallback simulado
            logger.error("⚠️ Fallback para simulação...")
            
            order_response = await self.get_purchase_order_details(order_id)
            if order_response.success:
                order_data = order_response.data
                order_number = order_data.get('order_number', 'N/A')
                pdf_content = await self._generate_order_pdf(order_data)
                pdf_size = len(pdf_content) if pdf_content else 0
                
                return APIResponse(
                    success=True,
                    message=f"Email simulado (erro SMTP): {str(e)[:100]}... - Pedido #{order_number}",
                    data={
                        "email": email,
                        "order_number": order_number,
                        "pdf_size": pdf_size,
                        "simulated": True,
                        "smtp_error": str(e)
                    }
                )
            else:
                return APIResponse(success=False, message=f"Erro SMTP e pedido não encontrado: {str(e)}")
    
    
    async def _generate_order_pdf(self, order_data: dict) -> bytes:
        """Gerar PDF do pedido de compra"""
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            # Extrair dados do pedido
            order_number = order_data.get('order_number', 'N/A')
            supplier_info = order_data.get('supplier', {})
            supplier_name = supplier_info.get('name', 'N/A')
            values = order_data.get('values', {})
            total = values.get('total', 0)
            subtotal = values.get('subtotal', 0)
            
            # Dados de datas
            dates = order_data.get('dates', {})
            order_date = dates.get('order_date', 'N/A')
            delivery_date = dates.get('delivery_expected', 'N/A')
            
            # Outros dados
            payment_terms = order_data.get('payment_terms', 'N/A')
            delivery_location = order_data.get('delivery_location', 'N/A')
            notes = order_data.get('notes', '')
            urgency = order_data.get('urgency', 'N/A')
            
            # Itens do pedido
            items = order_data.get('items', [])
            
            # Construir conteúdo dos itens para PDF
            items_content = ""
            y_position = 450
            
            for i, item in enumerate(items, 1):
                product_info = item.get('product', {})
                product_name = product_info.get('name', f'Item {i}')
                quantities = item.get('quantities', {})
                quantity = quantities.get('ordered', 0)
                notes = item.get('notes', '')
                
                items_content += f"""
0 -{20 * i} Td
({i}. {product_name[:40]}) Tj
250 0 Td
(Qtd: {quantity}) Tj
80 0 Td
(Obs: {notes[:20]}) Tj
-330 0 Td"""
            
            # Gerar PDF manual completo
            pdf_content = f"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
/F2 5 0 R
>>
>>
/Contents 6 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

6 0 obj
<<
/Length 2000
>>
stream
BT
/F2 18 Tf
72 720 Td
(SOLICITACAO DE COTACAO) Tj
0 -40 Td

/F2 12 Tf
(Numero do Pedido: {order_number}) Tj
0 -20 Td
(Data do Pedido: {order_date[:10] if order_date != 'N/A' else 'N/A'}) Tj
0 -20 Td
(Status: {order_data.get('status', 'N/A').upper()}) Tj
0 -30 Td

/F2 11 Tf
(FORNECEDOR:) Tj
0 -15 Td
/F1 10 Tf
(Nome: {supplier_name}) Tj
0 -30 Td

/F2 11 Tf
(DETALHES DO PEDIDO:) Tj
0 -15 Td
/F1 10 Tf
(Condicoes de Pagamento: {payment_terms}) Tj
0 -12 Td
(Data de Entrega: {delivery_date[:10] if delivery_date != 'N/A' else 'N/A'}) Tj
0 -12 Td
(Local de Entrega: {delivery_location if delivery_location else 'Nao especificado'}) Tj
0 -12 Td
(Urgencia: {urgency}) Tj
0 -30 Td

/F2 11 Tf
(ITENS DO PEDIDO ({len(items)} itens):) Tj
0 -15 Td
/F1 9 Tf
(Item                          Qtd      Preco Unit.    Total) Tj
0 -10 Td
(---------------------------------------------------------------) Tj{items_content}
0 -30 Td

/F2 12 Tf
(SUBTOTAL: R$ {subtotal:.2f}) Tj
0 -15 Td
(TOTAL GERAL: R$ {total:.2f}) Tj
0 -30 Td

/F1 9 Tf
(Observacoes:) Tj
0 -12 Td
({notes[:50] if notes else 'Nenhuma observacao'}) Tj
ET
endstream
endobj

xref
0 7
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000125 00000 n 
0000000280 00000 n 
0000000350 00000 n 
0000000420 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
2500
%%EOF""".encode('utf-8')
            
            logger.error("✅ PDF gerado com sucesso!")
            return pdf_content
            
        except Exception as e:
            logger.error(f"💥 ERRO ao gerar PDF: {str(e)}", exc_info=True)
            return None