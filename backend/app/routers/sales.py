from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.client import Client
from app.models.product import Product
from pydantic import BaseModel
import uuid

router = APIRouter()


class SaleItemCreate(BaseModel):
    product_id: str
    quantity: int
    unit_price: float


class SaleCreate(BaseModel):
    client_id: Optional[str] = None
    items: List[SaleItemCreate]
    notes: Optional[str] = None
    discount: Optional[float] = 0


class QuickSaleData(BaseModel):
    customer: Optional[dict] = None
    items: List[dict]
    subtotal: float
    discount: float
    total: float


class CompleteSaleItemCreate(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    icms_amount: float = 0
    pis_amount: float = 0
    cofins_amount: float = 0


class PaymentCreate(BaseModel):
    method: str  # cash, pix, debit_card, credit_card
    amount: float
    installments: int = 1
    authorization_code: Optional[str] = None
    transaction_id: Optional[str] = None
    card_brand: Optional[str] = None
    card_last_digits: Optional[str] = None


class CompleteSaleCreate(BaseModel):
    client_id: Optional[str] = None
    items: List[CompleteSaleItemCreate]
    discount_type: str = "percentage"  # percentage, value
    discount_value: float = 0
    shipping_cost: float = 0
    payment_terms: str = "cash"
    delivery_date: Optional[str] = None
    notes: Optional[str] = None
    payment: PaymentCreate


@router.get("/")
def get_sales(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Sale).order_by(desc(Sale.created_at))
    
    if status:
        query = query.filter(Sale.status == status)
    
    sales = query.offset(skip).limit(limit).all()
    
    return {
        "sales": [{
            "id": str(sale.id),
            "number": sale.number,
            "client_name": sale.client.name if sale.client else "Cliente Avulso",
            "sale_date": sale.sale_date.isoformat(),
            "status": sale.status,
            "total": float(sale.total),
            "items_count": len(sale.items)
        } for sale in sales],
        "total": db.query(Sale).count()
    }


@router.post("/")
def create_sale(
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "vendas"))
):
    try:
        # Validar cliente se fornecido
        client = None
        if sale_data.client_id:
            client = db.query(Client).filter(Client.id == sale_data.client_id).first()
            if not client:
                raise HTTPException(status_code=404, detail="Cliente não encontrado")

        # Gerar número da venda
        sale_count = db.query(Sale).count()
        sale_number = f"VND{sale_count + 1:06d}"

        # Criar venda
        sale = Sale(
            number=sale_number,
            client_id=sale_data.client_id,
            sale_date=datetime.utcnow(),
            status=SaleStatus.DRAFT,
            notes=sale_data.notes,
            user_id=current_user.id
        )
        
        db.add(sale)
        db.flush()  # Para obter o ID da venda

        # Adicionar itens
        subtotal = 0
        for item_data in sale_data.items:
            # Validar produto
            product = db.query(Product).filter(Product.id == item_data.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Produto {item_data.product_id} não encontrado")
            
            # Verificar estoque
            if product.stock_quantity < item_data.quantity:
                raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {product.name}")
            
            item_subtotal = item_data.quantity * item_data.unit_price
            
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                subtotal=item_subtotal
            )
            
            db.add(sale_item)
            subtotal += item_subtotal

        # Atualizar totais da venda
        discount_amount = sale_data.discount or 0
        sale.subtotal = subtotal
        sale.tax_total = 0  # Calcular impostos futuramente
        sale.total = subtotal - discount_amount

        db.commit()
        db.refresh(sale)

        return {
            "success": True,
            "data": {
                "sale_id": str(sale.id),
                "order_number": sale.number,
                "total": float(sale.total)
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sale_id}")
def get_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")

    return {
        "id": str(sale.id),
        "number": sale.number,
        "client": {
            "id": str(sale.client.id),
            "name": sale.client.name,
            "document": sale.client.document
        } if sale.client else None,
        "sale_date": sale.sale_date.isoformat(),
        "status": sale.status,
        "subtotal": float(sale.subtotal),
        "tax_total": float(sale.tax_total),
        "total": float(sale.total),
        "notes": sale.notes,
        "items": [{
            "id": str(item.id),
            "product": {
                "id": str(item.product.id),
                "name": item.product.name,
                "barcode": item.product.barcode
            },
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "subtotal": float(item.subtotal)
        } for item in sale.items]
    }


@router.put("/{sale_id}")
def update_sale(
    sale_id: str,
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "vendas"))
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if sale.status != SaleStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Apenas vendas em rascunho podem ser editadas")

    try:
        # Remover itens existentes
        db.query(SaleItem).filter(SaleItem.sale_id == sale.id).delete()
        
        # Atualizar dados da venda
        if sale_data.client_id:
            client = db.query(Client).filter(Client.id == sale_data.client_id).first()
            if not client:
                raise HTTPException(status_code=404, detail="Cliente não encontrado")
            sale.client_id = sale_data.client_id
        
        sale.notes = sale_data.notes

        # Adicionar novos itens
        subtotal = 0
        for item_data in sale_data.items:
            product = db.query(Product).filter(Product.id == item_data.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Produto {item_data.product_id} não encontrado")
            
            item_subtotal = item_data.quantity * item_data.unit_price
            
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                subtotal=item_subtotal
            )
            
            db.add(sale_item)
            subtotal += item_subtotal

        # Atualizar totais
        discount_amount = sale_data.discount or 0
        sale.subtotal = subtotal
        sale.total = subtotal - discount_amount

        db.commit()
        db.refresh(sale)

        return {"message": "Venda atualizada com sucesso", "sale_id": str(sale.id)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sale_id}/confirm")
