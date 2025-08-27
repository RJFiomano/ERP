from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.client import PersonType


class Supplier(BaseModel):
    __tablename__ = "suppliers"
    
    name = Column(String(255), nullable=False)
    person_type = Column(Enum(PersonType), nullable=False)
    document = Column(String(20), nullable=False)  # CPF ou CNPJ
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
    phones = relationship("Phone", back_populates="supplier", cascade="all, delete-orphan")
    addresses = relationship("Address", back_populates="supplier", cascade="all, delete-orphan")