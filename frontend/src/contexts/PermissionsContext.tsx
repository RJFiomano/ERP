import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { rolesAPI } from '@/services/api';
import { UserRoleInfo } from '@/types/role';
import { useAuth } from './AuthContext';

interface PermissionsContextType {
  permissions: string[];
  roleInfo: UserRoleInfo | null;
  loading: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  hasAnyPermission: (permissionList: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

interface PermissionsProviderProps {
  children: ReactNode;
}

export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const loadPermissions = async () => {
    if (!isAuthenticated) {
      setPermissions([]);
      setRoleInfo(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userPermissions = await rolesAPI.getMyPermissions();
      setRoleInfo(userPermissions);
      setPermissions(userPermissions.permissions || []);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermissions([]);
      setRoleInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [isAuthenticated]);

  const hasPermission = (resource: string, action: string): boolean => {
    const permissionKey = `${resource}:${action}`;
    return permissions.includes(permissionKey);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  const refreshPermissions = async () => {
    await loadPermissions();
  };

  const value: PermissionsContextType = {
    permissions,
    roleInfo,
    loading,
    hasPermission,
    hasAnyPermission,
    refreshPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions deve ser usado dentro de um PermissionsProvider');
  }
  return context;
};