def confirm_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "vendas"))
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if sale.status != SaleStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Venda já foi confirmada")

    try:
        # Baixar estoque
        for item in sale.items:
            product = item.product
            if product.stock_quantity < item.quantity:
                raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {product.name}")
            
            product.stock_quantity -= item.quantity

        sale.status = SaleStatus.CONFIRMED
        db.commit()

        return {"message": "Venda confirmada e estoque baixado", "sale_id": str(sale.id)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sale_id}/invoice")
def generate_invoice(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "vendas"))
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if sale.status != SaleStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Venda deve estar confirmada para gerar NF-e")

    # Mock da geração de NF-e
    sale.status = SaleStatus.INVOICED
    db.commit()

    return {
        "message": "NF-e gerada com sucesso",
        "nfe_number": f"NFE{sale.number}",
        "sale_id": str(sale.id)
    }


@router.post("/complete-sale")
def create_complete_sale(
    sale_data: CompleteSaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Criar uma venda completa com todos os detalhes"""
    try:
        # Validar cliente se fornecido
        client = None
        if sale_data.client_id:
            client = db.query(Client).filter(Client.id == sale_data.client_id).first()
            if not client:
                raise HTTPException(status_code=404, detail="Cliente não encontrado")

        # Gerar número da venda
        sale_count = db.query(Sale).count()
        sale_number = f"VND{sale_count + 1:06d}"

        # Calcular valores
        subtotal = sum(item.quantity * item.unit_price for item in sale_data.items)
        tax_total = sum(item.icms_amount + item.pis_amount + item.cofins_amount for item in sale_data.items)
        
        # Calcular desconto
        if sale_data.discount_type == "percentage":
            discount_amount = (subtotal * sale_data.discount_value) / 100
        else:
            discount_amount = sale_data.discount_value
        
        total = subtotal + sale_data.shipping_cost + tax_total - discount_amount

        # Criar venda
        sale = Sale(
            number=sale_number,
            client_id=sale_data.client_id,
            user_id=current_user.id,
            sale_date=datetime.utcnow(),
            status=SaleStatus.CONFIRMED,
            subtotal=subtotal,
            discount_type=sale_data.discount_type,
            discount_value=sale_data.discount_value,
            discount_amount=discount_amount,
            shipping_cost=sale_data.shipping_cost,
            tax_total=tax_total,
            total=total,
            payment_terms=sale_data.payment_terms,
            delivery_date=datetime.fromisoformat(sale_data.delivery_date) if sale_data.delivery_date else None,
            notes=sale_data.notes or ""
        )
        
        db.add(sale)
        db.flush()  # Para obter o ID da venda

        # Adicionar itens
        for item_data in sale_data.items:
            # Validar produto
            product = db.query(Product).filter(Product.id == item_data.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Produto {item_data.product_id} não encontrado")
            
            # Verificar estoque
            if product.stock_quantity < item_data.quantity:
                raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {product.name}")
            
            # Criar item da venda
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                subtotal=item_data.quantity * item_data.unit_price,
                icms_amount=item_data.icms_amount,
                pis_amount=item_data.pis_amount,
                cofins_amount=item_data.cofins_amount
            )
            
            db.add(sale_item)
            
            # Baixar estoque
            product.stock_quantity -= item_data.quantity

        # Criar pagamento
        payment = Payment(
            sale_id=sale.id,
            method=sale_data.payment.method,
            status=PaymentStatus.APPROVED,
            amount=sale_data.payment.amount,
            fee_amount=0,  # Calcular taxa se necessário
            net_amount=sale_data.payment.amount,
            installments=sale_data.payment.installments,
            authorization_code=sale_data.payment.authorization_code,
            transaction_id=sale_data.payment.transaction_id,
            card_brand=sale_data.payment.card_brand,
            card_last_digits=sale_data.payment.card_last_digits,
            payment_date=datetime.utcnow()
        )
        
        db.add(payment)
        db.commit()
        db.refresh(sale)

        return {
            "success": True,
            "message": "Venda criada com sucesso",
            "data": {
                "sale_id": str(sale.id),
                "order_number": sale.number,
                "total_amount": float(sale.total),
                "payment_id": str(payment.id)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar venda: {str(e)}")


@router.post("/quick-sale")
def process_quick_sale(
    sale_data: QuickSaleData,
    db: Session = Depends(get_db)
):
    """Processa uma venda rápida usando a tabela sales"""
    try:
        # Buscar primeiro usuário disponível como fallback
        system_user = db.query(User).first()
        if not system_user:
            raise HTTPException(status_code=500, detail="Nenhum usuário encontrado no sistema")
        
        # Gerar número da venda
        sale_count = db.query(Sale).count()
        sale_number = f"QS{sale_count + 1:06d}"

        # Criar venda principal
        new_sale = Sale()
        new_sale.number = sale_number
        new_sale.client_id = None
        new_sale.user_id = system_user.id
        new_sale.status = "confirmed"  # Vendas rápidas são automaticamente confirmadas
        new_sale.subtotal = sale_data.subtotal
        new_sale.total = sale_data.total
        new_sale.notes = "Venda rápida - confirmada automaticamente"
        
        db.add(new_sale)
        db.flush()  # Para obter o ID

        # Adicionar itens apenas se existirem produtos reais
        for item in sale_data.items:
            try:
                product_uuid = uuid.UUID(item['id'])
                product = db.query(Product).filter(Product.id == product_uuid).first()
                
                if product:
                    sale_item = SaleItem(
                        sale_id=new_sale.id,
                        product_id=product.id,
                        quantity=item['quantity'],
                        unit_price=item['price'],
                        subtotal=item['price'] * item['quantity']
                    )
                    db.add(sale_item)
                    
                    # Atualizar estoque
                    if product.stock_quantity >= item['quantity']:
                        product.stock_quantity -= item['quantity']
                        
            except (ValueError, KeyError):
                # Produto de teste - pular
                continue

        db.commit()
        
        return {
            "success": True,
            "message": "Venda processada com sucesso",
            "data": {
                "sale_id": str(new_sale.id),
                "order_number": sale_number,
                "total_amount": float(new_sale.total)
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar venda: {str(e)}")


@router.post("/get-recent")
def get_recent_sales(
    request: Optional[dict] = None,
    db: Session = Depends(get_db)
):
    """Lista vendas recentes para acompanhamento"""
    
    try:
        limit = 10
        if request and "limit" in request:
            limit = request["limit"]
            
        recent_sales = db.query(Sale)\
            .order_by(Sale.created_at.desc())\
            .limit(limit)\
            .all()
        
        sales_data = []
        for sale in recent_sales:
            item_count = len(sale.items) if sale.items else 0
            
            sales_data.append({
                "id": str(sale.id),
                "number": sale.number,
                "total_amount": float(sale.total),
                "status": sale.status,
                "created_at": sale.created_at.isoformat(),
                "seller_name": sale.user.name if sale.user else "Sistema",
                "items_count": item_count,
                "customer_name": sale.client.name if sale.client else "Cliente Avulso"
            })
        
        return {
            "success": True,
            "data": sales_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": []
        }


@router.post("/stats/today")
def get_daily_sales_stats(
    db: Session = Depends(get_db)
):
    """Estatísticas de vendas do dia atual"""
    
    from sqlalchemy import func, and_
    today = datetime.utcnow().date()
    
    try:
        # Query para vendas do dia
        daily_sales = db.query(
            func.count(Sale.id).label('count'),
            func.sum(Sale.total).label('total')
        ).filter(
            and_(
                func.date(Sale.created_at) == today,
                Sale.status != 'cancelled'
            )
        ).first()
        
        # Query para itens mais vendidos do dia
        top_products = db.query(
            Product.name,
            func.sum(SaleItem.quantity).label('quantity_sold')
        ).join(
            SaleItem, Product.id == SaleItem.product_id
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).filter(
            and_(
                func.date(Sale.created_at) == today,
                Sale.status != 'cancelled'
            )
        ).group_by(Product.name)\
        .order_by(func.sum(SaleItem.quantity).desc())\
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
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": {
                "today": today.isoformat(),
                "sales_count": 0,
                "sales_total": 0,
                "top_products": []
            }
        }


@router.patch("/{sale_id}/cancel")
def cancel_sale(
    sale_id: str,
    db: Session = Depends(get_db)
):
    """Cancela uma venda e estorna produtos ao estoque"""
    
    try:
        # Buscar venda
        sale = db.query(Sale).filter(Sale.id == sale_id).first()
        
        if not sale:
            raise HTTPException(status_code=404, detail="Venda não encontrada")
        
        # Verificar se pode ser cancelada
        if sale.status == "cancelled":
            raise HTTPException(status_code=400, detail="Venda já está cancelada")
        
        # Estornar produtos ao estoque
        for item in sale.items:
            if item.product:
                # Devolver quantidade ao estoque
                item.product.stock_quantity += item.quantity
        
        # Marcar como cancelada
        sale.status = "cancelled"
        
        # Salvar alterações
        db.commit()
        
        return {
            "success": True,
            "message": "Venda cancelada com sucesso",
            "data": {
                "sale_id": str(sale.id),
                "order_number": sale.number,
                "status": sale.status,
                "cancelled_at": datetime.utcnow().isoformat(),
                "items_returned_to_stock": len(sale.items)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro interno ao cancelar venda: {str(e)}")


@router.post("/{sale_id}/payment")
def process_payment(
    sale_id: str,
    payment_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "vendas", "financeiro"))
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")

    # Mock do processamento de pagamento
    return {
        "message": "Pagamento processado com sucesso",
        "payment_id": str(uuid.uuid4()),
        "sale_id": str(sale.id),
        "amount": float(sale.total)
    }