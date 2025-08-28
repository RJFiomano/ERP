export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'financeiro' | 'vendas' | 'estoque' | 'leitura';
  role_id?: string;
  role_name?: string;
  permissions?: string[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
}