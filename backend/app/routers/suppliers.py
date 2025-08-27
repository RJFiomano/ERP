from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.supplier import Supplier
from app.models.contact import Phone, Address

router = APIRouter()


@router.get("/")
def get_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    personType: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sortBy: Optional[str] = Query("created_at"),
    sortOrder: Optional[str] = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista fornecedores com paginação e busca"""
    query = db.query(Supplier)
    
    # Filtro de status
    if status == "active":
        query = query.filter(Supplier.is_active == True)
    elif status == "inactive":
        query = query.filter(Supplier.is_active == False)
    
    # Filtro de tipo de pessoa
    if personType and personType != "":
        query = query.filter(Supplier.person_type == personType)
    
    # Filtro de busca
    if search and search != "":
        search_filter = f"%{search}%"
        query = query.filter(
            func.lower(Supplier.name).contains(search_filter.lower()) |
            Supplier.document.contains(search) |
            func.lower(Supplier.email).contains(search_filter.lower())
        )
    
    # Ordenação
    valid_sort_fields = {
        "name": Supplier.name,
        "person_type": Supplier.person_type,
        "document": Supplier.document,
        "email": Supplier.email,
        "phone": Supplier.phone,
        "created_at": Supplier.created_at,
        "updated_at": Supplier.updated_at,
        "is_active": Supplier.is_active
    }
    
    if sortBy in valid_sort_fields:
        sort_field = valid_sort_fields[sortBy]
        if sortOrder.lower() == "desc":
            query = query.order_by(sort_field.desc())
        else:
            query = query.order_by(sort_field.asc())
    else:
        query = query.order_by(Supplier.created_at.desc())
    
    suppliers = query.offset(skip).limit(limit).all()
    
    # Converter para formato JSON
    result = []
    for supplier in suppliers:
        # Buscar telefones e endereços do fornecedor
        phones = db.query(Phone).filter(Phone.supplier_id == supplier.id).all()
        addresses = db.query(Address).filter(Address.supplier_id == supplier.id).all()
        
        result.append({
            "id": str(supplier.id),
            "name": supplier.name,
            "person_type": supplier.person_type.value,
            "document": supplier.document,
            "ie": supplier.ie,
            "email": supplier.email,
            "phone": supplier.phone,  # Campo legado
            "address": supplier.address,  # Campo legado
            "city": supplier.city,
            "state": supplier.state,
            "zip_code": supplier.zip_code,
            "is_active": supplier.is_active,
            "created_at": supplier.created_at.isoformat(),
            "updated_at": supplier.updated_at.isoformat(),
            # Novos campos para múltiplos contatos
            "phones": [{
                "id": str(phone.id),
                "number": phone.number,
                "type": phone.type.value,
                "is_whatsapp": phone.is_whatsapp,
                "is_primary": phone.is_primary,
                "notes": phone.notes,
                "created_at": phone.created_at.isoformat() if phone.created_at else None,
                "updated_at": phone.updated_at.isoformat() if phone.updated_at else None
            } for phone in phones],
            "addresses": [{
                "id": str(address.id),
                "type": address.type.value,
                "is_primary": address.is_primary,
                "street": address.street,
                "number": address.number,
                "complement": address.complement,
                "neighborhood": address.neighborhood,
                "city": address.city,
                "state": address.state,
                "zip_code": address.zip_code,
                "notes": address.notes,
                "created_at": address.created_at.isoformat() if address.created_at else None,
                "updated_at": address.updated_at.isoformat() if address.updated_at else None
            } for address in addresses]
        })
    
    return result


@router.post("/")
async def create_supplier(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria novo fornecedor"""
    try:
        # Parse manual do body
        body = await request.body()
        import json
        try:
            data = json.loads(body.decode('utf-8'))
        except UnicodeDecodeError:
            data = json.loads(body.decode('latin-1'))
        
        # Validações básicas
        if not data.get('name'):
            raise HTTPException(status_code=400, detail="Nome é obrigatório")
        if not data.get('person_type'):
            raise HTTPException(status_code=400, detail="Tipo de pessoa é obrigatório")
        if not data.get('document'):
            raise HTTPException(status_code=400, detail="Documento é obrigatório")
        
        # Verifica se documento já existe
        clean_document = ''.join(filter(str.isdigit, data['document']))
        existing_supplier = db.query(Supplier).filter(
            or_(
                Supplier.document == data['document'],
                func.regexp_replace(Supplier.document, '[^0-9]', '', 'g') == clean_document
            )
        ).first()
        
        if existing_supplier:
            doc_type = "CPF" if existing_supplier.person_type.value == "PF" else "CNPJ"
            formatted_doc = existing_supplier.document
            
            if existing_supplier.person_type.value == "PF" and len(formatted_doc) == 11:
                formatted_doc = f"{formatted_doc[:3]}.{formatted_doc[3:6]}.{formatted_doc[6:9]}-{formatted_doc[9:]}"
            elif existing_supplier.person_type.value == "PJ" and len(formatted_doc) == 14:
                formatted_doc = f"{formatted_doc[:2]}.{formatted_doc[2:5]}.{formatted_doc[5:8]}/{formatted_doc[8:12]}-{formatted_doc[12:]}"
            
            status_text = "Ativo" if existing_supplier.is_active else "Inativo"
            
            raise HTTPException(
                status_code=400,
                detail=f"Já existe um fornecedor com este {doc_type}: {formatted_doc}. Fornecedor: {existing_supplier.name} (Status: {status_text})"
            )
        
        # Cria o fornecedor
        supplier = Supplier(
            name=data['name'],
            person_type=data['person_type'],
            document=data['document'],
            ie=data.get('ie'),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            city=data.get('city'),
            state=data.get('state'),
            zip_code=data.get('zip_code')
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        
        # Processar telefones do campo contacts se existir
        contacts = data.get('contacts', {})
        if contacts and contacts.get('phones'):
            for phone_data in contacts['phones']:
                phone = Phone(
                    supplier_id=supplier.id,
                    number=phone_data['number'],
                    type=phone_data['type'],
                    is_whatsapp=phone_data.get('is_whatsapp', False),
                    is_primary=phone_data.get('is_primary', False),
                    notes=phone_data.get('notes')
                )
                db.add(phone)
        
        # Processar telefones direto se existir (compatibilidade)
        if data.get('phones'):
            for phone_data in data['phones']:
                phone = Phone(
                    supplier_id=supplier.id,
                    number=phone_data['number'],
                    type=phone_data['type'],
                    is_whatsapp=phone_data.get('is_whatsapp', False),
                    is_primary=phone_data.get('is_primary', False),
                    notes=phone_data.get('notes')
                )
                db.add(phone)
        
        # Processar endereços do campo contacts se existir
        if contacts and contacts.get('addresses'):
            for address_data in contacts['addresses']:
                address = Address(
                    supplier_id=supplier.id,
                    type=address_data['type'],
                    is_primary=address_data.get('is_primary', False),
                    street=address_data['street'],
                    number=address_data.get('number'),
                    complement=address_data.get('complement'),
                    neighborhood=address_data.get('neighborhood'),
                    city=address_data['city'],
                    state=address_data['state'],
                    zip_code=address_data['zip_code'],
                    notes=address_data.get('notes')
                )
                db.add(address)
        
        # Processar endereços direto se existir (compatibilidade)
        if data.get('addresses'):
            for address_data in data['addresses']:
                address = Address(
                    supplier_id=supplier.id,
                    type=address_data['type'],
                    is_primary=address_data.get('is_primary', False),
                    street=address_data['street'],
                    number=address_data.get('number'),
                    complement=address_data.get('complement'),
                    neighborhood=address_data.get('neighborhood'),
                    city=address_data['city'],
                    state=address_data['state'],
                    zip_code=address_data['zip_code'],
                    notes=address_data.get('notes')
                )
                db.add(address)
        
        db.commit()
        db.refresh(supplier)
        
        # Buscar telefones e endereços criados
        phones = db.query(Phone).filter(Phone.supplier_id == supplier.id).all()
        addresses = db.query(Address).filter(Address.supplier_id == supplier.id).all()
        
        return {
            "id": str(supplier.id),
            "name": supplier.name,
            "person_type": supplier.person_type.value,
            "document": supplier.document,
            "ie": supplier.ie,
            "email": supplier.email,
            "phone": supplier.phone,  # Campo legado
            "address": supplier.address,  # Campo legado
            "city": supplier.city,
            "state": supplier.state,
            "zip_code": supplier.zip_code,
            "is_active": supplier.is_active,
            "created_at": supplier.created_at.isoformat(),
            "updated_at": supplier.updated_at.isoformat(),
            # Novos campos para múltiplos contatos
            "phones": [{
                "id": str(phone.id),
                "number": phone.number,
                "type": phone.type.value,
                "is_whatsapp": phone.is_whatsapp,
                "is_primary": phone.is_primary,
                "notes": phone.notes,
                "created_at": phone.created_at.isoformat() if phone.created_at else None,
                "updated_at": phone.updated_at.isoformat() if phone.updated_at else None
            } for phone in phones],
            "addresses": [{
                "id": str(address.id),
                "type": address.type.value,
                "is_primary": address.is_primary,
                "street": address.street,
                "number": address.number,
                "complement": address.complement,
                "neighborhood": address.neighborhood,
                "city": address.city,
                "state": address.state,
                "zip_code": address.zip_code,
                "notes": address.notes,
                "created_at": address.created_at.isoformat() if address.created_at else None,
                "updated_at": address.updated_at.isoformat() if address.updated_at else None
            } for address in addresses]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{supplier_id}")
def get_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Busca fornecedor por ID"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    # Buscar telefones e endereços do fornecedor
    phones = db.query(Phone).filter(Phone.supplier_id == supplier.id).all()
    addresses = db.query(Address).filter(Address.supplier_id == supplier.id).all()
    
    return {
        "id": str(supplier.id),
        "name": supplier.name,
        "person_type": supplier.person_type.value,
        "document": supplier.document,
        "ie": supplier.ie,
        "email": supplier.email,
        "phone": supplier.phone,  # Campo legado
        "address": supplier.address,  # Campo legado
        "city": supplier.city,
        "state": supplier.state,
        "zip_code": supplier.zip_code,
        "is_active": supplier.is_active,
        "created_at": supplier.created_at.isoformat(),
        "updated_at": supplier.updated_at.isoformat(),
        # Novos campos para múltiplos contatos
        "phones": [{
            "id": str(phone.id),
            "number": phone.number,
            "type": phone.type.value,
            "is_whatsapp": phone.is_whatsapp,
            "is_primary": phone.is_primary,
            "notes": phone.notes,
            "created_at": phone.created_at.isoformat() if phone.created_at else None,
            "updated_at": phone.updated_at.isoformat() if phone.updated_at else None
        } for phone in phones],
        "addresses": [{
            "id": str(address.id),
            "type": address.type.value,
            "is_primary": address.is_primary,
            "street": address.street,
            "number": address.number,
            "complement": address.complement,
            "neighborhood": address.neighborhood,
            "city": address.city,
            "state": address.state,
            "zip_code": address.zip_code,
            "notes": address.notes,
            "created_at": address.created_at.isoformat() if address.created_at else None,
            "updated_at": address.updated_at.isoformat() if address.updated_at else None
        } for address in addresses]
    }


@router.put("/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza fornecedor"""
    try:
        body = await request.body()
        import json
        try:
            data = json.loads(body.decode('utf-8'))
        except UnicodeDecodeError:
            data = json.loads(body.decode('latin-1'))
        
        supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
        
        # Verifica documento duplicado se foi alterado
        if data.get('document') and data['document'] != supplier.document:
            clean_document = ''.join(filter(str.isdigit, data['document']))
            existing_supplier = db.query(Supplier).filter(
                or_(
                    Supplier.document == data['document'],
                    func.regexp_replace(Supplier.document, '[^0-9]', '', 'g') == clean_document
                )
            ).first()
            
            if existing_supplier:
                doc_type = "CPF" if existing_supplier.person_type.value == "PF" else "CNPJ"
                formatted_doc = existing_supplier.document
                
                if existing_supplier.person_type.value == "PF" and len(formatted_doc) == 11:
                    formatted_doc = f"{formatted_doc[:3]}.{formatted_doc[3:6]}.{formatted_doc[6:9]}-{formatted_doc[9:]}"
                elif existing_supplier.person_type.value == "PJ" and len(formatted_doc) == 14:
                    formatted_doc = f"{formatted_doc[:2]}.{formatted_doc[2:5]}.{formatted_doc[5:8]}/{formatted_doc[8:12]}-{formatted_doc[12:]}"
                
                status_text = "Ativo" if existing_supplier.is_active else "Inativo"
                
                raise HTTPException(
                    status_code=400,
                    detail=f"Já existe um fornecedor com este {doc_type}: {formatted_doc}. Fornecedor: {existing_supplier.name} (Status: {status_text})"
                )
        
        # Atualiza campos
        updatable_fields = ['name', 'person_type', 'document', 'ie', 'email', 'phone', 'address', 'city', 'state', 'zip_code']
        for field in updatable_fields:
            if field in data:
                setattr(supplier, field, data[field])
        
        # Processar telefones e endereços se existirem
        contacts = data.get('contacts', {})
        
        # Atualizar telefones
        if 'phones' in contacts or 'phones' in data:
            # Remover telefones existentes
            db.query(Phone).filter(Phone.supplier_id == supplier.id).delete()
            
            # Adicionar novos telefones do campo contacts
            if contacts.get('phones'):
                for phone_data in contacts['phones']:
                    phone = Phone(
                        supplier_id=supplier.id,
                        number=phone_data['number'],
                        type=phone_data['type'],
                        is_whatsapp=phone_data.get('is_whatsapp', False),
                        is_primary=phone_data.get('is_primary', False),
                        notes=phone_data.get('notes')
                    )
                    db.add(phone)
            
            # Adicionar novos telefones direto (compatibilidade)
            if data.get('phones'):
                for phone_data in data['phones']:
                    phone = Phone(
                        supplier_id=supplier.id,
                        number=phone_data['number'],
                        type=phone_data['type'],
                        is_whatsapp=phone_data.get('is_whatsapp', False),
                        is_primary=phone_data.get('is_primary', False),
                        notes=phone_data.get('notes')
                    )
                    db.add(phone)
        
        # Atualizar endereços
        if 'addresses' in contacts or 'addresses' in data:
            # Remover endereços existentes
            db.query(Address).filter(Address.supplier_id == supplier.id).delete()
            
            # Adicionar novos endereços do campo contacts
            if contacts.get('addresses'):
                for address_data in contacts['addresses']:
                    address = Address(
                        supplier_id=supplier.id,
                        type=address_data['type'],
                        is_primary=address_data.get('is_primary', False),
                        street=address_data['street'],
                        number=address_data.get('number'),
                        complement=address_data.get('complement'),
                        neighborhood=address_data.get('neighborhood'),
                        city=address_data['city'],
                        state=address_data['state'],
                        zip_code=address_data['zip_code'],
                        notes=address_data.get('notes')
                    )
                    db.add(address)
            
            # Adicionar novos endereços direto (compatibilidade)
            if data.get('addresses'):
                for address_data in data['addresses']:
                    address = Address(
                        supplier_id=supplier.id,
                        type=address_data['type'],
                        is_primary=address_data.get('is_primary', False),
                        street=address_data['street'],
                        number=address_data.get('number'),
                        complement=address_data.get('complement'),
                        neighborhood=address_data.get('neighborhood'),
                        city=address_data['city'],
                        state=address_data['state'],
                        zip_code=address_data['zip_code'],
                        notes=address_data.get('notes')
                    )
                    db.add(address)
        
        db.commit()
        db.refresh(supplier)
        
        # Buscar telefones e endereços atualizados
        phones = db.query(Phone).filter(Phone.supplier_id == supplier.id).all()
        addresses = db.query(Address).filter(Address.supplier_id == supplier.id).all()
        
        return {
            "id": str(supplier.id),
            "name": supplier.name,
            "person_type": supplier.person_type.value,
            "document": supplier.document,
            "ie": supplier.ie,
            "email": supplier.email,
            "phone": supplier.phone,  # Campo legado
            "address": supplier.address,  # Campo legado
            "city": supplier.city,
            "state": supplier.state,
            "zip_code": supplier.zip_code,
            "is_active": supplier.is_active,
            "created_at": supplier.created_at.isoformat(),
            "updated_at": supplier.updated_at.isoformat(),
            # Novos campos para múltiplos contatos
            "phones": [{
                "id": str(phone.id),
                "number": phone.number,
                "type": phone.type.value,
                "is_whatsapp": phone.is_whatsapp,
                "is_primary": phone.is_primary,
                "notes": phone.notes,
                "created_at": phone.created_at.isoformat() if phone.created_at else None,
                "updated_at": phone.updated_at.isoformat() if phone.updated_at else None
            } for phone in phones],
            "addresses": [{
                "id": str(address.id),
                "type": address.type.value,
                "is_primary": address.is_primary,
                "street": address.street,
                "number": address.number,
                "complement": address.complement,
                "neighborhood": address.neighborhood,
                "city": address.city,
                "state": address.state,
                "zip_code": address.zip_code,
                "notes": address.notes,
                "created_at": address.created_at.isoformat() if address.created_at else None,
                "updated_at": address.updated_at.isoformat() if address.updated_at else None
            } for address in addresses]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{supplier_id}/toggle-status")
def toggle_supplier_status(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Alterna status ativo/inativo do fornecedor"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    supplier.is_active = not supplier.is_active
    db.commit()
    db.refresh(supplier)
    
    return {
        "id": str(supplier.id),
        "name": supplier.name,
        "is_active": supplier.is_active,
        "message": f"Fornecedor {'ativado' if supplier.is_active else 'desativado'} com sucesso"
    }


@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove fornecedor (soft delete)"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    if not supplier.is_active:
        raise HTTPException(status_code=400, detail="Fornecedor já está inativo")
    
    supplier.is_active = False
    db.commit()
    
    return {"message": "Fornecedor removido com sucesso"}