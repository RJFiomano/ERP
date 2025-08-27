"""
Rotas da API para módulo de contas a pagar
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.services.accounts_payable_service import AccountsPayableService
from app.schemas.response import APIResponse

router = APIRouter(prefix="/accounts-payable", tags=["Contas a Pagar"])

# ===== MODELS =====

class AccountPayableCreateModel(BaseModel):
    supplier_id: UUID
    stock_entry_id: Optional[UUID] = None
    purchase_order_id: Optional[UUID] = None
    document_type: Optional[str] = Field("nfe", pattern="^(nfe|nota_fiscal|recibo|fatura|boleto|contrato|outros)$")
    document_number: str
    document_series: Optional[str] = None
    document_key: Optional[str] = None
    document_value: float = Field(..., gt=0)
    issue_date: date
    due_date: date
    original_value: float = Field(..., gt=0)
    discount_value: Optional[float] = Field(0, ge=0)
    additional_value: Optional[float] = Field(0, ge=0)
    payment_method: Optional[str] = Field("boleto", pattern="^(dinheiro|transferencia|boleto|cheque|cartao|pix|debito_automatico)$")
    payment_terms: Optional[str] = None
    installments: Optional[int] = Field(1, ge=1)
    installment_interval: Optional[int] = Field(30, ge=1)
    description: str
    notes: Optional[str] = None
    account_category: Optional[str] = None
    cost_center: Optional[str] = None

class PaymentProcessModel(BaseModel):
    installment_id: UUID
    amount: float = Field(..., gt=0)
    payment_method: str = Field(..., pattern="^(dinheiro|transferencia|boleto|cheque|cartao|pix|debito_automatico)$")
    bank_code: Optional[str] = None
    document_number: Optional[str] = None
    notes: Optional[str] = None

# ===== CONTAS A PAGAR =====

@router.post("", response_model=APIResponse)
async def create_account_payable(
    account_data: AccountPayableCreateModel,
    current_user: dict = Depends(get_current_user)
):
    """Criar nova conta a pagar"""
    try:
        service = AccountsPayableService()
        user_id = UUID(current_user["user"]["id"])
        
        account_dict = {
            'supplier_id': str(account_data.supplier_id),
            'stock_entry_id': str(account_data.stock_entry_id) if account_data.stock_entry_id else None,
            'purchase_order_id': str(account_data.purchase_order_id) if account_data.purchase_order_id else None,
            'document_type': account_data.document_type,
            'document_number': account_data.document_number,
            'document_series': account_data.document_series,
            'document_key': account_data.document_key,
            'document_value': account_data.document_value,
            'issue_date': account_data.issue_date,
            'due_date': account_data.due_date,
            'original_value': account_data.original_value,
            'discount_value': account_data.discount_value,
            'additional_value': account_data.additional_value,
            'payment_method': account_data.payment_method,
            'payment_terms': account_data.payment_terms,
            'installments': account_data.installments,
            'installment_interval': account_data.installment_interval,
            'description': account_data.description,
            'notes': account_data.notes,
            'account_category': account_data.account_category,
            'cost_center': account_data.cost_center
        }
        
        return await service.create_account_payable(account_dict, user_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=APIResponse)
async def get_accounts_payable(
    supplier_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    due_date_from: Optional[date] = Query(None),
    due_date_to: Optional[date] = Query(None),
    overdue_only: bool = Query(False),
    category: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Buscar contas a pagar"""
    try:
        service = AccountsPayableService()
        
        filters = {
            'limit': limit,
            'offset': offset
        }
        
        if supplier_id:
            filters['supplier_id'] = str(supplier_id)
        if status:
            filters['status'] = status
        if due_date_from:
            filters['due_date_from'] = due_date_from
        if due_date_to:
            filters['due_date_to'] = due_date_to
        if overdue_only:
            filters['overdue_only'] = True
        if category:
            filters['category'] = category
        
        return await service.get_accounts_payable(filters)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{account_id}", response_model=APIResponse)
