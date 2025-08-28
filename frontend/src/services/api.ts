import axios, { AxiosError } from 'axios';
import { LoginRequest, LoginResponse } from '@/types/auth';
import { Client, CreateClientRequest, UpdateClientRequest } from '@/types/client';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '@/types/supplier';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/category';
import { Product, CreateProductRequest, UpdateProductRequest, Category as ProductCategory } from '@/types/product';
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest, CreatePermissionRequest, UpdatePermissionRequest, UserRoleInfo } from '@/types/role';
import { User, UserListItem, CreateUserRequest, UpdateUserRequest, UserPermissions } from '@/types/user';
import { Phone, Address, PhoneCreate, PhoneUpdate, AddressCreate, AddressUpdate } from '@/types/contact';
import { SaleOrder, CreateSaleOrderRequest, UpdateSaleOrderRequest, SaleOrderStatusUpdate, SaleOrderFilters, TaxSimulation, SaleOrderStats } from '@/types/saleOrder';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor para lidar com token expirado
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest) {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token também expirou
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else {
        // Sem refresh token, redirecionar para login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  getDashboard: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },
};

// Clients API
export const clientsAPI = {
  getClients: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    personType?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<Client[]> => {
    const response = await api.get('/clients/', { params });
    return response.data;
  },

  createClient: async (data: CreateClientRequest): Promise<Client> => {
    const response = await api.post('/clients/', data);
    return response.data;
  },

  getClient: async (id: string): Promise<Client> => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  updateClient: async (id: string, data: UpdateClientRequest): Promise<Client> => {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
  },

  deleteClient: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`);
  },

  toggleClientStatus: async (id: string): Promise<void> => {
    await api.patch(`/clients/${id}/toggle-status`);
  },
};

// Suppliers API
export const suppliersAPI = {
  getSuppliers: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    personType?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<Supplier[]> => {
    const response = await api.get('/suppliers/', { params });
    return response.data;
  },

  createSupplier: async (data: CreateSupplierRequest): Promise<Supplier> => {
    const response = await api.post('/suppliers/', data);
    return response.data;
  },

  getSupplier: async (id: string): Promise<Supplier> => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  },

  updateSupplier: async (id: string, data: UpdateSupplierRequest): Promise<Supplier> => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data;
  },

  deleteSupplier: async (id: string): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },

  toggleSupplierStatus: async (id: string): Promise<void> => {
    await api.patch(`/suppliers/${id}/toggle-status`);
  },
};

// Categories API
export const categoriesAPI = {
  getCategories: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<Category[]> => {
    const response = await api.get('/categories/', { params });
    return response.data;
  },

  createCategory: async (data: CreateCategoryRequest): Promise<Category> => {
    const response = await api.post('/categories/', data);
    return response.data;
  },

  getCategory: async (id: string): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  updateCategory: async (id: string, data: UpdateCategoryRequest): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },

  toggleCategoryStatus: async (id: string): Promise<void> => {
    await api.patch(`/categories/${id}/toggle-status`);
  },
};

// Products API
export const productsAPI = {
  getProducts: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    stock_status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<Product[]> => {
    const response = await api.get('/products/', { params });
    return response.data;
  },

  searchProducts: async (search: string): Promise<Product[]> => {
    const response = await api.get('/products/', {
      params: { 
        search,
        limit: 50,
        status: 'active'
      }
    });
    return response.data;
  },

  searchByBarcode: async (barcode: string): Promise<Product | null> => {
    try {
      const response = await api.get('/products/', {
        params: { 
          search: barcode,
          limit: 1
        }
      });
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      return null;
    }
  },

  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const response = await api.post('/products/', data);
    return response.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  updateProduct: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  toggleProductStatus: async (id: string): Promise<void> => {
    await api.patch(`/products/${id}/toggle-status`);
  },

  getProductCategories: async (): Promise<ProductCategory[]> => {
    const response = await api.get('/products/categories');
    return response.data;
  },
  
  calculatePrice: async (data: import('@/types/product').PriceCalculationRequest): Promise<import('@/types/product').PriceCalculationResponse> => {
    const response = await api.post('/products/calculate-price', data);
    return response.data;
  },
};

// Roles API
export const rolesAPI = {
  getRoles: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<Role[]> => {
    const response = await api.get('/roles/', { params });
    return response.data;
  },

  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    const response = await api.post('/roles/', data);
    return response.data;
  },

  getRole: async (id: string): Promise<Role> => {
    const response = await api.get(`/roles/${id}`);
    return response.data;
  },

  updateRole: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
    const response = await api.put(`/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },

  getMyPermissions: async (): Promise<UserRoleInfo> => {
    const response = await api.get('/roles/me/permissions');
    return response.data;
  },
};

