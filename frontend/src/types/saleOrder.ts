export enum SaleOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed', 
  INVOICED = 'invoiced',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CASH = 'cash',
  INSTALLMENTS_2X = 'installments_2x',
  INSTALLMENTS_3X = 'installments_3x', 
  INSTALLMENTS_4X = 'installments_4x',
  INSTALLMENTS_6X = 'installments_6x',
  INSTALLMENTS_12X = 'installments_12x',
  CREDIT_30 = 'credit_30',
  CREDIT_60 = 'credit_60'
}

export interface SaleOrderItem {
  id?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  product_unit?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  gross_total?: number;
  net_total?: number;
  icms_rate?: number;
  pis_rate?: number;
  cofins_rate?: number;
  icms_amount?: number;
  pis_amount?: number;
  cofins_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SaleOrder {
  id: string;
  number: string;
  order_date: string;
  delivery_date?: string;
  status: SaleOrderStatus;
  client_id: string;
  client_name?: string;
  client_document?: string;
  payment_method: PaymentMethod;
  
  // Valores
  subtotal: number;
  discount_percent?: number;
  discount_amount?: number;
  icms_total: number;
  pis_total: number;
  cofins_total: number;
  tax_total: number;
  total_amount: number;
  
  // Observações
  notes?: string;
  internal_notes?: string;
  delivery_address?: string;
  seller_name?: string;
  
  // Itens
  items: SaleOrderItem[];
  items_count?: number;
  
  // Controle
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSaleOrderRequest {
  client_id: string;
  delivery_date?: string;
  payment_method?: PaymentMethod;
  discount_percent?: number;
  discount_amount?: number;
  notes?: string;
  internal_notes?: string;
  delivery_address?: string;
  seller_name?: string;
  items: SaleOrderItemCreate[];
}

export interface SaleOrderItemCreate {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
}

export interface UpdateSaleOrderRequest extends Partial<CreateSaleOrderRequest> {}

export interface SaleOrderStatusUpdate {
  status: SaleOrderStatus;
}

export interface SaleOrderFilters {
  search: string;
  status: SaleOrderStatus | '';
  client_id: string;
}

export interface TaxSimulation {
  gross_amount: number;
  taxes: {
    icms: { rate: number; amount: number };
    pis: { rate: number; amount: number };
    cofins: { rate: number; amount: number };
  };
  total_taxes: number;
  net_amount: number;
  effective_tax_rate: number;
}

export interface SaleOrderStats {
  total_orders: number;
  total_value: number;
  orders_by_status: { [key: string]: number };
  avg_order_value: number;
  orders_this_month: number;
  value_this_month: number;
}

// Utilitários para labels
export const SALE_ORDER_STATUS_LABELS = {
  [SaleOrderStatus.DRAFT]: 'Rascunho',
  [SaleOrderStatus.CONFIRMED]: 'Confirmado',
  [SaleOrderStatus.INVOICED]: 'Faturado',
  [SaleOrderStatus.CANCELLED]: 'Cancelado'
};

export const PAYMENT_METHOD_LABELS = {
  [PaymentMethod.CASH]: 'À Vista',
  [PaymentMethod.INSTALLMENTS_2X]: '2x sem juros',
  [PaymentMethod.INSTALLMENTS_3X]: '3x sem juros',
  [PaymentMethod.INSTALLMENTS_4X]: '4x sem juros',
  [PaymentMethod.INSTALLMENTS_6X]: '6x sem juros',
  [PaymentMethod.INSTALLMENTS_12X]: '12x com juros',
  [PaymentMethod.CREDIT_30]: 'Prazo 30 dias',
  [PaymentMethod.CREDIT_60]: 'Prazo 60 dias'
};

// Cores dos status
export const SALE_ORDER_STATUS_COLORS = {
  [SaleOrderStatus.DRAFT]: 'default',
  [SaleOrderStatus.CONFIRMED]: 'info',
  [SaleOrderStatus.INVOICED]: 'success',
  [SaleOrderStatus.CANCELLED]: 'error'
} as const;