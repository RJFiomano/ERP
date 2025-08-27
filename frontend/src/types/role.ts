export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions: Permission[];
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permission_ids?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  permission_ids?: string[];
}

export interface CreatePermissionRequest {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  resource?: string;
  action?: string;
  description?: string;
  is_active?: boolean;
}

export interface UserRoleInfo {
  role_id?: string;
  role_name?: string;
  permissions: string[];
}

export interface RoleFilters {
  search: string;
  status: 'active' | 'inactive' | 'all';
}

export interface PermissionFilters {
  search: string;
  resource?: string;
  action?: string;
  status: 'active' | 'inactive' | 'all';
}