// Permissions API  
export const permissionsAPI = {
  getPermissions: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    resource?: string;
    action?: string;
    status?: string;
  }): Promise<Permission[]> => {
    const response = await api.get('/permissions/', { params });
    return response.data;
  },

  createPermission: async (data: CreatePermissionRequest): Promise<Permission> => {
    const response = await api.post('/permissions/', data);
    return response.data;
  },

  getPermission: async (id: string): Promise<Permission> => {
    const response = await api.get(`/permissions/${id}`);
    return response.data;
  },

  updatePermission: async (id: string, data: UpdatePermissionRequest): Promise<Permission> => {
    const response = await api.put(`/permissions/${id}`, data);
    return response.data;
  },

  deletePermission: async (id: string): Promise<void> => {
    await api.delete(`/permissions/${id}`);
  },

  getResources: async (): Promise<string[]> => {
    const response = await api.get('/permissions/resources');
    return response.data;
  },

  getActions: async (): Promise<string[]> => {
    const response = await api.get('/permissions/actions');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getUsers: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<UserListItem[]> => {
    const response = await api.get('/users/', { params });
    return response.data;
  },

  createUser: async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post('/users/', data);
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  toggleUserStatus: async (id: string): Promise<void> => {
    await api.patch(`/users/${id}/toggle-status`);
  },

  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: {
    name?: string;
    email?: string;
    current_password?: string;
    new_password?: string;
    confirm_password?: string;
  }) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  getUserPermissions: async (id: string): Promise<UserPermissions> => {
    const response = await api.get(`/users/${id}/permissions`);
    return response.data;
  },
};

// Contacts API
export const contactsAPI = {
  // Client Phones
  getClientPhones: async (clientId: string): Promise<Phone[]> => {
    const response = await api.get(`/contacts/clients/${clientId}/phones`);
    return response.data;
  },

  createClientPhone: async (clientId: string, data: PhoneCreate): Promise<Phone> => {
    const response = await api.post(`/contacts/clients/${clientId}/phones`, data);
    return response.data;
  },

  updatePhone: async (phoneId: string, data: PhoneUpdate): Promise<Phone> => {
    const response = await api.put(`/contacts/phones/${phoneId}`, data);
    return response.data;
  },

  deletePhone: async (phoneId: string): Promise<void> => {
    await api.delete(`/contacts/phones/${phoneId}`);
  },

  // Supplier Phones
  getSupplierPhones: async (supplierId: string): Promise<Phone[]> => {
    const response = await api.get(`/contacts/suppliers/${supplierId}/phones`);
    return response.data;
  },

  createSupplierPhone: async (supplierId: string, data: PhoneCreate): Promise<Phone> => {
    const response = await api.post(`/contacts/suppliers/${supplierId}/phones`, data);
    return response.data;
  },

  // Client Addresses
  getClientAddresses: async (clientId: string): Promise<Address[]> => {
    const response = await api.get(`/contacts/clients/${clientId}/addresses`);
    return response.data;
  },

  createClientAddress: async (clientId: string, data: AddressCreate): Promise<Address> => {
    const response = await api.post(`/contacts/clients/${clientId}/addresses`, data);
    return response.data;
  },

  updateAddress: async (addressId: string, data: AddressUpdate): Promise<Address> => {
    const response = await api.put(`/contacts/addresses/${addressId}`, data);
    return response.data;
  },

  deleteAddress: async (addressId: string): Promise<void> => {
    await api.delete(`/contacts/addresses/${addressId}`);
  },

  // Supplier Addresses
  getSupplierAddresses: async (supplierId: string): Promise<Address[]> => {
    const response = await api.get(`/contacts/suppliers/${supplierId}/addresses`);
    return response.data;
  },

  createSupplierAddress: async (supplierId: string, data: AddressCreate): Promise<Address> => {
    const response = await api.post(`/contacts/suppliers/${supplierId}/addresses`, data);
    return response.data;
  },
};

