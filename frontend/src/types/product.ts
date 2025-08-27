export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  
  // Fiscal - Campos obrigatórios para NF-e SP
  ncm?: string;
  cfop?: string;
  cst?: string;
  
  // Campos adicionais para NF-e
  ean_gtin?: string;
  barcode?: string;  // Código de barras
  unit?: string;
  origin?: string;
  
  // ICMS detalhado
  icms_cst?: string;
  icms_base_calc?: number;
  icms_reduction?: number;
  
  // IPI
  ipi_cst?: string;
  ipi_rate?: number;
  
  // PIS/COFINS detalhado
  pis_cst?: string;
  cofins_cst?: string;
  
  // Preços e margem
  cost_price?: number;
  price?: number;  // Alias para sale_price (compatibilidade)
  sale_price: number;
  
  // Sistema de margem de lucro
  margin_type?: 'manual' | 'percentage' | 'category';
  margin_percentage?: number;
  use_category_margin?: boolean;
  
  // Estoque
  stock_quantity?: number;
  stock?: number;  // Alias para stock_quantity (compatibilidade)
  min_stock?: number;
  
  // Impostos (percentuais) - mantidos para compatibilidade
  icms_rate?: number;
  pis_rate?: number;
  cofins_rate?: number;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Campos calculados
  margin_value?: number;
  stock_status: string;
  
  // Relacionamentos
  category?: {
    id: string;
    name: string;
  };
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  
  // Fiscal
  ncm?: string;
  cfop?: string;
  cst?: string;
  ean_gtin?: string;
  unit?: string;
  origin?: string;
  
  // ICMS detalhado
  icms_cst?: string;
  icms_base_calc?: number;
  icms_reduction?: number;
  
  // IPI
  ipi_cst?: string;
  ipi_rate?: number;
  
  // PIS/COFINS detalhado
  pis_cst?: string;
  cofins_cst?: string;
  
  // Preços e margem
  cost_price?: number;
  sale_price: number;
  margin_type?: 'manual' | 'percentage' | 'category';
  margin_percentage?: number;
  use_category_margin?: boolean;
  
  // Estoque
  stock_quantity?: number;
  min_stock?: number;
  
  // Impostos (compatibilidade)
  icms_rate?: number;
  pis_rate?: number;
  cofins_rate?: number;
}

export interface Category {
  id: string;
  name: string;
  default_margin_percentage?: number;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface ProductFilters {
  search: string;
  status: 'active' | 'inactive' | 'all';
  stock_status?: 'normal' | 'baixo' | 'zerado' | 'all';
}

export type StockStatus = 'normal' | 'baixo' | 'zerado';

export interface ProductFormData extends CreateProductRequest {
  // Campos adicionais para o formulário se necessário
}

export interface PriceCalculationRequest {
  cost_price: number;
  margin_percentage?: number;
  category_id?: string;
  margin_type: 'manual' | 'percentage' | 'category';
}

export interface PriceCalculationResponse {
  cost_price: number;
  sale_price: number;
  margin_percentage: number;
  margin_value: number;
  margin_type: string;
}