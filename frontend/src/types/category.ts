export interface Category {
  id: string;
  name: string;
  description?: string;
  default_margin_percentage?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  default_margin_percentage?: number;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CategoryFilters {
  search: string;
  status: 'active' | 'inactive' | 'all';
}