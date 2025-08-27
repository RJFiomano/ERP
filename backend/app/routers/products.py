from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from decimal import Decimal
import json

from app.core.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.user import User
from app.schemas.product import Product as ProductSchema, ProductCreate, ProductUpdate
from app.core.auth import get_current_user
from app.core.permissions import PermissionChecker

router = APIRouter(prefix="/products", tags=["products"])

# Dependências de permissão
require_products_view = PermissionChecker("products", "view")
require_products_create = PermissionChecker("products", "create")
require_products_edit = PermissionChecker("products", "edit")
require_products_delete = PermissionChecker("products", "delete")


def calculate_product_fields(product: Product) -> dict:
    """Calcula campos derivados do produto"""
    fields = {}
    
    # Calcular margem
    if product.cost_price and product.sale_price and product.cost_price > 0:
        margin_value = product.sale_price - product.cost_price
        margin_percentage = (margin_value / product.cost_price) * 100
        fields["margin_value"] = margin_value
        fields["margin_percentage"] = float(margin_percentage)
    else:
        fields["margin_value"] = None
        fields["margin_percentage"] = None
    
    # Status do estoque
    if product.stock_quantity == 0:
        fields["stock_status"] = "zerado"
    elif product.stock_quantity <= product.min_stock:
        fields["stock_status"] = "baixo"
    else:
        fields["stock_status"] = "normal"
    
    # Nome da categoria
    if hasattr(product, 'category') and product.category:
        fields["category_name"] = product.category.name
    else:
        fields["category_name"] = None
    
    return fields


def calculate_sale_price_with_margin(cost_price: Decimal, margin_percentage: Decimal) -> Decimal:
    """Calcula preço de venda baseado no custo e margem percentual"""
    if not cost_price or cost_price <= 0:
        return Decimal(0)
    
    if not margin_percentage or margin_percentage <= 0:
        return cost_price
    
    # Aplica a margem: preço_venda = custo + (custo * margem/100)
    margin_multiplier = 1 + (margin_percentage / 100)
    return cost_price * margin_multiplier


def get_effective_margin_for_product(product: Product, db: Session) -> Decimal:
    """Obtém a margem efetiva para um produto (própria ou da categoria)"""
    # Se tem margem específica do produto
    if product.margin_percentage is not None and product.margin_type == 'percentage':
        return product.margin_percentage
    
    # Se deve usar margem da categoria
    if product.use_category_margin and product.category_id:
        category = db.query(Category).filter(Category.id == product.category_id).first()
        if category and category.default_margin_percentage is not None:
            return category.default_margin_percentage
    
    # Sem margem configurada
    return Decimal(0)


@router.get("/search")
async def search_product_by_barcode(
    barcode: str = Query(..., description="Código de barras do produto"),
    db: Session = Depends(get_db)
):
    """Busca produto por código de barras para sistema de vendas rápidas"""
    
    if not barcode.strip():
        raise HTTPException(status_code=400, detail="Código de barras é obrigatório")
    
    # Busca produto pelo código de barras
    product = db.query(Product).filter(
        Product.barcode == barcode.strip(),
        Product.is_active == True
    ).first()
    
    if not product:
        return {
            "success": False,
            "message": "Produto não encontrado",
            "data": None
        }
    
    # Calcula campos derivados
    derived_fields = calculate_product_fields(product)
    
    # Monta resposta com dados necessários para venda
    product_data = {
        "id": str(product.id),
        "name": product.name,
        "barcode": product.barcode,
        "description": product.description,
        "sale_price": float(product.sale_price) if product.sale_price else 0,
        "cost_price": float(product.cost_price) if product.cost_price else 0,
        "stock_quantity": float(product.stock_quantity) if product.stock_quantity else 0,
        "min_stock": float(product.min_stock) if product.min_stock else 0,
        "unit": product.unit,
        "category_name": derived_fields.get("category_name"),
        "stock_status": derived_fields.get("stock_status"),
        "margin_percentage": derived_fields.get("margin_percentage"),
        "is_active": product.is_active,
        "weight": float(product.weight) if product.weight else None,
        "brand": product.brand,
    }
    
    return {
        "success": True,
        "message": "Produto encontrado",
        "data": product_data
    }


@router.get("/", response_model=List[ProductSchema])
async def get_products(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    stock_status: Optional[str] = Query(None),
    sortBy: Optional[str] = Query("created_at"),
    sortOrder: Optional[str] = Query("desc"),
    db: Session = Depends(get_db)
):
    """Listar produtos com filtros e paginação"""
    query = db.query(Product).outerjoin(Category, Product.category_id == Category.id)
    
    # Aplicar filtro de status
    if status == "active":
        query = query.filter(Product.is_active == True)
    elif status == "inactive":
        query = query.filter(Product.is_active == False)
    
    # Aplicar filtro de busca
    if search:
        search_filter = or_(
            Product.name.ilike(f"%{search}%"),
            Product.sku.ilike(f"%{search}%"),
            Product.description.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Aplicar filtro de status do estoque
    if stock_status == "zerado":
        query = query.filter(Product.stock_quantity == 0)
    elif stock_status == "baixo":
        query = query.filter(Product.stock_quantity <= Product.min_stock, Product.stock_quantity > 0)
    elif stock_status == "normal":
        query = query.filter(Product.stock_quantity > Product.min_stock)
    
    # Aplicar ordenação
    if hasattr(Product, sortBy):
        order_column = getattr(Product, sortBy)
        if sortOrder == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
    
    # Aplicar paginação
    products = query.offset(skip).limit(limit).all()
    
    # Adicionar campos calculados
    products_with_fields = []
    for product in products:
        product_dict = ProductSchema.model_validate(product).model_dump()
        product_dict.update(calculate_product_fields(product))
        products_with_fields.append(ProductSchema(**product_dict))
    
    return products_with_fields


@router.get("/categories", response_model=List[dict])
async def get_active_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_products_view)
):
    """Obter categorias ativas para seleção em produtos"""
    categories = db.query(Category).filter(Category.is_active == True).order_by(Category.name.asc()).all()
    return [{"id": str(category.id), "name": category.name} for category in categories]


