from sqlalchemy import Column, String, DateTime, Integer, Boolean, Text, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base
from app.models.base import GUID


class SaleOrderStatus(enum.Enum):
    DRAFT = "draft"           # Rascunho
    CONFIRMED = "confirmed"   # Confirmado
    INVOICED = "invoiced"     # Faturado
    CANCELLED = "cancelled"   # Cancelado


class PaymentMethod(enum.Enum):
    CASH = "cash"                    # À vista
    INSTALLMENTS_2X = "installments_2x"   # 2x sem juros
    INSTALLMENTS_3X = "installments_3x"   # 3x sem juros
    INSTALLMENTS_4X = "installments_4x"   # 4x sem juros
    INSTALLMENTS_6X = "installments_6x"   # 6x sem juros
    INSTALLMENTS_12X = "installments_12x" # 12x com juros
    CREDIT_30 = "credit_30"          # Prazo 30 dias
    CREDIT_60 = "credit_60"          # Prazo 60 dias


class SaleOrder(Base):
    __tablename__ = "sale_orders"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(20), unique=True, nullable=False)
    
    # Cliente
    client_id = Column(GUID(), ForeignKey("clients.id"), nullable=True)  # Opcional para venda avulsa
    
    # Datas
    order_date = Column(DateTime, nullable=False, default=func.now())
    delivery_date = Column(DateTime)  # Data de entrega prevista
    
    # Status e controle
    status = Column(Enum(SaleOrderStatus), default=SaleOrderStatus.DRAFT, nullable=False)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.CASH, nullable=False)
    
    # Valores
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)        # Subtotal sem impostos
    discount_percent = Column(Numeric(5, 2), default=0)                # % Desconto
    discount_amount = Column(Numeric(10, 2), default=0)                # Valor do desconto
    
    # Impostos
    icms_total = Column(Numeric(10, 2), default=0)    # Total ICMS
    pis_total = Column(Numeric(10, 2), default=0)     # Total PIS
    cofins_total = Column(Numeric(10, 2), default=0)  # Total COFINS
    tax_total = Column(Numeric(10, 2), default=0)     # Total de impostos
    
    # Totais
    total_amount = Column(Numeric(10, 2), nullable=False, default=0)    # Total geral
    
    # Observações
    notes = Column(Text)
    internal_notes = Column(Text)  # Observações internas
    
    # Endereço de entrega
    delivery_address = Column(Text)
    
    # Vendedor
    seller_name = Column(String(100))
    
    # Controle
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relacionamentos
    client = relationship("Client", back_populates="sale_orders")
    items = relationship("SaleOrderItem", back_populates="sale_order", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<SaleOrder(number='{self.number}', client_id='{self.client_id}', status='{self.status}')>"


class SaleOrderItem(Base):
    __tablename__ = "sale_order_items"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    sale_order_id = Column(GUID(), ForeignKey("sale_orders.id"), nullable=False)
    product_id = Column(GUID(), ForeignKey("products.id"), nullable=True)  # Opcional para produtos de teste
    
    # Quantidade e valores
    quantity = Column(Numeric(10, 3), nullable=False)              # Quantidade
    unit_price = Column(Numeric(10, 2), nullable=False)           # Preço unitário
    total_price = Column(Numeric(10, 2), nullable=False)          # Total do item (para compatibilidade)
    tax_rate = Column(Numeric(5, 2), default=0)                   # Taxa de imposto geral
    tax_amount = Column(Numeric(10, 2), default=0)                # Valor do imposto geral
    discount_percent = Column(Numeric(5, 2), default=0)           # % Desconto no item
    discount_amount = Column(Numeric(10, 2), default=0)           # Valor do desconto
    
    # Totais do item
    gross_total = Column(Numeric(10, 2), nullable=False)          # Total bruto (qty * price)
    net_total = Column(Numeric(10, 2), nullable=False)            # Total líquido (após desconto)
    
    # Impostos do item
    icms_rate = Column(Numeric(5, 2), default=0)     # % ICMS
    pis_rate = Column(Numeric(5, 2), default=0)      # % PIS  
    cofins_rate = Column(Numeric(5, 2), default=0)   # % COFINS
    
    icms_amount = Column(Numeric(10, 2), default=0)  # Valor ICMS
    pis_amount = Column(Numeric(10, 2), default=0)   # Valor PIS
    cofins_amount = Column(Numeric(10, 2), default=0) # Valor COFINS
    
    # Controle
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relacionamentos
    sale_order = relationship("SaleOrder", back_populates="items")
    product = relationship("Product")
    
    def __repr__(self):
        return f"<SaleOrderItem(product_id='{self.product_id}', quantity={self.quantity}, unit_price={self.unit_price})>"