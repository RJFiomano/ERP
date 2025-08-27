export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface Client {
  id: string;
  name: string;
  person_type: 'PF' | 'PJ';
  document: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
}

export interface Sale {
  id: string;
  number: string;
  client_id: string;
  sale_date: string;
  status: 'draft' | 'confirmed' | 'invoiced' | 'cancelled';
  subtotal: number;
  tax_total: number;
  total: number;
  notes?: string;
}