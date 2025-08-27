from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from app.models.supplier import PersonType
from app.schemas.contact import Phone, Address, PhoneCreate, AddressCreate


class SupplierBase(BaseModel):
    name: str
    person_type: PersonType
    document: str
    ie: Optional[str] = None
    email: Optional[EmailStr] = None
    
    # Campos legados (compatibilidade)
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    @validator('document')
    def validate_document(cls, v, values):
        if not v:
            raise ValueError('Documento é obrigatório')
        
        # Remove formatação
        clean_doc = ''.join(filter(str.isdigit, v))
        
        person_type = values.get('person_type')
        if person_type == PersonType.PF and len(clean_doc) != 11:
            raise ValueError('CPF deve ter 11 dígitos')
        elif person_type == PersonType.PJ and len(clean_doc) != 14:
            raise ValueError('CNPJ deve ter 14 dígitos')
            
        return clean_doc

    @validator('state')
    def validate_state(cls, v):
        if v and len(v) != 2:
            raise ValueError('Estado deve ter 2 caracteres')
        return v.upper() if v else v


class SupplierCreate(SupplierBase):
    # Novos campos para múltiplos contatos
    phones: Optional[List[PhoneCreate]] = []
    addresses: Optional[List[AddressCreate]] = []


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    person_type: Optional[PersonType] = None
    document: Optional[str] = None
    ie: Optional[str] = None
    email: Optional[EmailStr] = None
    
    # Campos legados (compatibilidade)
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    
    # Novos campos para múltiplos contatos
    phones: Optional[List[PhoneCreate]] = None
    addresses: Optional[List[AddressCreate]] = None

    @validator('document')
    def validate_document(cls, v, values):
        if v:
            clean_doc = ''.join(filter(str.isdigit, v))
            person_type = values.get('person_type')
            if person_type == PersonType.PF and len(clean_doc) != 11:
                raise ValueError('CPF deve ter 11 dígitos')
            elif person_type == PersonType.PJ and len(clean_doc) != 14:
                raise ValueError('CNPJ deve ter 14 dígitos')
            return clean_doc
        return v

    @validator('state')
    def validate_state(cls, v):
        if v and len(v) != 2:
            raise ValueError('Estado deve ter 2 caracteres')
        return v.upper() if v else v


class Supplier(SupplierBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Relacionamentos com múltiplos contatos
    phones: List[Phone] = []
    addresses: List[Address] = []

    class Config:
        from_attributes = True


class SupplierResponse(BaseModel):
    id: str
    name: str
    person_type: str
    document: str
    ie: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    is_active: bool
    created_at: str
    updated_at: str