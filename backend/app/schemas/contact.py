from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID
from app.models.contact import PhoneType, AddressType


# Phone Schemas
class PhoneBase(BaseModel):
    number: str = Field(..., min_length=1, max_length=20, description="Número do telefone")
    type: PhoneType = Field(default=PhoneType.mobile, description="Tipo do telefone")
    is_whatsapp: bool = Field(default=False, description="É WhatsApp")
    is_primary: bool = Field(default=False, description="É telefone principal")
    notes: Optional[str] = Field(None, max_length=255, description="Observações")


class PhoneCreate(PhoneBase):
    pass


class PhoneUpdate(BaseModel):
    number: Optional[str] = Field(None, min_length=1, max_length=20)
    type: Optional[PhoneType] = None
    is_whatsapp: Optional[bool] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=255)


class Phone(PhoneBase):
    id: UUID
    client_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Address Schemas
class AddressBase(BaseModel):
    type: AddressType = Field(default=AddressType.main, description="Tipo do endereço")
    is_primary: bool = Field(default=False, description="É endereço principal")
    street: str = Field(..., min_length=1, max_length=500, description="Rua/Logradouro")
    number: Optional[str] = Field(None, max_length=20, description="Número")
    complement: Optional[str] = Field(None, max_length=255, description="Complemento")
    neighborhood: Optional[str] = Field(None, max_length=100, description="Bairro")
    city: str = Field(..., min_length=1, max_length=100, description="Cidade")
    state: str = Field(..., min_length=2, max_length=2, description="Estado (UF)")
    zip_code: str = Field(..., min_length=1, max_length=10, description="CEP")
    notes: Optional[str] = Field(None, max_length=255, description="Observações")


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    type: Optional[AddressType] = None
    is_primary: Optional[bool] = None
    street: Optional[str] = Field(None, min_length=1, max_length=500)
    number: Optional[str] = Field(None, max_length=20)
    complement: Optional[str] = Field(None, max_length=255)
    neighborhood: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=2)
    zip_code: Optional[str] = Field(None, min_length=1, max_length=10)
    notes: Optional[str] = Field(None, max_length=255)


class Address(AddressBase):
    id: UUID
    client_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Schemas combinados para facilitar o uso
class ContactInfo(BaseModel):
    phones: List[Phone] = []
    addresses: List[Address] = []


class ContactInfoCreate(BaseModel):
    phones: List[PhoneCreate] = []
    addresses: List[AddressCreate] = []


class ContactInfoUpdate(BaseModel):
    phones: Optional[List[PhoneCreate]] = None
    addresses: Optional[List[AddressCreate]] = None