from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.models.user import User
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Pagamentos"])

class PixPaymentRequest(BaseModel):
    amount: float
    customer_data: Dict[str, Any]

class CardPaymentRequest(BaseModel):
    amount: float
    card_data: Dict[str, Any]
    installments: int = 1

class BoletoPaymentRequest(BaseModel):
    amount: float
    customer_data: Dict[str, Any]

class RefundRequest(BaseModel):
    amount: Optional[float] = None

@router.get("/methods")
async def get_payment_methods(
    current_user: User = Depends(get_current_user)
):
    """Retorna métodos de pagamento disponíveis"""
    
    payment_service = PaymentService()
    methods = payment_service.get_payment_methods()
    
    return {
        "success": True,
        "data": methods
    }

@router.post("/pix")
async def process_pix_payment(
    request: PixPaymentRequest,
    current_user: User = Depends(get_current_user)
):
    """Processa pagamento via PIX"""
    
    if request.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor deve ser maior que zero"
        )
    
    try:
        payment_service = PaymentService()
        result = payment_service.process_pix_payment(
            Decimal(str(request.amount)), 
            request.customer_data
        )
        
        return {
            "success": True,
            "message": "PIX gerado com sucesso",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar PIX: {str(e)}"
        )

@router.post("/card")
async def process_card_payment(
    request: CardPaymentRequest,
    current_user: User = Depends(get_current_user)
):
    """Processa pagamento com cartão"""
    
    if request.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor deve ser maior que zero"
        )
    
    if request.installments < 1 or request.installments > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Número de parcelas deve ser entre 1 e 12"
        )
    
    try:
        payment_service = PaymentService()
        result = payment_service.process_card_payment(
            Decimal(str(request.amount)),
            request.card_data,
            request.installments
        )
        
        return {
            "success": True,
            "message": "Pagamento processado",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar pagamento: {str(e)}"
        )

@router.post("/boleto")
async def process_boleto_payment(
    request: BoletoPaymentRequest,
    current_user: User = Depends(get_current_user)
):
    """Processa pagamento via boleto"""
    
    if request.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor deve ser maior que zero"
        )
    
    try:
        payment_service = PaymentService()
        result = payment_service.process_boleto_payment(
            Decimal(str(request.amount)),
            request.customer_data
        )
        
        return {
            "success": True,
            "message": "Boleto gerado com sucesso",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar boleto: {str(e)}"
        )

@router.get("/{payment_id}/status")
async def check_payment_status(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Consulta status de um pagamento"""
    
    try:
        payment_service = PaymentService()
        result = payment_service.check_payment_status(payment_id)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao consultar pagamento: {str(e)}"
        )

@router.post("/{payment_id}/cancel")
async def cancel_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancela um pagamento"""
    
    try:
        payment_service = PaymentService()
        result = payment_service.cancel_payment(payment_id)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "message": "Pagamento cancelado",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao cancelar pagamento: {str(e)}"
        )

@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    request: RefundRequest,
    current_user: User = Depends(get_current_user)
):
    """Processa estorno de pagamento"""
    
    try:
        payment_service = PaymentService()
        amount = Decimal(str(request.amount)) if request.amount else None
        result = payment_service.refund_payment(payment_id, amount)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "message": "Estorno processado",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar estorno: {str(e)}"
        )