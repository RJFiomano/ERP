import React from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';

interface PermissionGuardProps {
  children: React.ReactNode;
  resource?: string;
  action?: string;
  permissions?: string[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // Se true, requer todas as permissões. Se false, requer pelo menos uma
}

/**
 * Componente para proteger elementos da UI baseado em permissões do usuário
 * 
 * Uso:
 * - Com resource + action: <PermissionGuard resource="products" action="create">...</PermissionGuard>
 * - Com lista de permissões: <PermissionGuard permissions={["products:view", "products:edit"]}>...</PermissionGuard>
 * - Requer todas as permissões: <PermissionGuard permissions={["..."] requireAll={true}>...</PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  resource,
  action,
  permissions = [],
  fallback = null,
  requireAll = false,
}) => {
  const { hasPermission, hasAnyPermission, permissions: userPermissions, loading } = usePermissions();

  // Se ainda está carregando, não mostra nada
  if (loading) {
    return <>{fallback}</>;
  }


  // Se fornecido resource e action, verifica essa permissão específica
  if (resource && action) {
    if (!hasPermission(resource, action)) {
      return <>{fallback}</>;
    }
    return <>{children}</>;
  }

  // Se fornecida lista de permissões
  if (permissions.length > 0) {
    let hasAccess = false;

    if (requireAll) {
      // Requer todas as permissões
      hasAccess = permissions.every(permission => userPermissions.includes(permission));
    } else {
      // Requer pelo menos uma permissão
      hasAccess = hasAnyPermission(permissions);
    }

    if (!hasAccess) {
      return <>{fallback}</>;
    }
    return <>{children}</>;
  }

  // Se nenhuma condição foi especificada, mostra o conteúdo
  return <>{children}</>;
};