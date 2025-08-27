from sqlalchemy import Column, String, Numeric, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum
from datetime import datetime


class SaleStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    INVOICED = "invoiced"
    CANCELLED = "cancelled"


class Sale(BaseModel):
    __tablename__ = "sales"
    
    number = Column(String(50), unique=True, nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sale_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="draft")
    
    subtotal = Column(Numeric(12, 2), default=0)
    discount_type = Column(String(20), default="percentage")  # percentage, value
    discount_value = Column(Numeric(10, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    shipping_cost = Column(Numeric(10, 2), default=0)
    tax_total = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), default=0)
    
    # Condições de pagamento
    payment_terms = Column(String(50), default="cash")  # cash, 30days, 60days, installments
    delivery_date = Column(DateTime, nullable=True)
    
    notes = Column(String(1000))
    
    client = relationship("Client")
    user = relationship("User")
    items = relationship("SaleItem", back_populates="sale")


class SaleItem(BaseModel):
    __tablename__ = "sale_items"
    
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)
    
    # Impostos
    icms_amount = Column(Numeric(10, 2), default=0)
    pis_amount = Column(Numeric(10, 2), default=0)
    cofins_amount = Column(Numeric(10, 2), default=0)
    
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")