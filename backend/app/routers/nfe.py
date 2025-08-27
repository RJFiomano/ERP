from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.sale_order import SaleOrder
from app.services.nfe_service import NFEService

router = APIRouter(prefix="/nfe", tags=["NF-e"])

class NFEGenerateRequest(BaseModel):
    sale_order_id: str
    customer_data: Dict[str, Any]

class NFECancelRequest(BaseModel):
    nfe_number: str
    reason: str

@router.post("/generate")
async def generate_nfe(
    request: NFEGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gera uma NF-e baseada em um pedido de venda"""
    
    # Busca o pedido de venda
    sale_order = db.query(SaleOrder).filter(
        SaleOrder.id == request.sale_order_id,
        SaleOrder.is_active == True
    ).first()
    
    if not sale_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido de venda não encontrado"
        )
    
    # Verifica se o pedido está confirmado
    if sale_order.status.value != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas pedidos confirmados podem gerar NF-e"
        )
    
    try:
        nfe_service = NFEService()
        nfe_data = nfe_service.generate_nfe(sale_order, request.customer_data)
        
        return {
            "success": True,
            "message": "NF-e gerada com sucesso",
            "data": nfe_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar NF-e: {str(e)}"
        )

@router.post("/cancel")
async def cancel_nfe(
    request: NFECancelRequest,
    current_user: User = Depends(get_current_user)
):
    """Cancela uma NF-e"""
    
    try:
        nfe_service = NFEService()
        result = nfe_service.cancel_nfe(request.nfe_number, request.reason)
        
        return {
            "success": True,
            "message": "NF-e cancelada com sucesso",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao cancelar NF-e: {str(e)}"
        )

@router.get("/status/{access_key}")
async def consult_nfe_status(
    access_key: str,
    current_user: User = Depends(get_current_user)
):
    """Consulta o status de uma NF-e na SEFAZ"""
    
    try:
        nfe_service = NFEService()
        result = nfe_service.consult_nfe_status(access_key)
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao consultar status da NF-e: {str(e)}"
        )