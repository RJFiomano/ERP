from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.supplier import Supplier
from app.models.contact import Phone, Address
from app.schemas.contact import (
    Phone as PhoneSchema, PhoneCreate, PhoneUpdate,
    Address as AddressSchema, AddressCreate, AddressUpdate
)

router = APIRouter(prefix="/contacts", tags=["contacts"])


# Endpoints para Telefones
@router.get("/clients/{client_id}/phones", response_model=List[PhoneSchema])
async def get_client_phones(
    client_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar telefones de um cliente"""
    client = db.query(Client).filter(Client.id == str(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    phones = db.query(Phone).filter(Phone.client_id == str(client_id)).all()
    return phones


@router.post("/clients/{client_id}/phones", response_model=PhoneSchema)
async def create_client_phone(
    phone_data: PhoneCreate,
    client_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adicionar telefone a um cliente"""
    client = db.query(Client).filter(Client.id == str(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Se for marcado como principal, desmarcar outros telefones como principal
    if phone_data.is_primary:
        db.query(Phone).filter(
            Phone.client_id == str(client_id)
        ).update({"is_primary": False})
    
    phone = Phone(**phone_data.dict(), client_id=str(client_id))
    db.add(phone)
    db.commit()
    db.refresh(phone)
    return phone


@router.put("/phones/{phone_id}", response_model=PhoneSchema)
async def update_phone(
    phone_data: PhoneUpdate,
    phone_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar telefone"""
    phone = db.query(Phone).filter(Phone.id == str(phone_id)).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Telefone não encontrado")
    
    # Se for marcado como principal, desmarcar outros telefones como principal
    if phone_data.is_primary:
        if phone.client_id:
            db.query(Phone).filter(
                Phone.client_id == phone.client_id,
                Phone.id != str(phone_id)
            ).update({"is_primary": False})
        elif phone.supplier_id:
            db.query(Phone).filter(
                Phone.supplier_id == phone.supplier_id,
                Phone.id != str(phone_id)
            ).update({"is_primary": False})
    
    # Atualizar campos
    for field, value in phone_data.dict(exclude_unset=True).items():
        setattr(phone, field, value)
    
    db.commit()
    db.refresh(phone)
    return phone


@router.delete("/phones/{phone_id}")
async def delete_phone(
    phone_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Excluir telefone"""
    phone = db.query(Phone).filter(Phone.id == str(phone_id)).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Telefone não encontrado")
    
    db.delete(phone)
    db.commit()
    return {"message": "Telefone excluído com sucesso"}


# Endpoints para Fornecedores (Telefones)
@router.get("/suppliers/{supplier_id}/phones", response_model=List[PhoneSchema])
async def get_supplier_phones(
    supplier_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar telefones de um fornecedor"""
    supplier = db.query(Supplier).filter(Supplier.id == str(supplier_id)).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    phones = db.query(Phone).filter(Phone.supplier_id == str(supplier_id)).all()
    return phones


@router.post("/suppliers/{supplier_id}/phones", response_model=PhoneSchema)
async def create_supplier_phone(
    phone_data: PhoneCreate,
    supplier_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adicionar telefone a um fornecedor"""
    supplier = db.query(Supplier).filter(Supplier.id == str(supplier_id)).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    # Se for marcado como principal, desmarcar outros telefones como principal
    if phone_data.is_primary:
        db.query(Phone).filter(
            Phone.supplier_id == str(supplier_id)
        ).update({"is_primary": False})
    
    phone = Phone(**phone_data.dict(), supplier_id=str(supplier_id))
    db.add(phone)
    db.commit()
    db.refresh(phone)
    return phone


# Endpoints para Endereços - Clientes
@router.get("/clients/{client_id}/addresses", response_model=List[AddressSchema])
async def get_client_addresses(
    client_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar endereços de um cliente"""
    client = db.query(Client).filter(Client.id == str(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    addresses = db.query(Address).filter(Address.client_id == str(client_id)).all()
    return addresses


@router.post("/clients/{client_id}/addresses", response_model=AddressSchema)
async def create_client_address(
    address_data: AddressCreate,
    client_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adicionar endereço a um cliente"""
    client = db.query(Client).filter(Client.id == str(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Se for marcado como principal, desmarcar outros endereços como principal
    if address_data.is_primary:
        db.query(Address).filter(
            Address.client_id == str(client_id)
        ).update({"is_primary": False})
    
    address = Address(**address_data.dict(), client_id=str(client_id))
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.put("/addresses/{address_id}", response_model=AddressSchema)
async def update_address(
    address_data: AddressUpdate,
    address_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar endereço"""
    address = db.query(Address).filter(Address.id == str(address_id)).first()
    if not address:
        raise HTTPException(status_code=404, detail="Endereço não encontrado")
    
    # Se for marcado como principal, desmarcar outros endereços como principal
    if address_data.is_primary:
        if address.client_id:
            db.query(Address).filter(
                Address.client_id == address.client_id,
                Address.id != str(address_id)
            ).update({"is_primary": False})
        elif address.supplier_id:
            db.query(Address).filter(
                Address.supplier_id == address.supplier_id,
                Address.id != str(address_id)
            ).update({"is_primary": False})
    
    # Atualizar campos
    for field, value in address_data.dict(exclude_unset=True).items():
        setattr(address, field, value)
    
    db.commit()
    db.refresh(address)
    return address


@router.delete("/addresses/{address_id}")
async def delete_address(
    address_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Excluir endereço"""
    address = db.query(Address).filter(Address.id == str(address_id)).first()
    if not address:
        raise HTTPException(status_code=404, detail="Endereço não encontrado")
    
    db.delete(address)
    db.commit()
    return {"message": "Endereço excluído com sucesso"}


# Endpoints para Fornecedores (Endereços)
@router.get("/suppliers/{supplier_id}/addresses", response_model=List[AddressSchema])
async def get_supplier_addresses(
    supplier_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar endereços de um fornecedor"""
    supplier = db.query(Supplier).filter(Supplier.id == str(supplier_id)).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    addresses = db.query(Address).filter(Address.supplier_id == str(supplier_id)).all()
    return addresses


@router.post("/suppliers/{supplier_id}/addresses", response_model=AddressSchema)
async def create_supplier_address(
    address_data: AddressCreate,
    supplier_id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adicionar endereço a um fornecedor"""
    supplier = db.query(Supplier).filter(Supplier.id == str(supplier_id)).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    # Se for marcado como principal, desmarcar outros endereços como principal
    if address_data.is_primary:
        db.query(Address).filter(
            Address.supplier_id == str(supplier_id)
        ).update({"is_primary": False})
    
    address = Address(**address_data.dict(), supplier_id=str(supplier_id))
    db.add(address)
    db.commit()
    db.refresh(address)
    return address