async def get_account_details(
    account_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Buscar detalhes completos de uma conta a pagar"""
    try:
        service = AccountsPayableService()
        return await service.get_account_details(account_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== PAGAMENTOS =====

@router.post("/payments", response_model=APIResponse)
async def process_payment(
    payment_data: PaymentProcessModel,
    current_user: dict = Depends(get_current_user)
):
    """Processar pagamento de parcela"""
    try:
        service = AccountsPayableService()
        user_id = UUID(current_user["user"]["id"])
        
        payment_dict = {
            'installment_id': str(payment_data.installment_id),
            'amount': payment_data.amount,
            'payment_method': payment_data.payment_method,
            'bank_code': payment_data.bank_code,
            'document_number': payment_data.document_number,
            'notes': payment_data.notes
        }
        
        return await service.process_payment(payment_dict, user_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== RELATÓRIOS =====

@router.get("/reports/overdue", response_model=APIResponse)
async def get_overdue_accounts(
    supplier_id: Optional[UUID] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Relatório de contas em atraso"""
    try:
        service = AccountsPayableService()
        
        filters = {
            'overdue_only': True,
            'limit': limit,
            'offset': offset
        }
        
        if supplier_id:
            filters['supplier_id'] = str(supplier_id)
        
        return await service.get_overdue_accounts(filters)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/payment-schedule", response_model=APIResponse)
async def get_payment_schedule(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    supplier_id: Optional[UUID] = Query(None),
    limit: int = Query(200, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Cronograma de pagamentos"""
    try:
        service = AccountsPayableService()
        
        filters = {
            'limit': limit,
            'offset': offset
        }
        
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        if supplier_id:
            filters['supplier_id'] = str(supplier_id)
        
        return await service.get_payment_schedule(filters)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/cash-flow", response_model=APIResponse)
async def get_cash_flow_projection(
    months_ahead: int = Query(3, ge=1, le=12),
    current_user: dict = Depends(get_current_user)
):
    """Projeção de fluxo de caixa baseado nas contas a pagar"""
    try:
        from datetime import datetime, timedelta
        from calendar import monthrange
        
        service = AccountsPayableService()
        
        # Calcular período
        today = date.today()
        end_date = today.replace(day=1)
        
        # Adicionar meses
        for _ in range(months_ahead):
            if end_date.month == 12:
                end_date = end_date.replace(year=end_date.year + 1, month=1)
            else:
                end_date = end_date.replace(month=end_date.month + 1)
        
        # Último dia do último mês
        last_day = monthrange(end_date.year, end_date.month)[1]
        end_date = end_date.replace(day=last_day)
        
        # Buscar cronograma
        schedule_response = await service.get_payment_schedule({
            'date_from': today,
            'date_to': end_date,
            'limit': 1000
        })
        
        if schedule_response.success:
            schedule = schedule_response.data['schedule']
            
            # Agrupar por mês
            monthly_flow = {}
            current_month = today.replace(day=1)
            
            for _ in range(months_ahead):
                month_key = current_month.strftime('%Y-%m')
                monthly_flow[month_key] = {
                    'month': current_month.strftime('%B %Y'),
                    'total_due': 0,
                    'overdue_count': 0,
                    'installments': []
                }
                
                # Próximo mês
                if current_month.month == 12:
                    current_month = current_month.replace(year=current_month.year + 1, month=1)
                else:
                    current_month = current_month.replace(month=current_month.month + 1)
            
            # Agrupar parcelas por mês
            for installment in schedule:
                due_date = datetime.fromisoformat(installment['due_date']).date()
                month_key = due_date.strftime('%Y-%m')
                
                if month_key in monthly_flow:
                    monthly_flow[month_key]['total_due'] += installment['balance']
                    if installment['urgency'] == 'overdue':
                        monthly_flow[month_key]['overdue_count'] += 1
                    monthly_flow[month_key]['installments'].append(installment)
            
            return APIResponse(
                success=True,
                data={
                    'period': {
                        'from': today.isoformat(),
                        'to': end_date.isoformat(),
                        'months': months_ahead
                    },
                    'monthly_flow': list(monthly_flow.values()),
                    'total_projection': sum(month['total_due'] for month in monthly_flow.values())
                },
                message=f"Projeção de fluxo de caixa para {months_ahead} meses"
            )
        
        return schedule_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/by-supplier", response_model=APIResponse)
async def get_accounts_by_supplier(
    current_user: dict = Depends(get_current_user)
):
    """Relatório de contas agrupadas por fornecedor"""
    try:
        service = AccountsPayableService()
        
        # Buscar todas as contas em aberto
        accounts_response = await service.get_accounts_payable({
            'status': 'em_aberto',
            'limit': 1000
        })
        
        if accounts_response.success:
            accounts = accounts_response.data
            
            # Agrupar por fornecedor
            suppliers_summary = {}
            
            for account in accounts:
                supplier_name = account['supplier']['name']
                
                if supplier_name not in suppliers_summary:
                    suppliers_summary[supplier_name] = {
                        'supplier_name': supplier_name,
                        'supplier_document': account['supplier']['document'],
                        'accounts_count': 0,
                        'total_balance': 0,
                        'overdue_balance': 0,
                        'oldest_due_date': None,
                        'accounts': []
                    }
                
                supplier = suppliers_summary[supplier_name]
                supplier['accounts_count'] += 1
                supplier['total_balance'] += account['values']['balance']
                
                if account['is_overdue']:
                    supplier['overdue_balance'] += account['values']['balance']
                
                # Data de vencimento mais antiga
                due_date = account['dates']['due_date']
                if not supplier['oldest_due_date'] or due_date < supplier['oldest_due_date']:
                    supplier['oldest_due_date'] = due_date
                
                supplier['accounts'].append(account)
            
            # Ordenar por maior saldo devedor
            suppliers_list = sorted(
                suppliers_summary.values(),
                key=lambda x: x['total_balance'],
                reverse=True
            )
            
            return APIResponse(
                success=True,
                data={
                    'suppliers_count': len(suppliers_list),
                    'total_accounts': len(accounts),
                    'total_balance': sum(s['total_balance'] for s in suppliers_list),
                    'total_overdue': sum(s['overdue_balance'] for s in suppliers_list),
                    'by_supplier': suppliers_list
                },
                message="Relatório por fornecedor"
            )
        
        return accounts_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/summary", response_model=APIResponse)
async def get_dashboard_summary(
    current_user: dict = Depends(get_current_user)
):
    """Dashboard resumo das contas a pagar"""
    try:
        service = AccountsPayableService()
        
        # Buscar dados básicos
        all_accounts = await service.get_accounts_payable({'limit': 1000})
        overdue_accounts = await service.get_overdue_accounts({'limit': 1000})
        
        # Cronograma dos próximos 30 dias
        today = date.today()
        schedule_30_days = await service.get_payment_schedule({
            'date_from': today,
            'date_to': today + timedelta(days=30),
            'limit': 1000
        })
        
        summary_data = {
            'total_accounts': 0,
            'total_balance': 0,
            'overdue_accounts': 0,
            'overdue_balance': 0,
            'due_this_month': 0,
            'due_this_month_balance': 0,
            'due_next_30_days': 0,
            'due_next_30_days_balance': 0
        }
        
        if all_accounts.success:
            accounts = all_accounts.data
            summary_data['total_accounts'] = len(accounts)
            summary_data['total_balance'] = sum(acc['values']['balance'] for acc in accounts)
        
        if overdue_accounts.success:
            overdue = overdue_accounts.data
            summary_data['overdue_accounts'] = len(overdue)
            summary_data['overdue_balance'] = sum(acc['values']['balance'] for acc in overdue)
        
        if schedule_30_days.success:
            schedule = schedule_30_days.data['schedule']
            summary_data['due_next_30_days'] = len(schedule)
            summary_data['due_next_30_days_balance'] = sum(inst['balance'] for inst in schedule)
            
            # Filtrar apenas deste mês
            this_month = today.strftime('%Y-%m')
            this_month_installments = [
                inst for inst in schedule 
                if inst['due_date'].startswith(this_month)
            ]
            summary_data['due_this_month'] = len(this_month_installments)
            summary_data['due_this_month_balance'] = sum(inst['balance'] for inst in this_month_installments)
        
        return APIResponse(
            success=True,
            data=summary_data,
            message="Dashboard das contas a pagar"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))