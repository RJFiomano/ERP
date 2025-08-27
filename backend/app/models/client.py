from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class PersonType(str, enum.Enum):
    PF = "PF"  # Pessoa Física
    PJ = "PJ"  # Pessoa Jurídica


class Client(BaseModel):
    __tablename__ = "clients"
    
    name = Column(String(255), nullable=False)
    person_type = Column(Enum(PersonType), nullable=False)
    document = Column(String(20), nullable=False)  # CPF ou CNPJ
    rg = Column(String(20))  # RG - Registro Geral
    ie = Column(String(20))  # Inscrição Estadual
    email = Column(String(255))
    
    # Campos legados (manter compatibilidade)
    phone = Column(String(20))
    address = Column(String(500))
    city = Column(String(100))
    state = Column(String(2))
    zip_code = Column(String(10))
    
    is_active = Column(Boolean, default=True)
    
    # Relacionamentos para múltiplos contatos
    phones = relationship("Phone", back_populates="client", cascade="all, delete-orphan")
    addresses = relationship("Address", back_populates="client", cascade="all, delete-orphan")
    
    # Relacionamento com pedidos de venda
    sale_orders = relationship("SaleOrder", back_populates="client")