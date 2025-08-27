from sqlalchemy import Column, String, Boolean, Numeric, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class Product(BaseModel):
    __tablename__ = "products"
    
    sku = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String(1000))
    
    # Relacionamento com categoria
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'), nullable=True)
    category = relationship("Category", back_populates="products")
    
    # Fiscal - Campos obrigatórios para NF-e SP
    ncm = Column(String(20))  # Nomenclatura Comum do Mercosul
    cfop = Column(String(10))  # Código Fiscal de Operações e Prestações
    cst = Column(String(10))   # Código de Situação Tributária
    
    # Campos adicionais para NF-e
    ean_gtin = Column(String(14))  # Código EAN/GTIN (código de barras)
    unit = Column(String(10), default='UN')  # Unidade de medida (UN, KG, L, etc.)
    origin = Column(String(1), default='0')  # Origem da mercadoria (0-Nacional, 1-Estrangeira, etc.)
    
    # ICMS detalhado
    icms_cst = Column(String(3))  # CST do ICMS
    icms_base_calc = Column(Numeric(10, 2), default=0)  # Base de cálculo ICMS
    icms_reduction = Column(Numeric(5, 2), default=0)  # Redução da base ICMS
    
    # IPI
    ipi_cst = Column(String(3))  # CST do IPI
    ipi_rate = Column(Numeric(5, 2), default=0)  # Alíquota IPI
    
    # PIS/COFINS detalhado
    pis_cst = Column(String(3))  # CST do PIS
    cofins_cst = Column(String(3))  # CST do COFINS
    
    # Preços e margem
    cost_price = Column(Numeric(10, 2), default=0)
    sale_price = Column(Numeric(10, 2), nullable=False)
    
    # Sistema de margem de lucro
    margin_type = Column(String(20), default='manual')  # 'manual', 'percentage', 'category'
    margin_percentage = Column(Numeric(5, 2))  # Margem específica do produto (%)
    use_category_margin = Column(Boolean, default=False)  # Se deve usar margem da categoria
    
    # Estoque
    stock_quantity = Column(Integer, default=0)
    min_stock = Column(Integer, default=0)
    
    # Impostos (percentuais) - mantidos para compatibilidade
    icms_rate = Column(Numeric(5, 2), default=0)
    pis_rate = Column(Numeric(5, 2), default=0)
    cofins_rate = Column(Numeric(5, 2), default=0)
    
    is_active = Column(Boolean, default=True)