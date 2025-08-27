from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, distinct

from app.core.database import get_db
from app.models.permission import Permission
from app.models.user import User
from app.schemas.role import Permission as PermissionSchema, PermissionCreate, PermissionUpdate
from app.core.permissions import PermissionChecker

router = APIRouter(prefix="/permissions", tags=["permissions"])

# Dependências de permissão (só admin pode gerenciar permissões)
require_admin = PermissionChecker("roles", "view")


@router.get("/", response_model=List[PermissionSchema])
async def get_permissions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None),
    resource: str = Query(None),
    action: str = Query(None),
    status: str = Query("active"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Listar permissões com filtros"""
    query = db.query(Permission)
    
    # Filtro de status
    if status == "active":
        query = query.filter(Permission.is_active == True)
    elif status == "inactive":
        query = query.filter(Permission.is_active == False)
    
    # Filtro de busca
    if search:
        query = query.filter(
            or_(
                Permission.name.ilike(f"%{search}%"),
                Permission.resource.ilike(f"%{search}%"),
                Permission.action.ilike(f"%{search}%"),
                Permission.description.ilike(f"%{search}%")
            )
        )
    
    # Filtro por recurso
    if resource:
        query = query.filter(Permission.resource == resource)
    
    # Filtro por ação
    if action:
        query = query.filter(Permission.action == action)
    
    # Ordenar e paginar
    permissions = query.order_by(Permission.resource, Permission.action).offset(skip).limit(limit).all()
    
    return [PermissionSchema.model_validate(p) for p in permissions]


@router.post("/", response_model=PermissionSchema)
async def create_permission(
    permission_data: PermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Criar nova permissão"""
    # Verificar se já existe permissão com este nome
    existing_permission = db.query(Permission).filter(
        Permission.name == permission_data.name
    ).first()
    if existing_permission:
        raise HTTPException(status_code=400, detail="Já existe uma permissão com este nome")
    
    # Verificar se já existe permissão para este recurso:ação
    existing_resource_action = db.query(Permission).filter(
        Permission.resource == permission_data.resource,
        Permission.action == permission_data.action
    ).first()
    if existing_resource_action:
        raise HTTPException(
            status_code=400, 
            detail=f"Já existe uma permissão para {permission_data.resource}:{permission_data.action}"
        )
    
    permission = Permission(**permission_data.model_dump())
    db.add(permission)
    db.commit()
    db.refresh(permission)
    
    return PermissionSchema.model_validate(permission)


@router.get("/resources", response_model=List[str])
async def get_resources(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Obter lista de recursos únicos"""
    resources = db.query(distinct(Permission.resource)).filter(
        Permission.is_active == True
    ).all()
    return [r[0] for r in resources if r[0]]


@router.get("/actions", response_model=List[str])
async def get_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Obter lista de ações únicas"""
    actions = db.query(distinct(Permission.action)).filter(
        Permission.is_active == True
    ).all()
    return [a[0] for a in actions if a[0]]


@router.get("/{permission_id}", response_model=PermissionSchema)
async def get_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Obter permissão por ID"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permissão não encontrada")
    
    return PermissionSchema.model_validate(permission)


@router.put("/{permission_id}", response_model=PermissionSchema)
async def update_permission(
    permission_id: str,
    permission_data: PermissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Atualizar permissão"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permissão não encontrada")
    
    # Verificar nome duplicado
    if permission_data.name and permission_data.name != permission.name:
        existing_permission = db.query(Permission).filter(
            Permission.name == permission_data.name,
            Permission.id != permission_id
        ).first()
        if existing_permission:
            raise HTTPException(status_code=400, detail="Já existe uma permissão com este nome")
    
    # Verificar recurso:ação duplicado
    if permission_data.resource or permission_data.action:
        new_resource = permission_data.resource or permission.resource
        new_action = permission_data.action or permission.action
        
        existing_resource_action = db.query(Permission).filter(
            Permission.resource == new_resource,
            Permission.action == new_action,
            Permission.id != permission_id
        ).first()
        if existing_resource_action:
            raise HTTPException(
                status_code=400, 
                detail=f"Já existe uma permissão para {new_resource}:{new_action}"
            )
    
    # Atualizar campos
    for field, value in permission_data.model_dump(exclude_unset=True).items():
        if hasattr(permission, field):
            setattr(permission, field, value)
    
    db.commit()
    db.refresh(permission)
    
    return PermissionSchema.model_validate(permission)


@router.delete("/{permission_id}")
async def delete_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Inativar permissão"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permissão não encontrada")
    
    permission.is_active = False
    db.commit()
    
    return {"message": "Permissão inativada com sucesso"}