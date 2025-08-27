export interface PurchaseOrder {
  id: string;
  numero_pedido: string;
  supplier_id: string;
  supplier_name?: string;
  data_pedido: string;
  data_entrega_prevista?: string;
  subtotal: number;
  valor_total: number;
  status: 'rascunho' | 'enviado' | 'confirmado' | 'parcial' | 'recebido' | 'cancelado';
  forma_pagamento: string;
  urgencia: 'baixa' | 'normal' | 'alta' | 'critica';
  local_entrega?: string;
  observacoes?: string;
  items?: PurchaseOrderItem[];
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual?: number;
  valor_total_item: number;
  observacoes_item?: string;
  status_item: 'pendente' | 'parcial' | 'recebido' | 'cancelado';
}

export interface PurchaseOrderCreate {
  supplier_id: string;
  delivery_date?: string;
  payment_terms?: string;
  delivery_location?: string;
  notes?: string;
  urgency?: 'baixa' | 'normal' | 'alta' | 'critica';
  status?: 'rascunho' | 'enviado' | 'confirmado' | 'parcial' | 'recebido' | 'cancelado';
  items: PurchaseOrderItemCreate[];
}

export interface PurchaseOrderItemCreate {
  product_id: string;
  quantity: number;
  notes?: string;
}

export interface StockEntry {
  id: string;
  numero_entrada: string;
  supplier_id: string;
  supplier_name?: string;
  pedido_id?: string;
  nfe_numero?: string;
  nfe_serie?: string;
  nfe_chave_acesso?: string;
  data_recebimento: string;
  total_produtos: number;
  status: 'pendente' | 'conferido' | 'lancado' | 'cancelado';
  items?: StockEntryItem[];
  created_at: string;
}

export interface StockEntryItem {
  id: string;
  product_id: string;
  product_name?: string;
  quantidade_nota: number;
  quantidade_recebida: number;
  preco_unitario: number;
  custo_unitario?: number;
  lote?: string;
  data_validade?: string;
  nfe_produto_codigo?: string;
  nfe_descricao?: string;
}

export interface StockEntryCreate {
  supplier_id: string;
  purchase_order_id?: string;
  nfe_number?: string;
  nfe_series?: string;
  nfe_access_key?: string;
  nfe_issue_date?: string;
  nfe_total_value?: number;
  received_date?: string;
  entry_type?: 'compra' | 'devolucao' | 'transferencia' | 'ajuste' | 'consignacao' | 'brinde';
  notes?: string;
  items: StockEntryItemCreate[];
}

export interface StockEntryItemCreate {
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  batch?: string;
  expiration_date?: string;
  nfe_product_code?: string;
  nfe_description?: string;
}

export interface AccountPayable {
  id: string;
  numero_conta: string;
  supplier_id: string;
  supplier_name?: string;
  documento_numero: string;
  data_emissao: string;
  data_vencimento_original: string;
  valor_original: number;
  valor_pago: number;
  valor_em_aberto: number;
  status: 'em_aberto' | 'pago_parcial' | 'pago' | 'cancelado' | 'contestado';
  forma_pagamento: string;
  descricao: string;
  installments?: AccountPayableInstallment[];
  created_at: string;
}

export interface AccountPayableInstallment {
  id: string;
  numero_parcela: number;
  valor_parcela: number;
  valor_pago: number;
  data_vencimento: string;
  status: 'em_aberto' | 'pago_parcial' | 'pago' | 'vencido' | 'cancelado';
  dias_atraso: number;
}

export interface AccountPayableCreate {
  supplier_id: string;
  stock_entry_id?: string;
  purchase_order_id?: string;
  document_type?: string;
  document_number: string;
  document_series?: string;
  document_key?: string;
  document_value: number;
  issue_date: string;
  due_date: string;
  original_value: number;
  discount_value?: number;
  additional_value?: number;
  payment_method?: string;
  payment_terms?: string;
  installments?: number;
  installment_interval?: number;
  description: string;
  notes?: string;
  account_category?: string;
  cost_center?: string;
}

export interface CurrentStock {
  product_id: string;
  product_name: string;
  barcode?: string;
  sale_price: number;
  stock: {
    available: number;
    reserved: number;
    total: number;
  };
  cost: {
    average_cost: number;
    stock_value: number;
  };
  limits: {
    minimum: number;
    maximum: number;
    reorder_point: number;
  };
  alerts: {
    needs_restock: boolean;
    zero_stock: boolean;
    negative_stock: boolean;
  };
  category?: string;
  margin_percentage: number;
}

export interface StockMovement {
  id: string;
  product: {
    id: string;
    name: string;
    barcode?: string;
  };
  movement: {
    type: string;
    previous_quantity: number;
    movement_quantity: number;
    current_quantity: number;
  };
  cost: {
    unit_cost: number;
    total_value: number;
  };
  date: string;
  notes?: string;
  reason?: string;
  batch?: string;
  expiration_date?: string;
  user?: string;
  entry_number?: string;
}