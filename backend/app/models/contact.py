from sqlalchemy import Column, String, Boolean, Enum, ForeignKey
from app.models.base import GUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class PhoneType(str, enum.Enum):
    mobile = "mobile"      # Celular
    home = "home"          # Residencial
    work = "work"          # Comercial
    fax = "fax"            # Fax
    whatsapp = "whatsapp"  # WhatsApp


class AddressType(str, enum.Enum):
    main = "main"          # Principal
    billing = "billing"    # Cobrança
    delivery = "delivery"  # Entrega
    work = "work"          # Comercial
    other = "other"        # Outro


class Phone(BaseModel):
    __tablename__ = "phones"
    
    number = Column(String(20), nullable=False)
    type = Column(Enum(PhoneType), default=PhoneType.mobile)
    is_whatsapp = Column(Boolean, default=False)
    is_primary = Column(Boolean, default=False)
    notes = Column(String(255))
    
    # Foreign key para pessoa unificada (novo)
    pessoa_id = Column(GUID, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=True)
    
    # Foreign key para cliente (legado)
    client_id = Column(GUID, ForeignKey("clients.id", ondelete="CASCADE"), nullable=True)
    
    # Foreign key para fornecedor (legado)
    supplier_id = Column(GUID, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=True)
    
    # Relacionamentos
    pessoa = relationship("Pessoa", back_populates="telefones")
    client = relationship("Client", back_populates="phones")
    supplier = relationship("Supplier", back_populates="phones")


class Address(BaseModel):
    __tablename__ = "addresses"
    
    type = Column(Enum(AddressType), default=AddressType.main)
    is_primary = Column(Boolean, default=False)
    
    # Campos de endereço
    street = Column(String(500), nullable=False)  # Rua/Logradouro
    number = Column(String(20))                   # Número
    complement = Column(String(255))              # Complemento
    neighborhood = Column(String(100))            # Bairro
    city = Column(String(100), nullable=False)    # Cidade
    state = Column(String(2), nullable=False)     # Estado (UF)
    zip_code = Column(String(10), nullable=False) # CEP
    
    notes = Column(String(255))
    
    # Foreign key para pessoa unificada (novo)
    pessoa_id = Column(GUID, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=True)
    
    # Foreign key para cliente (legado)
    client_id = Column(GUID, ForeignKey("clients.id", ondelete="CASCADE"), nullable=True)
    
    # Foreign key para fornecedor (legado)
    supplier_id = Column(GUID, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=True)
    
    # Relacionamentos
    pessoa = relationship("Pessoa", back_populates="enderecos")
    client = relationship("Client", back_populates="addresses")
    supplier = relationship("Supplier", back_populates="addresses")