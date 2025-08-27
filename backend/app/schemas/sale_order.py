from pydantic import BaseModel, field_validator, computed_field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.sale_order import SaleOrderStatus, PaymentMethod


class SaleOrderItemBase(BaseModel):
    product_id: str
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Optional[Decimal] = Decimal('0')
    discount_amount: Optional[Decimal] = Decimal('0')


class SaleOrderItemCreate(SaleOrderItemBase):
    pass


class SaleOrderItemUpdate(BaseModel):
    product_id: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    discount_percent: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None


class SaleOrderItem(SaleOrderItemBase):
    id: str
    sale_order_id: str
    
    # Totais calculados
    gross_total: Decimal
    net_total: Decimal
    
    # Impostos
    icms_rate: Decimal
    pis_rate: Decimal
    cofins_rate: Decimal
    icms_amount: Decimal
    pis_amount: Decimal
    cofins_amount: Decimal
    
    # Dados do produto (para exibição)
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_unit: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SaleOrderBase(BaseModel):
    client_id: str
    delivery_date: Optional[datetime] = None
    payment_method: PaymentMethod = PaymentMethod.CASH
    discount_percent: Optional[Decimal] = Decimal('0')
    discount_amount: Optional[Decimal] = Decimal('0')
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    delivery_address: Optional[str] = None
    seller_name: Optional[str] = None


class SaleOrderCreate(SaleOrderBase):
    items: List[SaleOrderItemCreate]
    
    @field_validator('items')
    def validate_items(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Pedido deve ter pelo menos um item')
        return v


class SaleOrderUpdate(BaseModel):
    client_id: Optional[str] = None
    delivery_date: Optional[datetime] = None
    payment_method: Optional[PaymentMethod] = None
    discount_percent: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    delivery_address: Optional[str] = None
    seller_name: Optional[str] = None
    items: Optional[List[SaleOrderItemCreate]] = None


class SaleOrderStatusUpdate(BaseModel):
    status: SaleOrderStatus


class TaxCalculation(BaseModel):
    """Schema para cálculo de impostos"""
    icms_rate: Decimal
    pis_rate: Decimal
    cofins_rate: Decimal
    icms_amount: Decimal
    pis_amount: Decimal
    cofins_amount: Decimal
    total_tax: Decimal


class SaleOrder(SaleOrderBase):
    id: str
    number: str
    order_date: datetime
    status: SaleOrderStatus
    
    # Valores calculados
    subtotal: Decimal
    icms_total: Decimal
    pis_total: Decimal
    cofins_total: Decimal
    tax_total: Decimal
    total_amount: Decimal
    
    # Dados do cliente (para exibição)
    client_name: Optional[str] = None
    client_document: Optional[str] = None
    
    # Items do pedido
    items: List[SaleOrderItem] = []
    
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SaleOrderSummary(BaseModel):
    """Schema resumido para listagens"""
    id: str
    number: str
    order_date: datetime
    status: SaleOrderStatus
    client_name: str
    client_document: str
    total_amount: Decimal
    items_count: int
    created_at: datetime


class SaleOrderResponse(BaseModel):
    orders: List[SaleOrderSummary]
    total: int
    page: int
    per_page: int


# Schema para estatísticas
class SaleOrderStats(BaseModel):
    total_orders: int
    total_value: Decimal
    orders_by_status: dict
    avg_order_value: Decimal
    orders_this_month: int
    value_this_month: Decimal