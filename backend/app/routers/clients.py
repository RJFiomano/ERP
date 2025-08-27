from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.contact import Phone, Address
from app.schemas.client import ClientCreate, ClientUpdate, Client as ClientSchema, ClientResponse

router = APIRouter()


@router.get("/")
def get_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    personType: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sortBy: Optional[str] = Query("created_at"),
    sortOrder: Optional[str] = Query("desc"),
    db: Session = Depends(get_db)
):
    """Lista clientes com paginação e busca"""
    query = db.query(Client)
    
    # Filtro de status - Lógica simples
    if status == "active":
        query = query.filter(Client.is_active == True)
    elif status == "inactive":
        query = query.filter(Client.is_active == False)
    # Se status == "all" ou qualquer outro valor, mostrar todos (não filtrar)
    
    # Filtro de tipo de pessoa
    if personType and personType != "":
        query = query.filter(Client.person_type == personType)
    
    # Filtro de busca
    if search and search != "":
        search_filter = f"%{search}%"
        query = query.filter(
            func.lower(Client.name).contains(search_filter.lower()) |
            Client.document.contains(search) |
            func.lower(Client.email).contains(search_filter.lower())
        )
    
    # Ordenação
    valid_sort_fields = {
        "name": Client.name,
        "person_type": Client.person_type,
        "document": Client.document,
        "email": Client.email,
        "phone": Client.phone,
        "created_at": Client.created_at,
        "updated_at": Client.updated_at,
        "is_active": Client.is_active
    }
    
    if sortBy in valid_sort_fields:
        sort_field = valid_sort_fields[sortBy]
        if sortOrder.lower() == "desc":
            query = query.order_by(sort_field.desc())
        else:
            query = query.order_by(sort_field.asc())
    else:
        # Ordenação padrão
        query = query.order_by(Client.created_at.desc())
    
    clients = query.offset(skip).limit(limit).all()
    
    # Converter para formato JSON serializable
    result = []
    for client in clients:
        # Buscar telefones e endereços do cliente
        phones = db.query(Phone).filter(Phone.client_id == client.id).all()
        addresses = db.query(Address).filter(Address.client_id == client.id).all()
        
        result.append({
            "id": str(client.id),
            "name": client.name,
            "person_type": client.person_type.value,
            "document": client.document,
            "rg": client.rg,
            "ie": client.ie,
            "email": client.email,
            "phone": client.phone,  # Campo legado
            "address": client.address,  # Campo legado
            "city": client.city,
            "state": client.state,
            "zip_code": client.zip_code,
            "is_active": client.is_active,
            "created_at": client.created_at.isoformat(),
            "updated_at": client.updated_at.isoformat(),
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
async def create_client(
    request: Request,
    db: Session = Depends(get_db)
):
    """Cria novo cliente"""
    try:
        # Parse manual do body
        body = await request.body()
        import json
        try:
            data = json.loads(body.decode('utf-8'))
        except UnicodeDecodeError:
            # Tentar com latin-1 se UTF-8 falhar
            data = json.loads(body.decode('latin-1'))
        
        # Verifica campos obrigatórios
        if not data.get('name'):
            raise HTTPException(status_code=400, detail="Nome é obrigatório")
        if not data.get('person_type'):
            raise HTTPException(status_code=400, detail="Tipo de pessoa é obrigatório")
        if not data.get('document'):
            raise HTTPException(status_code=400, detail="Documento é obrigatório")
        
        # Verifica se documento já existe (comparar apenas números)
        clean_document = ''.join(filter(str.isdigit, data['document']))
        existing_client = db.query(Client).filter(
            or_(
                Client.document == data['document'],  # Comparação exata
                func.regexp_replace(Client.document, '[^0-9]', '', 'g') == clean_document  # Comparação apenas números
            )
        ).first()
        if existing_client:
            try:
                print(f"DEBUG: Cliente existente encontrado - ID: {existing_client.id}")
                print(f"DEBUG: Nome: {existing_client.name}")
                print(f"DEBUG: Tipo: {existing_client.person_type}")
                print(f"DEBUG: Documento: {existing_client.document}")
                print(f"DEBUG: Status: {existing_client.is_active}")
                
                doc_type = "CPF" if existing_client.person_type.value == "PF" else "CNPJ"
                formatted_doc = existing_client.document
                
                # Validar se documento tem o tamanho correto antes de formatar
                if existing_client.person_type.value == "PF" and len(formatted_doc) == 11:
                    # Formatar CPF: 000.000.000-00
                    formatted_doc = f"{formatted_doc[:3]}.{formatted_doc[3:6]}.{formatted_doc[6:9]}-{formatted_doc[9:]}"
                elif existing_client.person_type.value == "PJ" and len(formatted_doc) == 14:
                    # Formatar CNPJ: 00.000.000/0000-00
                    formatted_doc = f"{formatted_doc[:2]}.{formatted_doc[2:5]}.{formatted_doc[5:8]}/{formatted_doc[8:12]}-{formatted_doc[12:]}"
                
                status_text = "Ativo" if existing_client.is_active else "Inativo"
                error_message = f"Já existe um cliente com este {doc_type}: {formatted_doc}. Cliente: {existing_client.name} (Status: {status_text})"
                
                print(f"DEBUG: Mensagem de erro: {error_message}")
                
                print(f"DEBUG: Tentando levantar HTTPException com mensagem: {error_message}")
                raise HTTPException(
                    status_code=400,
                    detail=error_message
                )
            except HTTPException:
                # Re-raise HTTPException
                raise
            except Exception as format_error:
                print(f"DEBUG: Erro ao formatar mensagem: {format_error}")
                print(f"DEBUG: Tipo do erro: {type(format_error)}")
                # Fallback para mensagem simples
                raise HTTPException(
                    status_code=400,
                    detail=f"Documento {data['document']} já está em uso por outro cliente."
                )
        
        # Cria o cliente
        client = Client(
            name=data['name'],
            person_type=data['person_type'],
            document=data['document'],
            rg=data.get('rg'),
            ie=data.get('ie'),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            city=data.get('city'),
            state=data.get('state'),
            zip_code=data.get('zip_code')
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        
        # Processar telefones do campo contacts se existir
        contacts = data.get('contacts', {})
        if contacts and contacts.get('phones'):
            for phone_data in contacts['phones']:
                phone = Phone(
                    client_id=client.id,
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
                    client_id=client.id,
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
                    client_id=client.id,
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
                    client_id=client.id,
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
        db.refresh(client)
        
        # Buscar telefones e endereços criados
        phones = db.query(Phone).filter(Phone.client_id == client.id).all()
        addresses = db.query(Address).filter(Address.client_id == client.id).all()
        
        return {
            "id": str(client.id),
            "name": client.name,
            "person_type": client.person_type.value,
            "document": client.document,
            "rg": client.rg,
            "ie": client.ie,
            "email": client.email,
            "phone": client.phone,  # Campo legado
            "address": client.address,  # Campo legado
            "city": client.city,
            "state": client.state,
            "zip_code": client.zip_code,
            "is_active": client.is_active,
            "created_at": client.created_at.isoformat(),
            "updated_at": client.updated_at.isoformat(),
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
        # Re-raise HTTPException (como validação de duplicatas)
        raise
    except Exception as e:
        print(f"DEBUG: Erro inesperado no CREATE: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{client_id}")
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Busca cliente por ID"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Buscar telefones e endereços do cliente
    phones = db.query(Phone).filter(Phone.client_id == client.id).all()
    addresses = db.query(Address).filter(Address.client_id == client.id).all()
    
    return {
        "id": str(client.id),
        "name": client.name,
        "person_type": client.person_type.value,
        "document": client.document,
        "ie": client.ie,
        "email": client.email,
        "phone": client.phone,  # Campo legado
        "address": client.address,  # Campo legado
        "city": client.city,
        "state": client.state,
        "zip_code": client.zip_code,
        "is_active": client.is_active,
        "created_at": client.created_at.isoformat(),
        "updated_at": client.updated_at.isoformat(),
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


@router.put("/{client_id}")
async def update_client(
    client_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza cliente"""
    try:
        # Parse manual do body
        body = await request.body()
        import json
        try:
            data = json.loads(body.decode('utf-8'))
        except UnicodeDecodeError:
            # Tentar com latin-1 se UTF-8 falhar
            data = json.loads(body.decode('latin-1'))
        
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Verifica se documento já existe (se foi alterado)
        if data.get('document') and data['document'] != client.document:
            clean_document = ''.join(filter(str.isdigit, data['document']))
            existing_client = db.query(Client).filter(
                or_(
                    Client.document == data['document'],  # Comparação exata
                    func.regexp_replace(Client.document, '[^0-9]', '', 'g') == clean_document  # Comparação apenas números
                )
            ).first()
            if existing_client:
                try:
                    doc_type = "CPF" if existing_client.person_type.value == "PF" else "CNPJ"
                    formatted_doc = existing_client.document
                    
                    # Validar se documento tem o tamanho correto antes de formatar
                    if existing_client.person_type.value == "PF" and len(formatted_doc) == 11:
                        # Formatar CPF: 000.000.000-00
                        formatted_doc = f"{formatted_doc[:3]}.{formatted_doc[3:6]}.{formatted_doc[6:9]}-{formatted_doc[9:]}"
                    elif existing_client.person_type.value == "PJ" and len(formatted_doc) == 14:
                        # Formatar CNPJ: 00.000.000/0000-00
                        formatted_doc = f"{formatted_doc[:2]}.{formatted_doc[2:5]}.{formatted_doc[5:8]}/{formatted_doc[8:12]}-{formatted_doc[12:]}"
                    
                    status_text = "Ativo" if existing_client.is_active else "Inativo"
                    
                    raise HTTPException(
                        status_code=400,
                        detail=f"Já existe um cliente com este {doc_type}: {formatted_doc}. Cliente: {existing_client.name} (Status: {status_text})"
                    )
                except HTTPException:
                    # Re-raise HTTPException
                    raise
                except Exception as format_error:
                    print(f"DEBUG: Erro ao formatar mensagem no UPDATE: {format_error}")
                    # Fallback para mensagem simples
                    raise HTTPException(
                        status_code=400,
                        detail=f"Documento {data['document']} já está em uso por outro cliente."
                    )
        
        # Atualiza apenas os campos fornecidos
        updatable_fields = ['name', 'person_type', 'document', 'rg', 'ie', 'email', 'phone', 'address', 'city', 'state', 'zip_code']
        for field in updatable_fields:
            if field in data:
                setattr(client, field, data[field])
        
        # Processar telefones e endereços se existirem
        contacts = data.get('contacts', {})
        
        # Atualizar telefones
        if 'phones' in contacts or 'phones' in data:
            # Remover telefones existentes
            db.query(Phone).filter(Phone.client_id == client.id).delete()
            
            # Adicionar novos telefones do campo contacts
            if contacts.get('phones'):
                for phone_data in contacts['phones']:
                    phone = Phone(
                        client_id=client.id,
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
                        client_id=client.id,
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
            db.query(Address).filter(Address.client_id == client.id).delete()
            
            # Adicionar novos endereços do campo contacts
            if contacts.get('addresses'):
                for address_data in contacts['addresses']:
                    address = Address(
                        client_id=client.id,
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
                        client_id=client.id,
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
        db.refresh(client)
        
        # Buscar telefones e endereços atualizados
        phones = db.query(Phone).filter(Phone.client_id == client.id).all()
        addresses = db.query(Address).filter(Address.client_id == client.id).all()
        
        return {
            "id": str(client.id),
            "name": client.name,
            "person_type": client.person_type.value,
            "document": client.document,
            "rg": client.rg,
            "ie": client.ie,
            "email": client.email,
            "phone": client.phone,  # Campo legado
            "address": client.address,  # Campo legado
            "city": client.city,
            "state": client.state,
            "zip_code": client.zip_code,
            "is_active": client.is_active,
            "created_at": client.created_at.isoformat(),
            "updated_at": client.updated_at.isoformat(),
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
        # Re-raise HTTPException (como validação de duplicatas)
        raise
    except Exception as e:
        print(f"DEBUG: Erro inesperado no UPDATE: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{client_id}/toggle-status")
def toggle_client_status(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Alterna o status ativo/inativo do cliente"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    client.is_active = not client.is_active
    db.commit()
    db.refresh(client)
    
    return {
        "id": str(client.id),
        "name": client.name,
        "is_active": client.is_active,
        "message": f"Cliente {'ativado' if client.is_active else 'desativado'} com sucesso"
    }

@router.delete("/{client_id}")
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove cliente (soft delete)"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    if not client.is_active:
        raise HTTPException(status_code=400, detail="Cliente já está inativo")
    
    client.is_active = False
    db.commit()
    
    return {"message": "Cliente removido com sucesso"}