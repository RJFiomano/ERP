export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  role_id?: string;
  role_name?: string;
  permissions?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: string;
  role_id?: string;
  role_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: string;
  role_id?: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
  role_id?: string;
  is_active?: boolean;
}

export interface UserPermissions {
  user_id: string;
  user_name: string;
  role_id?: string;
  role_name?: string;
  permissions: string[];
}

export interface UserFilters {
  search: string;
  role: string;
  status: 'all' | 'active' | 'inactive';
}