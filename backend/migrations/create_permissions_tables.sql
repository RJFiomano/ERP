-- Criar tabelas do sistema de permissões
-- Execute este script no seu banco de dados PostgreSQL

-- 1. Tabela de Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- 2. Tabela de Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE(resource, action)
);

-- 3. Tabela de relacionamento Role-Permission
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- 4. Adicionar campo role_id na tabela users (se não existir)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- 6. Inserir permissões básicas do sistema
INSERT INTO permissions (name, resource, action, description) VALUES
-- Usuários
('Visualizar Usuários', 'users', 'view', 'Permite visualizar lista e detalhes dos usuários'),
('Criar Usuários', 'users', 'create', 'Permite criar novos usuários'),
('Editar Usuários', 'users', 'edit', 'Permite editar usuários existentes'),
('Excluir Usuários', 'users', 'delete', 'Permite excluir/inativar usuários'),

-- Roles e Permissões (apenas admin)
('Visualizar Roles', 'roles', 'view', 'Permite visualizar roles e permissões'),
('Criar Roles', 'roles', 'create', 'Permite criar novos roles'),
('Editar Roles', 'roles', 'edit', 'Permite editar roles existentes'),
('Excluir Roles', 'roles', 'delete', 'Permite excluir/inativar roles'),

-- Clientes
('Visualizar Clientes', 'clients', 'view', 'Permite visualizar lista e detalhes dos clientes'),
('Criar Clientes', 'clients', 'create', 'Permite criar novos clientes'),
('Editar Clientes', 'clients', 'edit', 'Permite editar clientes existentes'),
('Excluir Clientes', 'clients', 'delete', 'Permite excluir/inativar clientes'),

-- Fornecedores
('Visualizar Fornecedores', 'suppliers', 'view', 'Permite visualizar lista e detalhes dos fornecedores'),
('Criar Fornecedores', 'suppliers', 'create', 'Permite criar novos fornecedores'),
('Editar Fornecedores', 'suppliers', 'edit', 'Permite editar fornecedores existentes'),
('Excluir Fornecedores', 'suppliers', 'delete', 'Permite excluir/inativar fornecedores'),

-- Produtos
('Visualizar Produtos', 'products', 'view', 'Permite visualizar lista e detalhes dos produtos'),
('Criar Produtos', 'products', 'create', 'Permite criar novos produtos'),
('Editar Produtos', 'products', 'edit', 'Permite editar produtos existentes'),
('Excluir Produtos', 'products', 'delete', 'Permite excluir/inativar produtos'),

-- Categorias
('Visualizar Categorias', 'categories', 'view', 'Permite visualizar lista e detalhes das categorias'),
('Criar Categorias', 'categories', 'create', 'Permite criar novas categorias'),
('Editar Categorias', 'categories', 'edit', 'Permite editar categorias existentes'),
('Excluir Categorias', 'categories', 'delete', 'Permite excluir/inativar categorias'),

-- Relatórios
('Visualizar Relatórios', 'reports', 'view', 'Permite visualizar relatórios do sistema')

ON CONFLICT (name) DO NOTHING;

-- 7. Criar roles básicos
INSERT INTO roles (name, description) VALUES
('Administrador', 'Acesso completo a todo o sistema'),
('Operador', 'Pode visualizar produtos mas não pode editar preços ou estoque'),
('Financeiro', 'Acesso a clientes, fornecedores e relatórios financeiros'),
('Vendas', 'Acesso a clientes e produtos para vendas'),
('Estoque', 'Gerenciamento de produtos e categorias')
ON CONFLICT (name) DO NOTHING;

-- 8. Configurar permissões do Administrador (todas)
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'Administrador'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 9. Configurar permissões do Operador (exemplo conforme solicitado)
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'Operador' 
  AND p.resource = 'products' 
  AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'Operador' 
  AND p.resource = 'categories' 
  AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 10. Configurar permissões do Financeiro
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'Financeiro' 
  AND (
    (p.resource = 'clients' AND p.action IN ('view', 'create', 'edit')) OR
    (p.resource = 'suppliers' AND p.action IN ('view', 'create', 'edit')) OR
    (p.resource = 'products' AND p.action IN ('view', 'edit')) OR
    (p.resource = 'categories' AND p.action = 'view') OR
    (p.resource = 'reports' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 11. Configurar permissões do Vendas
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'Vendas' 
  AND (
    (p.resource = 'clients' AND p.action IN ('view', 'create', 'edit')) OR
    (p.resource = 'products' AND p.action = 'view') OR
    (p.resource = 'categories' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 12. Configurar permissões do Estoque
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'Estoque' 
  AND (
    (p.resource = 'products' AND p.action IN ('view', 'create', 'edit')) OR
    (p.resource = 'categories' AND p.action IN ('view', 'create', 'edit'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 13. Atribuir role de Administrador aos usuários admin existentes (opcional)
-- UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'Administrador') 
-- WHERE role = 'admin' AND role_id IS NULL;

COMMIT;