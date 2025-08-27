"""
Rotas da API para módulo de estoque
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.services.stock_service import StockService
from app.schemas.response import APIResponse

router = APIRouter(prefix="/stock", tags=["Estoque"])

# ===== MODELS =====

class StockEntryItemModel(BaseModel):
    product_id: UUID
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    unit_cost: Optional[float] = None
    batch: Optional[str] = None
    expiration_date: Optional[date] = None
    nfe_product_code: Optional[str] = None
    nfe_description: Optional[str] = None

class StockEntryCreateModel(BaseModel):
    supplier_id: UUID
    purchase_order_id: Optional[UUID] = None
    nfe_number: Optional[str] = None
    nfe_series: Optional[str] = None
    nfe_access_key: Optional[str] = None
    nfe_issue_date: Optional[date] = None
    nfe_total_value: Optional[float] = None
    received_date: Optional[datetime] = None
    entry_type: Optional[str] = Field("compra", pattern="^(compra|devolucao|transferencia|ajuste|consignacao|brinde)$")
    notes: Optional[str] = None
    items: List[StockEntryItemModel]

class StockMovementModel(BaseModel):
    product_id: UUID
    movement_type: str = Field(..., pattern="^(entrada_ajuste|saida_ajuste|saida_perda|saida_uso_interno|entrada_devolucao|saida_devolucao)$")
    quantity: float = Field(..., gt=0)
    unit_cost: Optional[float] = Field(0, ge=0)
    reason: Optional[str] = None
    notes: Optional[str] = None

# ===== ENTRADAS DE ESTOQUE =====

@router.post("/entries", response_model=APIResponse)
async def create_stock_entry(
    entry_data: StockEntryCreateModel,
    current_user: dict = Depends(get_current_user)
):
    """Criar nova entrada de estoque"""
    try:
        service = StockService()
        user_id = UUID(current_user["user"]["id"])
        
        # Converter items para formato esperado
        items_data = []
        for item in entry_data.items:
            items_data.append({
                'product_id': str(item.product_id),
                'quantity': item.quantity,
                'unit_price': item.unit_price,
                'unit_cost': item.unit_cost or item.unit_price,
                'batch': item.batch,
                'expiration_date': item.expiration_date,
                'nfe_product_code': item.nfe_product_code,
                'nfe_description': item.nfe_description
            })
        
        entry_dict = {
            'supplier_id': str(entry_data.supplier_id),
            'purchase_order_id': str(entry_data.purchase_order_id) if entry_data.purchase_order_id else None,
            'nfe_number': entry_data.nfe_number,
            'nfe_series': entry_data.nfe_series,
            'nfe_access_key': entry_data.nfe_access_key,
            'nfe_issue_date': entry_data.nfe_issue_date,
            'nfe_total_value': entry_data.nfe_total_value,
            'received_date': entry_data.received_date,
            'entry_type': entry_data.entry_type,
            'notes': entry_data.notes,
            'items': items_data
        }
        
        return await service.create_stock_entry(entry_dict, user_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/entries/{entry_id}/process", response_model=APIResponse)
async def process_stock_entry(
    entry_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Processar entrada de estoque (dar baixa efetiva)"""
    try:
        service = StockService()
        user_id = UUID(current_user["user"]["id"])
        
        return await service.process_stock_entry(entry_id, user_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import-nfe", response_model=APIResponse)
async def import_nfe_xml(
    supplier_id: UUID = Query(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Importar dados de NFe a partir do XML"""
    try:
        service = StockService()
        user_id = UUID(current_user["user"]["id"])
        
        # Ler conteúdo do arquivo XML
        xml_content = await file.read()
        xml_string = xml_content.decode('utf-8')
        
        return await service.import_nfe_xml(xml_string, supplier_id, user_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== MOVIMENTAÇÕES =====

@router.post("/movements", response_model=APIResponse)
async def create_stock_movement(
    movement_data: StockMovementModel,
    current_user: dict = Depends(get_current_user)
):
    """Criar movimentação de estoque manual"""
    try:
        service = StockService()
        user_id = UUID(current_user["user"]["id"])
        
        movement_dict = {
            'product_id': str(movement_data.product_id),
            'movement_type': movement_data.movement_type,
            'quantity': movement_data.quantity,
            'unit_cost': movement_data.unit_cost,
            'reason': movement_data.reason,
            'notes': movement_data.notes
        }
        
        return await service.create_stock_movement(movement_dict, user_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movements", response_model=APIResponse)
async def get_stock_movements(
    product_id: Optional[UUID] = Query(None),
    movement_type: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Buscar histórico de movimentações"""
    try:
        service = StockService()
        
        filters = {
            'limit': limit,
            'offset': offset
        }
        
        if product_id:
            filters['product_id'] = str(product_id)
        if movement_type:
            filters['movement_type'] = movement_type
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        
        return await service.get_stock_movements(filters)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== CONSULTA DE ESTOQUE =====

@router.get("/current", response_model=APIResponse)
async def get_current_stock(
    product_id: Optional[UUID] = Query(None),
    category_id: Optional[UUID] = Query(None),
    low_stock_only: bool = Query(False),
    zero_stock_only: bool = Query(False),
    negative_stock_only: bool = Query(False),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Buscar situação atual do estoque"""
    try:
        service = StockService()
        
        filters = {
            'limit': limit,
            'offset': offset
        }
        
        if product_id:
            filters['product_id'] = str(product_id)
        if category_id:
            filters['category_id'] = str(category_id)
        if low_stock_only:
            filters['low_stock_only'] = True
        if zero_stock_only:
            filters['zero_stock_only'] = True
        if negative_stock_only:
            filters['negative_stock_only'] = True
        
        return await service.get_stock_current(filters)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/product/{product_id}", response_model=APIResponse)
async def get_product_stock_details(
    product_id: UUID,
    include_movements: bool = Query(False),
    movements_limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Buscar detalhes completos do estoque de um produto"""
    try:
        service = StockService()
        
        # Buscar estoque atual
        stock_response = await service.get_stock_current({'product_id': str(product_id)})
        
        if not stock_response.success or not stock_response.data:
            raise HTTPException(status_code=404, detail="Produto não encontrado no estoque")
        
        result_data = stock_response.data[0]
        
        # Incluir movimentações se solicitado
        if include_movements:
            movements_response = await service.get_stock_movements({
                'product_id': str(product_id),
                'limit': movements_limit,
                'offset': 0
            })
            
            if movements_response.success:
                result_data['recent_movements'] = movements_response.data
        
        return APIResponse(
            success=True,
            data=result_data,
            message="Detalhes do estoque do produto"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== RELATÓRIOS =====

@router.get("/reports/low-stock", response_model=APIResponse)
async def get_low_stock_report(
    current_user: dict = Depends(get_current_user)
):
    """Relatório de produtos com estoque baixo"""
    try:
        service = StockService()
        
        return await service.get_stock_current({'low_stock_only': True, 'limit': 500})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/valuation", response_model=APIResponse)
async def get_stock_valuation_report(
    category_id: Optional[UUID] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Relatório de valorização de estoque"""
    try:
        service = StockService()
        
        filters = {'limit': 1000}
        if category_id:
            filters['category_id'] = str(category_id)
        
        stock_response = await service.get_stock_current(filters)
        
        if stock_response.success:
            # Calcular totais
            total_value = sum(item['cost']['stock_value'] for item in stock_response.data)
            total_products = len(stock_response.data)
            total_quantity = sum(item['stock']['total'] for item in stock_response.data)
            
            # Agrupar por categoria
            categories = {}
            for item in stock_response.data:
                category = item.get('category', 'Sem categoria')
                if category not in categories:
                    categories[category] = {
                        'category_name': category,
                        'products_count': 0,
                        'total_quantity': 0,
                        'total_value': 0
                    }
                
                categories[category]['products_count'] += 1
                categories[category]['total_quantity'] += item['stock']['total']
                categories[category]['total_value'] += item['cost']['stock_value']
            
            return APIResponse(
                success=True,
                data={
                    'summary': {
                        'total_products': total_products,
                        'total_quantity': total_quantity,
                        'total_value': total_value
                    },
                    'by_category': list(categories.values()),
                    'products': stock_response.data
                },
                message="Relatório de valorização de estoque"
            )
        
        return stock_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/movements-summary", response_model=APIResponse)
async def get_movements_summary(
    date_from: date = Query(...),
    date_to: date = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Resumo de movimentações por período"""
    try:
        service = StockService()
        
        movements_response = await service.get_stock_movements({
            'date_from': date_from,
            'date_to': date_to,
            'limit': 1000
        })
        
        if movements_response.success:
            movements = movements_response.data
            
            # Agrupar por tipo de movimentação
            summary = {}
            for movement in movements:
                mov_type = movement['movement']['type']
                quantity = abs(movement['movement']['movement_quantity'])
                value = movement['cost']['total_value']
                
                if mov_type not in summary:
                    summary[mov_type] = {
                        'movement_type': mov_type,
                        'count': 0,
                        'total_quantity': 0,
                        'total_value': 0
                    }
                
                summary[mov_type]['count'] += 1
                summary[mov_type]['total_quantity'] += quantity
                summary[mov_type]['total_value'] += value
            
            return APIResponse(
                success=True,
                data={
                    'period': {
                        'from': date_from.isoformat(),
                        'to': date_to.isoformat()
                    },
                    'summary_by_type': list(summary.values()),
                    'total_movements': len(movements)
                },
                message="Resumo de movimentações"
            )
        
        return movements_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))