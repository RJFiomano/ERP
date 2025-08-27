from sqlalchemy import Column, String, Numeric, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel, br_now
import enum


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    PIX = "pix"
    DEBIT_CARD = "debit_card"
    CREDIT_CARD = "credit_card"
    BOLETO = "boleto"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REFUSED = "refused"
    CANCELLED = "cancelled"


class Payment(BaseModel):
    __tablename__ = "payments"
    
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    method = Column(String(20), nullable=False)  # cash, pix, debit_card, credit_card, boleto
    status = Column(String(20), default="pending")
    
    amount = Column(Numeric(12, 2), nullable=False)
    fee_amount = Column(Numeric(10, 2), default=0)
    net_amount = Column(Numeric(12, 2), nullable=False)
    
    installments = Column(Integer, default=1)
    installment_amount = Column(Numeric(10, 2), nullable=True)
    
    # Dados específicos do pagamento
    authorization_code = Column(String(100))
    transaction_id = Column(String(100))
    pix_key = Column(String(200))
    qr_code = Column(String(500))
    barcode = Column(String(200))
    
    # Dados do cartão (apenas últimos 4 dígitos)
    card_brand = Column(String(50))
    card_last_digits = Column(String(4))
    
    payment_date = Column(DateTime, default=br_now)
    
    # Relacionamentos
    sale = relationship("Sale", back_populates="payments")


# Adicionar relacionamento no modelo Sale
from app.models.sale import Sale
Sale.payments = relationship("Payment", back_populates="sale")