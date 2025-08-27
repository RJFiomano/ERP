from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from app.models.client import PersonType
from app.schemas.contact import Phone, Address, PhoneCreate, AddressCreate, ContactInfoCreate


class ClientBase(BaseModel):
    name: str
    person_type: PersonType
    document: str
    rg: Optional[str] = None
    ie: Optional[str] = None
    email: Optional[str] = None
    
    # Campos legados (compatibilidade)
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None


class ClientCreate(ClientBase):
    # Novos campos para múltiplos contatos
    phones: Optional[List[PhoneCreate]] = []
    addresses: Optional[List[AddressCreate]] = []


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    person_type: Optional[PersonType] = None
    document: Optional[str] = None
    rg: Optional[str] = None
    ie: Optional[str] = None
    email: Optional[str] = None
    
    # Campos legados (compatibilidade)
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    
    # Novos campos para múltiplos contatos
    phones: Optional[List[PhoneCreate]] = None
    addresses: Optional[List[AddressCreate]] = None


class Client(ClientBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Relacionamentos com múltiplos contatos
    phones: List[Phone] = []
    addresses: List[Address] = []

    class Config:
        from_attributes = True


class ClientResponse(BaseModel):
    clients: list[Client]
    total: int
    page: int
    per_page: int