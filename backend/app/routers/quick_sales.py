from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
import uuid
from pydantic import BaseModel

from app.core.database import get_db
from app.models.sale_order import SaleOrder, SaleOrderItem, SaleOrderStatus, PaymentMethod
from app.models.product import Product
from app.models.client import Client
from app.services.tax_calculator import TaxCalculatorService

router = APIRouter(prefix="/sales", tags=["Vendas Rápidas"])

class QuickSaleItem(BaseModel):
    id: str
    name: str
    barcode: str
    price: float
    stock: int
    quantity: int

class QuickSaleCustomer(BaseModel):
    id: Optional[str] = None
    name: str
    document: str
    phone: Optional[str] = None

class QuickSaleRequest(BaseModel):
    customer: Optional[QuickSaleCustomer] = None
    items: List[QuickSaleItem]
    subtotal: float
    discount: float
    total: float

@router.post("/quick-sale")
async def process_quick_sale(
    request: QuickSaleRequest,
    db: Session = Depends(get_db)
):
    """Processa uma venda rápida através do leitor de código de barras"""
    
    if not request.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Carrinho vazio"
        )
    
    try:
        # Gera número do pedido (temporário - sem salvar no banco)
        order_number = f"VR{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"
        
        # Cria o pedido de venda
        sale_order = SaleOrder(
            order_number=order_number,
            client_id=request.customer.id if request.customer and request.customer.id else None,
            order_date=datetime.now(),
            status=SaleOrderStatus.CONFIRMED,  # Venda rápida já é confirmada
            payment_method=PaymentMethod.CASH,  # Padrão, será atualizado no pagamento
            subtotal=Decimal(str(request.subtotal)),
            discount_amount=Decimal(str(request.discount)),
            total_amount=Decimal(str(request.total)),
            seller_name="Sistema",
            is_active=True
        )
        
        db.add(sale_order)
        db.flush()  # Para obter o ID do pedido
        
        # Calcula impostos
        tax_calculator = TaxCalculatorService()
        
        # Adiciona itens do pedido
        total_icms = Decimal(0)
        total_pis = Decimal(0)
        total_cofins = Decimal(0)
        
        for item_data in request.items:
            # Busca o produto no banco apenas se o ID for um UUID válido
            product = None
            product_id_for_db = None
            
            try:
                # Verifica se o ID é um UUID válido
                product_uuid = uuid.UUID(item_data.id)
                product = db.query(Product).filter(
                    Product.id == product_uuid,
                    Product.is_active == True
                ).first()
                
                if product:
                    product_id_for_db = product.id
                    
            except ValueError:
                # ID não é UUID válido - produto de teste
                pass
            
            # Criar objeto produto para cálculos (não necessariamente no banco)
            if product:
                product_for_calculation = product
            else:
                # Produto mock para cálculos apenas
                product_for_calculation = type('Product', (), {
                    'id': str(uuid.uuid4()),
                    'name': item_data.name,
                    'sale_price': Decimal(str(item_data.price)),
                    'stock_quantity': item_data.stock,
                    'icms_rate': Decimal('18.0'),
                    'pis_rate': Decimal('1.65'),
                    'cofins_rate': Decimal('7.6')
                })()
            
            # Verifica estoque (apenas para produtos reais)
            if product and product.stock_quantity < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Estoque insuficiente para {product.name}. Disponível: {product.stock_quantity}"
                )
            
            # Calcula impostos do item
            tax_calc = tax_calculator.calculate_item_taxes(
                product=product_for_calculation,
                quantity=Decimal(str(item_data.quantity)),
                unit_price=Decimal(str(item_data.price)),
                discount_amount=Decimal('0'),  # Sem desconto por item na venda rápida
                client=None  # Cliente opcional
            )
            
            # Cria item do pedido
            order_item = SaleOrderItem(
                sale_order_id=sale_order.id,
                product_id=product_id_for_db,  # NULL para produtos de teste, UUID válido para reais
                quantity=Decimal(str(item_data.quantity)),
                unit_price=Decimal(str(item_data.price)),
                total_price=Decimal(str(item_data.price * item_data.quantity)),
                tax_rate=Decimal(str(tax_calc.icms_rate + tax_calc.pis_rate + tax_calc.cofins_rate)),
                tax_amount=Decimal(str(tax_calc.icms_amount + tax_calc.pis_amount + tax_calc.cofins_amount)),
                gross_total=Decimal(str(item_data.price * item_data.quantity)),
                net_total=Decimal(str(item_data.price * item_data.quantity)),  # Sem desconto por item na venda rápida
                icms_rate=tax_calc.icms_rate,
                pis_rate=tax_calc.pis_rate,
                cofins_rate=tax_calc.cofins_rate,
                icms_amount=tax_calc.icms_amount,
                pis_amount=tax_calc.pis_amount,
                cofins_amount=tax_calc.cofins_amount
            )
            
            db.add(order_item)
            
            # Acumula totais de impostos
            total_icms += tax_calc.icms_amount
            total_pis += tax_calc.pis_amount
            total_cofins += tax_calc.cofins_amount
            
            # Atualiza estoque (apenas para produtos reais)
            if product and hasattr(product, 'stock_quantity'):
                product.stock_quantity -= item_data.quantity
        
        # Atualiza totais de impostos no pedido
        sale_order.icms_total = total_icms
        sale_order.pis_total = total_pis
        sale_order.cofins_total = total_cofins
        sale_order.tax_total = total_icms + total_pis + total_cofins
        
        # Salva todas as alterações
        db.commit()
        
        return {
            "success": True,
            "message": "Venda processada com sucesso",
            "data": {
                "sale_id": str(sale_order.id),
                "order_number": order_number,  # Usar variável local
                "total_amount": float(sale_order.total_amount),
                "tax_total": float(sale_order.tax_total),
                "items_count": len(request.items),
                "customer": {
                    "name": request.customer.name if request.customer else None,
                    "document": request.customer.document if request.customer else None
                } if request.customer else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao processar venda: {str(e)}"
        )

@router.get("/recent")
async def get_recent_sales(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Lista vendas recentes para acompanhamento"""
    
    recent_sales = db.query(SaleOrder)\
        .filter(SaleOrder.is_active == True)\
        .order_by(SaleOrder.created_at.desc())\
        .limit(limit)\
        .all()
    
    sales_data = []
    for sale in recent_sales:
        item_count = len(sale.items) if hasattr(sale, 'items') else 0
        # Gerar número temporário baseado no ID e data
        temp_number = f"VR{sale.created_at.strftime('%Y%m%d')}{str(sale.id)[:6].upper()}"
        
        sales_data.append({
            "id": str(sale.id),
            "number": temp_number,  # Número temporário
            "total_amount": float(sale.total_amount),
            "status": sale.status.value,
            "created_at": sale.created_at.isoformat(),
            "seller_name": sale.seller_name,
            "items_count": item_count,
            "customer_name": sale.client.name if hasattr(sale, 'client') and sale.client else "Cliente Avulso"
        })
    
    return {
        "success": True,
        "data": sales_data
    }

@router.patch("/{sale_id}/cancel")
async def cancel_quick_sale(
    sale_id: str,
    db: Session = Depends(get_db)
):
    """Cancela uma venda rápida e estorna produtos ao estoque"""
    
    try:
        # Buscar venda
        sale_order = db.query(SaleOrder).filter(
            SaleOrder.id == sale_id,
            SaleOrder.is_active == True
        ).first()
        
        if not sale_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Venda não encontrada"
            )
        
        # Verificar se pode ser cancelada
        if sale_order.status == SaleOrderStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Venda já está cancelada"
            )
        
        # Estornar produtos ao estoque
        for item in sale_order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                # Devolver quantidade ao estoque
                product.stock_quantity += item.quantity
        
        # Marcar como cancelada
        sale_order.status = SaleOrderStatus.CANCELLED
        
        # Salvar alterações
        db.commit()
        
        # Gerar número temporário para resposta
        temp_number = f"VR{sale_order.created_at.strftime('%Y%m%d')}{str(sale_order.id)[:6].upper()}"
        
        return {
            "success": True,
            "message": "Venda cancelada com sucesso",
            "data": {
                "sale_id": str(sale_order.id),
                "order_number": temp_number,
                "status": sale_order.status.value,
                "cancelled_at": datetime.now().isoformat(),
                "items_returned_to_stock": len(sale_order.items)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao cancelar venda: {str(e)}"
        )

@router.get("/stats/today")
async def get_daily_sales_stats(
    db: Session = Depends(get_db)
):
    """Estatísticas de vendas do dia atual"""
    
    from sqlalchemy import func, and_
    today = datetime.now().date()
    
    # Query para vendas do dia
    daily_sales = db.query(
        func.count(SaleOrder.id).label('count'),
        func.sum(SaleOrder.total_amount).label('total')
    ).filter(
        and_(
            func.date(SaleOrder.created_at) == today,
            SaleOrder.is_active == True,
            SaleOrder.status != SaleOrderStatus.CANCELLED
        )
    ).first()
    
    # Query para itens mais vendidos do dia
    top_products = db.query(
        Product.name,
        func.sum(SaleOrderItem.quantity).label('quantity_sold')
    ).join(
        SaleOrderItem, Product.id == SaleOrderItem.product_id
    ).join(
        SaleOrder, SaleOrderItem.sale_order_id == SaleOrder.id
    ).filter(
        and_(
            func.date(SaleOrder.created_at) == today,
            SaleOrder.is_active == True,
            SaleOrder.status != SaleOrderStatus.CANCELLED
        )
    ).group_by(Product.name)\
    .order_by(func.sum(SaleOrderItem.quantity).desc())\
    .limit(5)\
    .all()
    
    return {
        "success": True,
        "data": {
            "today": today.isoformat(),
            "sales_count": daily_sales.count or 0,
            "sales_total": float(daily_sales.total) if daily_sales.total else 0,
            "top_products": [
                {
                    "name": product.name,
                    "quantity_sold": float(product.quantity_sold)
                }
                for product in top_products
            ]
        }
    }