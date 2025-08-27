from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.sale_order import SaleOrder, SaleOrderStatus
from app.models.client import Client
from app.models.product import Product
from app.schemas.sale_order import (
    SaleOrderCreate, 
    SaleOrderUpdate, 
    SaleOrderStatusUpdate,
    SaleOrder as SaleOrderSchema,
    SaleOrderSummary,
    SaleOrderResponse,
    SaleOrderStats
)
from app.services.sale_order_service import SaleOrderService

router = APIRouter()


@router.get("/", response_model=List[dict])
def get_sale_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[SaleOrderStatus] = Query(None),
    client_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista pedidos de venda com paginação e filtros"""
    
    service = SaleOrderService(db)
    orders = service.get_orders(
        skip=skip,
        limit=limit,
        status=status,
        client_id=client_id,
        search=search
    )
    
    # Converter para formato JSON com dados do cliente e contagem de itens
    result = []
    for order in orders:
        client = db.query(Client).filter(Client.id == order.client_id).first()
        items_count = len(order.items)
        
        result.append({
            "id": str(order.id),
            "number": order.number,
            "order_date": order.order_date.isoformat(),
            "status": order.status.value,
            "client_id": str(order.client_id),
            "client_name": client.name if client else "Cliente não encontrado",
            "client_document": client.document if client else "",
            "total_amount": float(order.total_amount),
            "items_count": items_count,
            "payment_method": order.payment_method.value,
            "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
            "seller_name": order.seller_name,
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat()
        })
    
    return result


@router.post("/")
def create_sale_order(
    order_data: SaleOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria novo pedido de venda"""
    
    try:
        service = SaleOrderService(db)
        order = service.create_order(order_data)
        
        # Buscar dados completos para retorno
        client = db.query(Client).filter(Client.id == order.client_id).first()
        
        # Itens com dados dos produtos
        items_data = []
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            items_data.append({
                "id": str(item.id),
                "product_id": str(item.product_id),
                "product_name": product.name if product else "Produto não encontrado",
                "product_sku": product.sku if product else "",
                "product_unit": product.unit if product else "UN",
                "quantity": float(item.quantity),
                "unit_price": float(item.unit_price),
                "discount_percent": float(item.discount_percent),
                "discount_amount": float(item.discount_amount),
                "gross_total": float(item.gross_total),
                "net_total": float(item.net_total),
                "icms_rate": float(item.icms_rate),
                "pis_rate": float(item.pis_rate),
                "cofins_rate": float(item.cofins_rate),
                "icms_amount": float(item.icms_amount),
                "pis_amount": float(item.pis_amount),
                "cofins_amount": float(item.cofins_amount)
            })
        
        return {
            "id": str(order.id),
            "number": order.number,
            "order_date": order.order_date.isoformat(),
            "status": order.status.value,
            "client_id": str(order.client_id),
            "client_name": client.name if client else "",
            "client_document": client.document if client else "",
            "payment_method": order.payment_method.value,
            "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
            "subtotal": float(order.subtotal),
            "discount_percent": float(order.discount_percent),
            "discount_amount": float(order.discount_amount),
            "icms_total": float(order.icms_total),
            "pis_total": float(order.pis_total),
            "cofins_total": float(order.cofins_total),
            "tax_total": float(order.tax_total),
            "total_amount": float(order.total_amount),
            "notes": order.notes,
            "internal_notes": order.internal_notes,
            "delivery_address": order.delivery_address,
            "seller_name": order.seller_name,
            "items": items_data,
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{order_id}")
def get_sale_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Busca pedido de venda por ID"""
    
    service = SaleOrderService(db)
    order = service.get_order(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    # Buscar dados completos
    client = db.query(Client).filter(Client.id == order.client_id).first()
    
    # Itens com dados dos produtos
    items_data = []
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items_data.append({
            "id": str(item.id),
            "product_id": str(item.product_id),
            "product_name": product.name if product else "Produto não encontrado",
            "product_sku": product.sku if product else "",
            "product_unit": product.unit if product else "UN",
            "quantity": float(item.quantity),
            "unit_price": float(item.unit_price),
            "discount_percent": float(item.discount_percent),
            "discount_amount": float(item.discount_amount),
            "gross_total": float(item.gross_total),
            "net_total": float(item.net_total),
            "icms_rate": float(item.icms_rate),
            "pis_rate": float(item.pis_rate),
            "cofins_rate": float(item.cofins_rate),
            "icms_amount": float(item.icms_amount),
            "pis_amount": float(item.pis_amount),
            "cofins_amount": float(item.cofins_amount),
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat()
        })
    
    return {
        "id": str(order.id),
        "number": order.number,
        "order_date": order.order_date.isoformat(),
        "status": order.status.value,
        "client_id": str(order.client_id),
        "client_name": client.name if client else "",
        "client_document": client.document if client else "",
        "payment_method": order.payment_method.value,
        "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
        "subtotal": float(order.subtotal),
        "discount_percent": float(order.discount_percent),
        "discount_amount": float(order.discount_amount),
        "icms_total": float(order.icms_total),
        "pis_total": float(order.pis_total),
        "cofins_total": float(order.cofins_total),
        "tax_total": float(order.tax_total),
        "total_amount": float(order.total_amount),
        "notes": order.notes,
        "internal_notes": order.internal_notes,
        "delivery_address": order.delivery_address,
        "seller_name": order.seller_name,
        "items": items_data,
        "is_active": order.is_active,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat()
    }


@router.put("/{order_id}")
def update_sale_order(
    order_id: str,
    order_data: SaleOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza pedido de venda (apenas rascunhos)"""
    
    try:
        service = SaleOrderService(db)
        order = service.update_order(order_id, order_data)
        
        # Retornar dados atualizados (mesmo formato do get)
        client = db.query(Client).filter(Client.id == order.client_id).first()
        
        items_data = []
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            items_data.append({
                "id": str(item.id),
                "product_id": str(item.product_id),
                "product_name": product.name if product else "Produto não encontrado",
                "product_sku": product.sku if product else "",
                "product_unit": product.unit if product else "UN",
                "quantity": float(item.quantity),
                "unit_price": float(item.unit_price),
                "discount_percent": float(item.discount_percent),
                "discount_amount": float(item.discount_amount),
                "gross_total": float(item.gross_total),
                "net_total": float(item.net_total),
                "icms_rate": float(item.icms_rate),
                "pis_rate": float(item.pis_rate),
                "cofins_rate": float(item.cofins_rate),
                "icms_amount": float(item.icms_amount),
                "pis_amount": float(item.pis_amount),
                "cofins_amount": float(item.cofins_amount)
            })
        
        return {
            "id": str(order.id),
            "number": order.number,
            "order_date": order.order_date.isoformat(),
            "status": order.status.value,
            "client_id": str(order.client_id),
            "client_name": client.name if client else "",
            "client_document": client.document if client else "",
            "payment_method": order.payment_method.value,
            "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
            "subtotal": float(order.subtotal),
            "discount_percent": float(order.discount_percent),
            "discount_amount": float(order.discount_amount),
            "icms_total": float(order.icms_total),
            "pis_total": float(order.pis_total),
            "cofins_total": float(order.cofins_total),
            "tax_total": float(order.tax_total),
            "total_amount": float(order.total_amount),
            "notes": order.notes,
            "internal_notes": order.internal_notes,
            "delivery_address": order.delivery_address,
            "seller_name": order.seller_name,
            "items": items_data,
            "updated_at": order.updated_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{order_id}/status")
def update_order_status(
    order_id: str,
    status_data: SaleOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza status do pedido"""
    
    try:
        service = SaleOrderService(db)
        order = service.update_order_status(order_id, status_data)
        
        return {
            "id": str(order.id),
            "number": order.number,
            "status": order.status.value,
            "updated_at": order.updated_at.isoformat(),
            "message": f"Status alterado para {order.status.value}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{order_id}")
def delete_sale_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove pedido de venda (soft delete, apenas rascunhos)"""
    
    try:
        service = SaleOrderService(db)
        success = service.delete_order(order_id)
        
        if success:
            return {"message": "Pedido removido com sucesso"}
        else:
            raise HTTPException(status_code=400, detail="Erro ao remover pedido")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats/summary")
def get_sale_orders_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna estatísticas dos pedidos de venda"""
    
    service = SaleOrderService(db)
    stats = service.get_order_stats()
    
    return {
        "total_orders": stats['total_orders'],
        "total_value": float(stats['total_value']),
        "orders_by_status": stats['orders_by_status'],
        "avg_order_value": float(stats['avg_order_value']),
        "orders_this_month": stats['orders_this_month'],
        "value_this_month": float(stats['value_this_month'])
    }


# Endpoint adicional para simulação de impostos (útil para preview)
@router.post("/tax-simulation")
def simulate_taxes(
    simulation_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Simula cálculo de impostos para um produto"""
    
    from app.services.tax_calculator import TaxCalculatorService
    from decimal import Decimal
    
    try:
        product = db.query(Product).filter(Product.id == simulation_data['product_id']).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        client = None
        if simulation_data.get('client_id'):
            client = db.query(Client).filter(Client.id == simulation_data['client_id']).first()
        
        tax_calculator = TaxCalculatorService()
        simulation = tax_calculator.get_tax_simulation(
            product=product,
            quantity=Decimal(str(simulation_data['quantity'])),
            unit_price=Decimal(str(simulation_data['unit_price'])),
            client=client
        )
        
        # Converter Decimals para float para JSON
        return {
            "gross_amount": float(simulation['gross_amount']),
            "taxes": {
                "icms": {
                    "rate": float(simulation['taxes']['icms']['rate']),
                    "amount": float(simulation['taxes']['icms']['amount'])
                },
                "pis": {
                    "rate": float(simulation['taxes']['pis']['rate']),
                    "amount": float(simulation['taxes']['pis']['amount'])
                },
                "cofins": {
                    "rate": float(simulation['taxes']['cofins']['rate']),
                    "amount": float(simulation['taxes']['cofins']['amount'])
                }
            },
            "total_taxes": float(simulation['total_taxes']),
            "net_amount": float(simulation['net_amount']),
            "effective_tax_rate": float(simulation['effective_tax_rate'])
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))