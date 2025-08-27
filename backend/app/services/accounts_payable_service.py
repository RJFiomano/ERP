"""
Serviço para gestão de contas a pagar
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from uuid import UUID, uuid4
import logging
from decimal import Decimal

from app.database.connection import get_db_connection
from app.models.response import APIResponse

logger = logging.getLogger(__name__)

class AccountsPayableService:
    """Serviço para operações de contas a pagar"""
    
    async def create_account_payable(self, account_data: Dict[str, Any], user_id: UUID) -> APIResponse:
        """Criar nova conta a pagar"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Validar fornecedor no sistema unificado
            cursor.execute("""
                SELECT p.id, p.nome FROM pessoas p
                JOIN pessoa_papeis pp ON p.id = pp.pessoa_id
                WHERE p.id = %s AND pp.papel = 'FORNECEDOR' AND pp.is_active = true AND p.is_active = true
            """, (account_data['supplier_id'],))
            supplier = cursor.fetchone()
            if not supplier:
                return APIResponse(success=False, message="Fornecedor não encontrado")
            
            # Criar conta principal
            account_id = uuid4()
            cursor.execute("""
                INSERT INTO contas_pagar (
                    id, pessoa_id, entrada_estoque_id, pedido_id, user_id,
                    documento_tipo, documento_numero, documento_serie, documento_chave,
                    documento_valor, data_emissao, data_vencimento_original,
                    valor_original, valor_desconto, valor_acrescimo, valor_liquido,
                    forma_pagamento, condicoes_pagamento, numero_parcelas, intervalo_parcelas,
                    descricao, observacoes, categoria_conta, centro_custo,
                    created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING numero_conta
            """, (
                account_id,
                account_data['supplier_id'],
                account_data.get('stock_entry_id'),
                account_data.get('purchase_order_id'),
                user_id,
                account_data.get('document_type', 'nfe'),
                account_data['document_number'],
                account_data.get('document_series'),
                account_data.get('document_key'),
                account_data['document_value'],
                account_data['issue_date'],
                account_data['due_date'],
                account_data['original_value'],
                account_data.get('discount_value', 0),
                account_data.get('additional_value', 0),
                account_data['original_value'] - account_data.get('discount_value', 0) + account_data.get('additional_value', 0),
                account_data.get('payment_method', 'boleto'),
                account_data.get('payment_terms'),
                account_data.get('installments', 1),
                account_data.get('installment_interval', 30),
                account_data['description'],
                account_data.get('notes'),
                account_data.get('account_category'),
                account_data.get('cost_center'),
                user_id
            ))
            
            account_number = cursor.fetchone()[0]
            
            conn.commit()
            
            return APIResponse(
                success=True,
                data={
                    'id': str(account_id),
                    'account_number': account_number,
                    'supplier_name': supplier[1],
                    'total_value': float(account_data['original_value']),
                    'installments': account_data.get('installments', 1)
                },
                message=f"Conta {account_number} criada com sucesso"
            )
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao criar conta a pagar: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao criar conta: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    async def get_accounts_payable(self, filters: Dict[str, Any] = None) -> APIResponse:
        """Buscar contas a pagar"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            where_conditions = []
            params = []
            
            filters = filters or {}
            
            if filters.get('supplier_id'):
                where_conditions.append("cp.pessoa_id = %s")
                params.append(filters['supplier_id'])
            
            if filters.get('status'):
                where_conditions.append("cp.status = %s")
                params.append(filters['status'])
            
            if filters.get('due_date_from'):
                where_conditions.append("cp.data_vencimento_original >= %s")
                params.append(filters['due_date_from'])
            
            if filters.get('due_date_to'):
                where_conditions.append("cp.data_vencimento_original <= %s")
                params.append(filters['due_date_to'])
            
            if filters.get('overdue_only'):
                where_conditions.append("cp.data_vencimento_original < CURRENT_DATE AND cp.status IN ('em_aberto', 'pago_parcial')")
            
            if filters.get('category'):
                where_conditions.append("cp.categoria_conta = %s")
                params.append(filters['category'])
            
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            query = f"""
                SELECT 
                    cp.id, cp.numero_conta, cp.status, cp.documento_numero,
                    cp.data_emissao, cp.data_vencimento_original,
                    cp.valor_original, cp.valor_liquido, cp.valor_pago, cp.valor_em_aberto,
                    cp.forma_pagamento, cp.categoria_conta, cp.descricao,
                    p.nome as supplier_name, p.documento as supplier_document,
                    -- Próximo vencimento
                    (SELECT MIN(data_vencimento) FROM contas_pagar_parcelas 
                     WHERE conta_pagar_id = cp.id AND status IN ('em_aberto', 'vencido')) as proximo_vencimento,
                    -- Dias em atraso
                    GREATEST(0, CURRENT_DATE - cp.data_vencimento_original) as dias_atraso
                FROM contas_pagar cp
                JOIN pessoas p ON cp.pessoa_id = p.id
                {where_clause}
                ORDER BY cp.data_vencimento_original ASC, cp.created_at DESC
                LIMIT %s OFFSET %s
            """
            
            limit = min(filters.get('limit', 100), 500)
            offset = filters.get('offset', 0)
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            accounts = cursor.fetchall()
            
            result = []
            for account in accounts:
                result.append({
                    'id': str(account[0]),
                    'account_number': account[1],
                    'status': account[2],
                    'document_number': account[3],
                    'dates': {
                        'issue_date': account[4].isoformat() if account[4] else None,
                        'due_date': account[5].isoformat() if account[5] else None,
                        'next_due_date': account[15].isoformat() if account[15] else None
                    },
                    'values': {
                        'original': float(account[6]) if account[6] else 0,
                        'net': float(account[7]) if account[7] else 0,
                        'paid': float(account[8]) if account[8] else 0,
                        'balance': float(account[9]) if account[9] else 0
                    },
                    'payment_method': account[10],
                    'category': account[11],
                    'description': account[12],
                    'supplier': {
                        'name': account[13],
                        'document': account[14]
                    },
                    'days_overdue': int(account[16]) if account[16] else 0,
                    'is_overdue': account[16] > 0 if account[16] else False
                })
            
            return APIResponse(
                success=True,
                data=result,
                message=f"{len(result)} contas encontradas"
            )
            
        except Exception as e:
            logger.error(f"Erro ao buscar contas a pagar: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao buscar contas: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    async def get_account_details(self, account_id: UUID) -> APIResponse:
        """Buscar detalhes completos de uma conta a pagar"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Buscar conta principal
            cursor.execute("""
                SELECT 
                    cp.*, c.name as supplier_name, c.document as supplier_document,
                    c.phone, c.email
                FROM contas_pagar cp
                JOIN pessoas p ON cp.pessoa_id = p.id
                WHERE cp.id = %s
            """, (account_id,))
            
            account = cursor.fetchone()
            if not account:
                return APIResponse(success=False, message="Conta não encontrada")
            
            # Buscar parcelas
            cursor.execute("""
                SELECT 
                    id, numero_parcela, valor_parcela, valor_final, valor_pago,
                    data_vencimento, data_vencimento_original, data_pagamento,
                    status, dias_atraso, forma_pagamento
                FROM contas_pagar_parcelas
                WHERE conta_pagar_id = %s
                ORDER BY numero_parcela
            """, (account_id,))
            
            installments = cursor.fetchall()
            
            # Buscar pagamentos
            cursor.execute("""
                SELECT 
                    cpp.id, cpp.valor_pago, cpp.data_pagamento, cpp.forma_pagamento,
                    cpp.numero_documento, cpp.observacoes_pagamento,
                    cpp.parcela_id, cp.numero_parcela,
                    u.email as paid_by
                FROM contas_pagar_pagamentos cpp
                JOIN contas_pagar_parcelas cp ON cpp.parcela_id = cp.id
                LEFT JOIN auth.users u ON cpp.pago_por = u.id
                WHERE cp.conta_pagar_id = %s
                ORDER BY cpp.data_pagamento DESC
            """, (account_id,))
            
            payments = cursor.fetchall()
            
            # Montar resposta
            account_data = {
                'id': str(account[0]),
                'account_number': account[1],
                'supplier': {
                    'id': str(account[2]),
                    'name': account[-4],
                    'document': account[-3],
                    'phone': account[-2],
                    'email': account[-1]
                },
                'document': {
                    'type': account[6],
                    'number': account[7],
                    'series': account[8],
                    'key': account[9],
                    'value': float(account[10]) if account[10] else 0
                },
                'dates': {
                    'issue_date': account[11].isoformat() if account[11] else None,
                    'original_due_date': account[12].isoformat() if account[12] else None,
                    'competence_date': account[13].isoformat() if account[13] else None
                },
                'values': {
                    'original': float(account[15]) if account[15] else 0,
                    'discount': float(account[16]) if account[16] else 0,
                    'additional': float(account[17]) if account[17] else 0,
                    'net': float(account[18]) if account[18] else 0,
                    'paid': float(account[19]) if account[19] else 0,
                    'balance': float(account[20]) if account[20] else 0
                },
                'taxes': {
                    'irrf_value': float(account[21]) if account[21] else 0,
                    'inss_value': float(account[23]) if account[23] else 0,
                    'iss_value': float(account[25]) if account[25] else 0,
                    'pis_value': float(account[27]) if account[27] else 0,
                    'cofins_value': float(account[29]) if account[29] else 0,
                    'csll_value': float(account[31]) if account[31] else 0
                },
                'payment_info': {
                    'method': account[34],
                    'terms': account[35],
                    'installments': account[36],
                    'interval': account[37]
                },
                'status': account[32],
                'situation': account[33],
                'category': account[43],
                'cost_center': account[42],
                'description': account[45],
                'notes': account[46],
                'installments': [],
                'payments': []
            }
            
            # Adicionar parcelas
            for inst in installments:
                account_data['installments'].append({
                    'id': str(inst[0]),
                    'number': inst[1],
                    'value': float(inst[2]),
                    'final_value': float(inst[3]),
                    'paid_value': float(inst[4]),
                    'due_date': inst[5].isoformat() if inst[5] else None,
                    'original_due_date': inst[6].isoformat() if inst[6] else None,
                    'payment_date': inst[7].isoformat() if inst[7] else None,
                    'status': inst[8],
                    'days_overdue': inst[9],
                    'payment_method': inst[10]
                })
            
            # Adicionar pagamentos
            for payment in payments:
                account_data['payments'].append({
                    'id': str(payment[0]),
                    'amount': float(payment[1]),
                    'date': payment[2].isoformat() if payment[2] else None,
                    'method': payment[3],
                    'document_number': payment[4],
                    'notes': payment[5],
                    'installment_number': payment[7],
                    'paid_by': payment[8]
                })
            
            return APIResponse(
                success=True,
                data=account_data,
                message="Detalhes da conta carregados"
            )
            
        except Exception as e:
            logger.error(f"Erro ao buscar detalhes da conta: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao buscar conta: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    async def process_payment(self, payment_data: Dict[str, Any], user_id: UUID) -> APIResponse:
        """Processar pagamento de parcela"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            installment_id = payment_data['installment_id']
            amount_paid = Decimal(str(payment_data['amount']))
            payment_method = payment_data['payment_method']
            
            # Buscar parcela
            cursor.execute("""
                SELECT cp.id, cp.numero_parcela, cp.valor_final, cp.valor_pago, cp.status,
                       cp.conta_pagar_id
                FROM contas_pagar_parcelas cp
                WHERE cp.id = %s
            """, (installment_id,))
            
            installment = cursor.fetchone()
            if not installment:
                return APIResponse(success=False, message="Parcela não encontrada")
            
            if installment[4] == 'pago':
                return APIResponse(success=False, message="Parcela já está paga")
            
            # Validar valor
            remaining_value = installment[2] - installment[3]  # valor_final - valor_pago
            if amount_paid > remaining_value:
                return APIResponse(success=False, message="Valor do pagamento maior que o saldo da parcela")
            
            # Registrar pagamento
            payment_id = uuid4()
            cursor.execute("""
                INSERT INTO contas_pagar_pagamentos (
                    id, parcela_id, valor_pago, forma_pagamento,
                    banco_codigo, numero_documento, observacoes_pagamento,
                    pago_por
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                payment_id, installment_id, amount_paid, payment_method,
                payment_data.get('bank_code'), payment_data.get('document_number'),
                payment_data.get('notes'), user_id
            ))
            
            # Atualizar parcela
            new_paid_value = installment[3] + amount_paid
            new_status = 'pago' if new_paid_value >= installment[2] else 'pago_parcial'
            
            cursor.execute("""
                UPDATE contas_pagar_parcelas
                SET valor_pago = %s, status = %s, 
                    data_pagamento = CASE WHEN %s = 'pago' THEN CURRENT_TIMESTAMP ELSE data_pagamento END,
                    pago_por = CASE WHEN %s = 'pago' THEN %s ELSE pago_por END
                WHERE id = %s
            """, (new_paid_value, new_status, new_status, new_status, user_id, installment_id))
            
            conn.commit()
            
            return APIResponse(
                success=True,
                data={
                    'payment_id': str(payment_id),
                    'installment_number': installment[1],
                    'amount_paid': float(amount_paid),
                    'new_status': new_status,
                    'remaining_value': float(installment[2] - new_paid_value)
                },
                message=f"Pagamento de R$ {amount_paid:.2f} registrado com sucesso"
            )
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao processar pagamento: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao processar pagamento: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()
    
    async def get_overdue_accounts(self, filters: Dict[str, Any] = None) -> APIResponse:
        """Buscar contas em atraso"""
        try:
            filters = filters or {}
            filters['overdue_only'] = True
            
            return await self.get_accounts_payable(filters)
            
        except Exception as e:
            logger.error(f"Erro ao buscar contas em atraso: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao buscar contas em atraso: {str(e)}"
            )
    
    async def get_payment_schedule(self, filters: Dict[str, Any] = None) -> APIResponse:
        """Buscar cronograma de pagamentos"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            where_conditions = ["cpp.status IN ('em_aberto', 'vencido', 'pago_parcial')"]
            params = []
            
            filters = filters or {}
            
            if filters.get('date_from'):
                where_conditions.append("cpp.data_vencimento >= %s")
                params.append(filters['date_from'])
            
            if filters.get('date_to'):
                where_conditions.append("cpp.data_vencimento <= %s")
                params.append(filters['date_to'])
            
            if filters.get('supplier_id'):
                where_conditions.append("cp.pessoa_id = %s")
                params.append(filters['supplier_id'])
            
            where_clause = "WHERE " + " AND ".join(where_conditions)
            
            query = f"""
                SELECT 
                    cpp.id, cpp.numero_parcela, cpp.data_vencimento, cpp.valor_final,
                    cpp.valor_pago, cpp.status, cpp.dias_atraso,
                    cp.numero_conta, cp.descricao,
                    c.name as supplier_name,
                    CASE WHEN cpp.data_vencimento < CURRENT_DATE THEN 'overdue'
                         WHEN cpp.data_vencimento = CURRENT_DATE THEN 'due_today'
                         WHEN cpp.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_this_week'
                         ELSE 'future'
                    END as urgency
                FROM contas_pagar_parcelas cpp
                JOIN contas_pagar cp ON cpp.conta_pagar_id = cp.id
                JOIN contacts c ON cp.supplier_id = c.id
                {where_clause}
                ORDER BY cpp.data_vencimento ASC, c.name
                LIMIT %s OFFSET %s
            """
            
            limit = min(filters.get('limit', 200), 500)
            offset = filters.get('offset', 0)
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            schedule = cursor.fetchall()
            
            result = []
            total_to_pay = Decimal('0')
            total_overdue = Decimal('0')
            
            for item in schedule:
                balance = item[3] - item[4]  # valor_final - valor_pago
                total_to_pay += balance
                
                if item[10] == 'overdue':
                    total_overdue += balance
                
                result.append({
                    'installment_id': str(item[0]),
                    'installment_number': item[1],
                    'due_date': item[2].isoformat() if item[2] else None,
                    'amount': float(item[3]) if item[3] else 0,
                    'paid_amount': float(item[4]) if item[4] else 0,
                    'balance': float(balance),
                    'status': item[5],
                    'days_overdue': item[6],
                    'account_number': item[7],
                    'description': item[8],
                    'supplier_name': item[9],
                    'urgency': item[10]
                })
            
            return APIResponse(
                success=True,
                data={
                    'schedule': result,
                    'summary': {
                        'total_installments': len(result),
                        'total_to_pay': float(total_to_pay),
                        'total_overdue': float(total_overdue),
                        'overdue_count': len([x for x in result if x['urgency'] == 'overdue'])
                    }
                },
                message=f"Cronograma com {len(result)} parcelas"
            )
            
        except Exception as e:
            logger.error(f"Erro ao buscar cronograma: {e}")
            return APIResponse(
                success=False,
                message=f"Erro ao buscar cronograma: {str(e)}"
            )
        finally:
            cursor.close()
            conn.close()