// Sale Orders API
export const saleOrdersAPI = {
  getSaleOrders: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
    client_id?: string;
    search?: string;
  }): Promise<SaleOrder[]> => {
    const response = await api.get('/sale-orders/', { params });
    return response.data;
  },

  getSaleOrder: async (id: string): Promise<SaleOrder> => {
    const response = await api.get(`/sale-orders/${id}`);
    return response.data;
  },

  createSaleOrder: async (data: CreateSaleOrderRequest): Promise<SaleOrder> => {
    const response = await api.post('/sale-orders/', data);
    return response.data;
  },

  updateSaleOrder: async (id: string, data: UpdateSaleOrderRequest): Promise<SaleOrder> => {
    const response = await api.put(`/sale-orders/${id}`, data);
    return response.data;
  },

  updateSaleOrderStatus: async (id: string, data: SaleOrderStatusUpdate): Promise<{ message: string }> => {
    const response = await api.patch(`/sale-orders/${id}/status`, data);
    return response.data;
  },

  deleteSaleOrder: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/sale-orders/${id}`);
    return response.data;
  },

  getSaleOrderStats: async (): Promise<SaleOrderStats> => {
    const response = await api.get('/sale-orders/stats/summary');
    return response.data;
  },

  simulateTaxes: async (data: {
    product_id: string;
    quantity: number;
    unit_price: number;
    client_id?: string;
  }): Promise<TaxSimulation> => {
    const response = await api.post('/sale-orders/tax-simulation', data);
    return response.data;
  },
};

// Quick Sales API
export const quickSalesAPI = {
  processQuickSale: async (data: {
    customer?: {
      id?: string;
      name: string;
      document: string;
      phone?: string;
    };
    items: Array<{
      id: string;
      name: string;
      barcode: string;
      price: number;
      stock: number;
      quantity: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
  }) => {
    const response = await api.post('/sales/quick-sale', data);
    return response.data;
  },

  processCompleteSale: async (data: {
    client_id?: string;
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      icms_amount: number;
      pis_amount: number;
      cofins_amount: number;
    }>;
    discount_type: string;
    discount_value: number;
    shipping_cost: number;
    payment_terms: string;
    delivery_date?: string;
    notes?: string;
    payment: {
      method: string;
      amount: number;
      installments: number;
      authorization_code?: string;
      transaction_id?: string;
      card_brand?: string;
      card_last_digits?: string;
    };
  }) => {
    const response = await api.post('/sales/complete-sale', data);
    return response.data;
  },

  getRecentSales: async (limit: number = 10) => {
    const response = await api.post('/sales/get-recent', { limit });
    return response.data;
  },

  getDailySalesStats: async () => {
    const response = await api.post('/sales/stats/today');
    return response.data;
  },

  cancelQuickSale: async (saleId: string) => {
    const response = await api.patch(`/sales/${saleId}/cancel`);
    return response.data;
  },
};

// Setup API
export const setupAPI = {
  createSaleTables: async () => {
    const response = await api.post('/setup/create-sale-tables');
    return response.data;
  },

  checkTables: async () => {
    const response = await api.get('/setup/check-tables');
    return response.data;
  },
};