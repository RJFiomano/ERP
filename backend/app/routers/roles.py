from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.user import User
from app.schemas.role import (
    Role as RoleSchema, RoleCreate, RoleUpdate,
    Permission as PermissionSchema, PermissionCreate, PermissionUpdate,
    UserRoleInfo
)
from app.core.auth import get_current_user
from app.core.permissions import PermissionChecker, get_user_permissions

router = APIRouter(prefix="/roles", tags=["roles"])

# Dependências de permissão
require_roles_view = PermissionChecker("roles", "view")
require_roles_create = PermissionChecker("roles", "create")
require_roles_edit = PermissionChecker("roles", "edit")
require_roles_delete = PermissionChecker("roles", "delete")


@router.get("/", response_model=List[RoleSchema])
async def get_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None),
    status: str = Query("active"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles_view)
):
    """Listar roles com filtros"""
    query = db.query(Role)
    
    # Filtro de status
    if status == "active":
        query = query.filter(Role.is_active == True)
    elif status == "inactive":
        query = query.filter(Role.is_active == False)
    
    # Filtro de busca
    if search:
        query = query.filter(
            or_(
                Role.name.ilike(f"%{search}%"),
                Role.description.ilike(f"%{search}%")
            )
        )
    
    # Paginação
    roles = query.offset(skip).limit(limit).all()
    
    # Incluir permissões de cada role
    result = []
    for role in roles:
        role_dict = RoleSchema.model_validate(role).model_dump()
        
        # Buscar permissões do role
        permissions = db.query(Permission).join(RolePermission).filter(
            RolePermission.role_id == role.id,
            RolePermission.granted == True,
            Permission.is_active == True
        ).all()
        
        role_dict["permissions"] = [PermissionSchema.model_validate(p) for p in permissions]
        result.append(RoleSchema(**role_dict))
    
    return result


@router.post("/", response_model=RoleSchema)
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles_create)
):
    """Criar novo role"""
    # Verificar se já existe role com este nome
    existing_role = db.query(Role).filter(Role.name == role_data.name).first()
    if existing_role:
        raise HTTPException(status_code=400, detail="Já existe um role com este nome")
    
    # Criar role
    role = Role(
        name=role_data.name,
        description=role_data.description
    )
    db.add(role)
    db.flush()  # Para obter o ID
    
    # Adicionar permissões
    if role_data.permission_ids:
        for permission_id in role_data.permission_ids:
            # Verificar se a permissão existe
            permission = db.query(Permission).filter(Permission.id == permission_id).first()
            if permission:
                role_permission = RolePermission(
                    role_id=role.id,
                    permission_id=permission_id,
                    granted=True
                )
                db.add(role_permission)
    
    db.commit()
    db.refresh(role)
    
    # Retornar com permissões
    permissions = db.query(Permission).join(RolePermission).filter(
        RolePermission.role_id == role.id,
        RolePermission.granted == True
    ).all()
    
    role_dict = RoleSchema.model_validate(role).model_dump()
    role_dict["permissions"] = [PermissionSchema.model_validate(p) for p in permissions]
    
    return RoleSchema(**role_dict)


@router.get("/{role_id}", response_model=RoleSchema)
async def get_role(
    role_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles_view)
):
    """Obter role por ID"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role não encontrado")
    
    # Buscar permissões
    permissions = db.query(Permission).join(RolePermission).filter(
        RolePermission.role_id == role.id,
        RolePermission.granted == True
    ).all()
    
    role_dict = RoleSchema.model_validate(role).model_dump()
    role_dict["permissions"] = [PermissionSchema.model_validate(p) for p in permissions]
    
    return RoleSchema(**role_dict)


@router.put("/{role_id}", response_model=RoleSchema)
async def update_role(
    role_id: str,
    role_data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles_edit)
):
    """Atualizar role"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role não encontrado")
    
    # Verificar nome duplicado (se alterando)
    if role_data.name and role_data.name != role.name:
        existing_role = db.query(Role).filter(
            Role.name == role_data.name, 
            Role.id != role_id
        ).first()
        if existing_role:
            raise HTTPException(status_code=400, detail="Já existe um role com este nome")
    
    # Atualizar campos básicos
    for field, value in role_data.model_dump(exclude_unset=True).items():
        if field != "permission_ids" and hasattr(role, field):
            setattr(role, field, value)
    
    # Atualizar permissões se fornecidas
    if role_data.permission_ids is not None:
        # Remover permissões existentes
        db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
        
        # Adicionar novas permissões
        for permission_id in role_data.permission_ids:
            permission = db.query(Permission).filter(Permission.id == permission_id).first()
            if permission:
                role_permission = RolePermission(
                    role_id=role.id,
                    permission_id=permission_id,
                    granted=True
                )
                db.add(role_permission)
    
    db.commit()
    db.refresh(role)
    
    # Retornar com permissões
    permissions = db.query(Permission).join(RolePermission).filter(
        RolePermission.role_id == role.id,
        RolePermission.granted == True
    ).all()
    
    role_dict = RoleSchema.model_validate(role).model_dump()
    role_dict["permissions"] = [PermissionSchema.model_validate(p) for p in permissions]
    
    return RoleSchema(**role_dict)


@router.delete("/{role_id}")
async def delete_role(
    role_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles_delete)
):
    """Inativar role"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role não encontrado")
    
    # Verificar se há usuários usando este role
    users_count = db.query(User).filter(User.role_id == role_id, User.is_active == True).count()
    if users_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Não é possível inativar o role. {users_count} usuário(s) ainda estão usando este role."
        )
    
    role.is_active = False
    db.commit()
    
    return {"message": "Role inativado com sucesso"}


@router.get("/me/permissions", response_model=UserRoleInfo)
async def get_my_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obter permissões do usuário atual"""
    permissions = get_user_permissions(current_user, db)
    
    role_name = None
    if current_user.role_obj:
        role_name = current_user.role_obj.name
    elif current_user.role:
        role_name = current_user.role.value
    
    return UserRoleInfo(
        role_id=current_user.role_id,
        role_name=role_name,
        permissions=permissions
    )