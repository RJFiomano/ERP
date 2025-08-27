from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum
from datetime import datetime


class AccountType(str, enum.Enum):
    RECEIVABLE = "receivable"  # Contas a Receber
    PAYABLE = "payable"        # Contas a Pagar


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PIX = "pix"
    BANK_TRANSFER = "bank_transfer"
    BANK_SLIP = "bank_slip"  # Boleto


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Account(BaseModel):
    __tablename__ = "accounts"
    
    description = Column(String(255), nullable=False)
    account_type = Column(Enum(AccountType), nullable=False)
    
    # Relacionamentos
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=True)
    
    amount = Column(Numeric(12, 2), nullable=False)
    due_date = Column(DateTime, nullable=False)
    payment_date = Column(DateTime, nullable=True)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    
    notes = Column(String(1000))
    
    client = relationship("Client")
    supplier = relationship("Supplier")
    sale = relationship("Sale")