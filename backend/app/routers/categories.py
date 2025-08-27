from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import json

from app.core.database import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.category import Category as CategorySchema, CategoryCreate, CategoryUpdate
from app.core.auth import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=List[CategorySchema])
async def get_categories(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    sortBy: Optional[str] = Query("created_at"),
    sortOrder: Optional[str] = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar categorias com filtros e paginação"""
    query = db.query(Category)
    
    # Aplicar filtro de status
    if status == "active":
        query = query.filter(Category.is_active == True)
    elif status == "inactive":
        query = query.filter(Category.is_active == False)
    # Para "all", não aplica filtro de status
    
    # Aplicar filtro de busca
    if search:
        search_filter = or_(
            Category.name.ilike(f"%{search}%"),
            Category.description.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Aplicar ordenação
    if hasattr(Category, sortBy):
        order_column = getattr(Category, sortBy)
        if sortOrder == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
    
    # Aplicar paginação
    categories = query.offset(skip).limit(limit).all()
    return categories


@router.post("/", response_model=CategorySchema)
async def create_category(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Criar nova categoria"""
    try:
        # Obter dados do corpo da requisição
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        
        # Validar dados obrigatórios
        if not data.get('name') or not data.get('name').strip():
            raise HTTPException(status_code=400, detail="Nome da categoria é obrigatório")
        
        # Verificar se já existe categoria com este nome
        existing_category = db.query(Category).filter(
            func.lower(Category.name) == func.lower(data['name'].strip())
        ).first()
        
        if existing_category:
            raise HTTPException(
                status_code=400, 
                detail=f"Já existe uma categoria com o nome '{data['name']}'"
            )
        
        # Criar categoria
        print(f"DEBUG: Dados recebidos: {data}")
        print(f"DEBUG: Margem recebida: {data.get('default_margin_percentage')}")
        
        category_data = CategoryCreate(
            name=data['name'].strip(),
            description=data.get('description', '').strip() if data.get('description') else None,
            default_margin_percentage=data.get('default_margin_percentage')
        )
        
        print(f"DEBUG: CategoryCreate data: {category_data.dict()}")
        
        category = Category(**category_data.dict())
        db.add(category)
        db.commit()
        db.refresh(category)
        
        return category
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Dados inválidos")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{category_id}", response_model=CategorySchema)
async def get_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter categoria por ID"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return category


@router.put("/{category_id}", response_model=CategorySchema)
async def update_category(
    category_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar categoria"""
    try:
        # Buscar categoria
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        
        # Obter dados do corpo da requisição
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        
        # Verificar se o nome já existe (exceto para a própria categoria)
        if data.get('name'):
            existing_category = db.query(Category).filter(
                func.lower(Category.name) == func.lower(data['name'].strip()),
                Category.id != category_id
            ).first()
            
            if existing_category:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Já existe uma categoria com o nome '{data['name']}'"
                )
        
        # Atualizar campos
        print(f"DEBUG UPDATE: Dados recebidos: {data}")
        print(f"DEBUG UPDATE: Margem recebida: {data.get('default_margin_percentage')}")
        
        if data.get('name'):
            category.name = data['name'].strip()
        if 'description' in data:
            category.description = data['description'].strip() if data['description'] else None
        if 'default_margin_percentage' in data:
            category.default_margin_percentage = data['default_margin_percentage']
            print(f"DEBUG UPDATE: Margem definida para: {category.default_margin_percentage}")
        
        db.commit()
        db.refresh(category)
        
        return category
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Dados inválidos")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Inativar categoria (soft delete)"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    if not category.is_active:
        raise HTTPException(status_code=400, detail="Categoria já está inativa")
    
    category.is_active = False
    db.commit()
    
    return {"message": "Categoria inativada com sucesso"}


@router.patch("/{category_id}/toggle-status")
async def toggle_category_status(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Alternar status da categoria (ativo/inativo)"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    category.is_active = not category.is_active
    db.commit()
    
    status = "ativada" if category.is_active else "inativada"
    return {"message": f"Categoria {status} com sucesso"}