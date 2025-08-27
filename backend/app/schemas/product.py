from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID
from decimal import Decimal


class ProductBase(BaseModel):
    sku: str = Field(..., description="Código SKU do produto")
    name: str = Field(..., description="Nome do produto")
    description: Optional[str] = Field(None, description="Descrição do produto")
    category_id: Optional[UUID] = Field(None, description="ID da categoria do produto")
    
    # Fiscal - Campos obrigatórios para NF-e SP
    ncm: Optional[str] = Field(None, description="Nomenclatura Comum do Mercosul")
    cfop: Optional[str] = Field(None, description="Código Fiscal de Operações e Prestações")
    cst: Optional[str] = Field(None, description="Código de Situação Tributária")
    
    # Campos adicionais para NF-e
    ean_gtin: Optional[str] = Field(None, description="Código EAN/GTIN (código de barras)")
    unit: Optional[str] = Field("UN", description="Unidade de medida (UN, KG, L, etc.)")
    origin: Optional[str] = Field("0", description="Origem da mercadoria (0-Nacional, 1-Estrangeira)")
    
    # ICMS detalhado
    icms_cst: Optional[str] = Field(None, description="CST do ICMS")
    icms_base_calc: Optional[Decimal] = Field(0, ge=0, description="Base de cálculo ICMS")
    icms_reduction: Optional[Decimal] = Field(0, ge=0, le=100, description="Redução da base ICMS (%)")
    
    # IPI
    ipi_cst: Optional[str] = Field(None, description="CST do IPI")
    ipi_rate: Optional[Decimal] = Field(0, ge=0, le=100, description="Alíquota IPI (%)")
    
    # PIS/COFINS detalhado
    pis_cst: Optional[str] = Field(None, description="CST do PIS")
    cofins_cst: Optional[str] = Field(None, description="CST do COFINS")
    
    # Preços e margem
    cost_price: Optional[Decimal] = Field(0, ge=0, description="Preço de custo")
    sale_price: Decimal = Field(..., gt=0, description="Preço de venda")
    
    # Sistema de margem de lucro
    margin_type: Optional[str] = Field("manual", description="Tipo de margem: manual, percentage, category")
    margin_percentage: Optional[Decimal] = Field(None, ge=0, le=1000, description="Margem específica do produto (%)")
    use_category_margin: Optional[bool] = Field(False, description="Se deve usar margem da categoria")
    
    # Estoque
    stock_quantity: Optional[int] = Field(0, ge=0, description="Quantidade em estoque")
    min_stock: Optional[int] = Field(0, ge=0, description="Estoque mínimo")
    
    # Impostos (percentuais) - mantidos para compatibilidade
    icms_rate: Optional[Decimal] = Field(0, ge=0, le=100, description="Alíquota ICMS (%)")
    pis_rate: Optional[Decimal] = Field(0, ge=0, le=100, description="Alíquota PIS (%)")
    cofins_rate: Optional[Decimal] = Field(0, ge=0, le=100, description="Alíquota COFINS (%)")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    
    # Fiscal
    ncm: Optional[str] = None
    cfop: Optional[str] = None
    cst: Optional[str] = None
    ean_gtin: Optional[str] = None
    unit: Optional[str] = None
    origin: Optional[str] = None
    
    # ICMS detalhado
    icms_cst: Optional[str] = None
    icms_base_calc: Optional[Decimal] = None
    icms_reduction: Optional[Decimal] = None
    
    # IPI
    ipi_cst: Optional[str] = None
    ipi_rate: Optional[Decimal] = None
    
    # PIS/COFINS detalhado
    pis_cst: Optional[str] = None
    cofins_cst: Optional[str] = None
    
    # Preços e margem
    cost_price: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None
    margin_type: Optional[str] = None
    margin_percentage: Optional[Decimal] = None
    use_category_margin: Optional[bool] = None
    
    # Estoque
    stock_quantity: Optional[int] = None
    min_stock: Optional[int] = None
    
    # Impostos (mantidos para compatibilidade)
    icms_rate: Optional[Decimal] = None
    pis_rate: Optional[Decimal] = None
    cofins_rate: Optional[Decimal] = None


class Product(ProductBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Informações da categoria (se existir)
    category_name: Optional[str] = Field(None, description="Nome da categoria")
    
    # Campos calculados
    margin_percentage: Optional[float] = Field(None, description="Margem percentual calculada")
    margin_value: Optional[Decimal] = Field(None, description="Margem em valor calculada")
    stock_status: str = Field("", description="Status do estoque (normal, baixo, zerado)")

    class Config:
        from_attributes = True