@router.post("/", response_model=ProductSchema)
async def create_product(
    request: Request,
    db: Session = Depends(get_db)
):
    """Criar novo produto"""
    try:
        # Obter dados do corpo da requisição
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        
        # Validar dados obrigatórios
        if not data.get('sku') or not data.get('sku').strip():
            raise HTTPException(status_code=400, detail="SKU é obrigatório")
        
        if not data.get('name') or not data.get('name').strip():
            raise HTTPException(status_code=400, detail="Nome do produto é obrigatório")
        
        if not data.get('sale_price') or float(data.get('sale_price', 0)) <= 0:
            raise HTTPException(status_code=400, detail="Preço de venda deve ser maior que zero")
        
        # Verificar se já existe produto com este SKU
        existing_product = db.query(Product).filter(
            func.lower(Product.sku) == func.lower(data['sku'].strip())
        ).first()
        
        if existing_product:
            raise HTTPException(
                status_code=400, 
                detail=f"Já existe um produto com o SKU '{data['sku']}'"
            )
        
        # Criar produto
        product_data = ProductCreate(**data)
        
        product = Product(**product_data.dict())
        
        # Calcular preço de venda automaticamente se configurado
        if (product.margin_type in ['percentage', 'category'] and 
            product.cost_price and product.cost_price > 0):
            
            effective_margin = get_effective_margin_for_product(product, db)
            if effective_margin > 0:
                calculated_price = calculate_sale_price_with_margin(product.cost_price, effective_margin)
                # Só aplica se não foi fornecido preço de venda ou se é menor que o calculado
                if not data.get('sale_price') or calculated_price > product.sale_price:
                    product.sale_price = calculated_price
        
        db.add(product)
        db.commit()
        db.refresh(product)
        
        # Retornar com campos calculados
        product_dict = ProductSchema.model_validate(product).model_dump()
        product_dict.update(calculate_product_fields(product))
        return ProductSchema(**product_dict)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Dados inválidos")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_id}", response_model=ProductSchema)
async def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_products_view)
):
    """Obter produto por ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Adicionar campos calculados
    product_dict = ProductSchema.model_validate(product).model_dump()
    product_dict.update(calculate_product_fields(product))
    return ProductSchema(**product_dict)


@router.put("/{product_id}", response_model=ProductSchema)
async def update_product(
    product_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_products_edit)
):
    """Atualizar produto"""
    try:
        # Buscar produto
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        # Obter dados do corpo da requisição
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        
        # Verificar se o SKU já existe (exceto para o próprio produto)
        if data.get('sku'):
            existing_product = db.query(Product).filter(
                func.lower(Product.sku) == func.lower(data['sku'].strip()),
                Product.id != product_id
            ).first()
            
            if existing_product:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Já existe um produto com o SKU '{data['sku']}'"
                )
        
        # Atualizar campos
        for field, value in data.items():
            if hasattr(product, field):
                setattr(product, field, value)
        
        db.commit()
        db.refresh(product)
        
        # Retornar com campos calculados
        product_dict = ProductSchema.model_validate(product).model_dump()
        product_dict.update(calculate_product_fields(product))
        return ProductSchema(**product_dict)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Dados inválidos")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_products_delete)
):
    """Inativar produto (soft delete)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    if not product.is_active:
        raise HTTPException(status_code=400, detail="Produto já está inativo")
    
    product.is_active = False
    db.commit()
    
    return {"message": "Produto inativado com sucesso"}


@router.patch("/{product_id}/toggle-status")
async def toggle_product_status(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_products_edit)
):
    """Alternar status do produto (ativo/inativo)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    product.is_active = not product.is_active
    db.commit()
    
    status = "ativado" if product.is_active else "inativado"
    return {"message": f"Produto {status} com sucesso"}


@router.post("/calculate-price")
async def calculate_price(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_products_view)
):
    """Calcular preço de venda baseado no custo e margem"""
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        
        cost_price = Decimal(str(data.get('cost_price', 0)))
        margin_percentage = data.get('margin_percentage')
        category_id = data.get('category_id')
        margin_type = data.get('margin_type', 'manual')
        
        if cost_price <= 0:
            raise HTTPException(status_code=400, detail="Preço de custo deve ser maior que zero")
        
        calculated_price = cost_price
        effective_margin = Decimal(0)
        
        # Calcular baseado no tipo de margem
        if margin_type == 'percentage' and margin_percentage:
            effective_margin = Decimal(str(margin_percentage))
            calculated_price = calculate_sale_price_with_margin(cost_price, effective_margin)
        
        elif margin_type == 'category' and category_id:
            category = db.query(Category).filter(Category.id == category_id).first()
            if category and category.default_margin_percentage:
                effective_margin = category.default_margin_percentage
                calculated_price = calculate_sale_price_with_margin(cost_price, effective_margin)
        
        return {
            "cost_price": float(cost_price),
            "sale_price": float(calculated_price),
            "margin_percentage": float(effective_margin),
            "margin_value": float(calculated_price - cost_price),
            "margin_type": margin_type
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Dados inválidos")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))