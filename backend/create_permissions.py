#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import psycopg2
import uuid
from datetime import datetime

# Configurações do banco
DB_CONFIG = {
    'host': 'db',
    'port': 5432,
    'database': 'erp_db', 
    'user': 'erp_user',
    'password': 'erp_password'
}

# Definir todas as permissões do sistema ERP
PERMISSIONS = [
    # Dashboard
    {"name": "Visualizar Dashboard", "resource": "dashboard", "action": "view", "description": "Permite visualizar o dashboard principal"},
    {"name": "Exportar Dashboard", "resource": "dashboard", "action": "export", "description": "Permite exportar dados do dashboard"},
    
    # Usuários
    {"name": "Visualizar Usuários", "resource": "users", "action": "view", "description": "Permite visualizar lista de usuários"},
    {"name": "Criar Usuários", "resource": "users", "action": "create", "description": "Permite criar novos usuários"},
    {"name": "Editar Usuários", "resource": "users", "action": "edit", "description": "Permite editar usuários existentes"},
    {"name": "Excluir Usuários", "resource": "users", "action": "delete", "description": "Permite excluir usuários"},
    {"name": "Gerenciar Senhas", "resource": "users", "action": "password", "description": "Permite redefinir senhas de usuários"},
    
    # Perfis e Permissões
    {"name": "Visualizar Perfis", "resource": "roles", "action": "view", "description": "Permite visualizar perfis do sistema"},
    {"name": "Criar Perfis", "resource": "roles", "action": "create", "description": "Permite criar novos perfis"},
    {"name": "Editar Perfis", "resource": "roles", "action": "edit", "description": "Permite editar perfis existentes"},
    {"name": "Excluir Perfis", "resource": "roles", "action": "delete", "description": "Permite excluir perfis"},
    {"name": "Gerenciar Permissões", "resource": "permissions", "action": "manage", "description": "Permite gerenciar permissões do sistema"},
    
    # Produtos
    {"name": "Visualizar Produtos", "resource": "products", "action": "view", "description": "Permite visualizar lista de produtos"},
    {"name": "Criar Produtos", "resource": "products", "action": "create", "description": "Permite criar novos produtos"},
    {"name": "Editar Produtos", "resource": "products", "action": "edit", "description": "Permite editar produtos existentes"},
    {"name": "Excluir Produtos", "resource": "products", "action": "delete", "description": "Permite excluir produtos"},
    {"name": "Importar Produtos", "resource": "products", "action": "import", "description": "Permite importar produtos via arquivo"},
    {"name": "Exportar Produtos", "resource": "products", "action": "export", "description": "Permite exportar lista de produtos"},
    
    # Categorias
    {"name": "Visualizar Categorias", "resource": "categories", "action": "view", "description": "Permite visualizar categorias"},
    {"name": "Criar Categorias", "resource": "categories", "action": "create", "description": "Permite criar novas categorias"},
    {"name": "Editar Categorias", "resource": "categories", "action": "edit", "description": "Permite editar categorias existentes"},
    {"name": "Excluir Categorias", "resource": "categories", "action": "delete", "description": "Permite excluir categorias"},
    
    # Clientes
    {"name": "Visualizar Clientes", "resource": "clients", "action": "view", "description": "Permite visualizar lista de clientes"},
    {"name": "Criar Clientes", "resource": "clients", "action": "create", "description": "Permite criar novos clientes"},
    {"name": "Editar Clientes", "resource": "clients", "action": "edit", "description": "Permite editar clientes existentes"},
    {"name": "Excluir Clientes", "resource": "clients", "action": "delete", "description": "Permite excluir clientes"},
    {"name": "Importar Clientes", "resource": "clients", "action": "import", "description": "Permite importar clientes via arquivo"},
    {"name": "Exportar Clientes", "resource": "clients", "action": "export", "description": "Permite exportar lista de clientes"},
    
    # Fornecedores
    {"name": "Visualizar Fornecedores", "resource": "suppliers", "action": "view", "description": "Permite visualizar lista de fornecedores"},
    {"name": "Criar Fornecedores", "resource": "suppliers", "action": "create", "description": "Permite criar novos fornecedores"},
    {"name": "Editar Fornecedores", "resource": "suppliers", "action": "edit", "description": "Permite editar fornecedores existentes"},
    {"name": "Excluir Fornecedores", "resource": "suppliers", "action": "delete", "description": "Permite excluir fornecedores"},
    
    # Pessoas (Sistema Unificado)
    {"name": "Visualizar Pessoas", "resource": "pessoas", "action": "view", "description": "Permite visualizar cadastro de pessoas"},
    {"name": "Criar Pessoas", "resource": "pessoas", "action": "create", "description": "Permite criar novos cadastros de pessoas"},
    {"name": "Editar Pessoas", "resource": "pessoas", "action": "edit", "description": "Permite editar pessoas existentes"},
    {"name": "Excluir Pessoas", "resource": "pessoas", "action": "delete", "description": "Permite excluir pessoas"},
    
    # Vendas
    {"name": "Visualizar Vendas", "resource": "sales", "action": "view", "description": "Permite visualizar vendas realizadas"},
    {"name": "Criar Vendas", "resource": "sales", "action": "create", "description": "Permite realizar novas vendas"},
    {"name": "Editar Vendas", "resource": "sales", "action": "edit", "description": "Permite editar vendas existentes"},
    {"name": "Cancelar Vendas", "resource": "sales", "action": "cancel", "description": "Permite cancelar vendas"},
    {"name": "Aplicar Descontos", "resource": "sales", "action": "discount", "description": "Permite aplicar descontos em vendas"},
    {"name": "Venda Rápida", "resource": "sales", "action": "quick_sale", "description": "Permite realizar vendas rápidas"},
    
    # Pedidos de Compra
    {"name": "Visualizar Pedidos Compra", "resource": "purchase_orders", "action": "view", "description": "Permite visualizar pedidos de compra"},
    {"name": "Criar Pedidos Compra", "resource": "purchase_orders", "action": "create", "description": "Permite criar novos pedidos de compra"},
    {"name": "Editar Pedidos Compra", "resource": "purchase_orders", "action": "edit", "description": "Permite editar pedidos de compra"},
    {"name": "Cancelar Pedidos Compra", "resource": "purchase_orders", "action": "cancel", "description": "Permite cancelar pedidos de compra"},
    {"name": "Aprovar Pedidos Compra", "resource": "purchase_orders", "action": "approve", "description": "Permite aprovar pedidos de compra"},
    {"name": "Receber Pedidos", "resource": "purchase_orders", "action": "receive", "description": "Permite marcar pedidos como recebidos"},
    
    # Estoque
    {"name": "Visualizar Estoque", "resource": "inventory", "action": "view", "description": "Permite visualizar níveis de estoque"},
    {"name": "Ajustar Estoque", "resource": "inventory", "action": "adjust", "description": "Permite fazer ajustes de estoque"},
    {"name": "Entrada Estoque", "resource": "inventory", "action": "entry", "description": "Permite registrar entradas de estoque"},
    {"name": "Saída Estoque", "resource": "inventory", "action": "exit", "description": "Permite registrar saídas de estoque"},
    {"name": "Transferir Estoque", "resource": "inventory", "action": "transfer", "description": "Permite transferir estoque entre locais"},
    {"name": "Inventário", "resource": "inventory", "action": "count", "description": "Permite realizar contagem de inventário"},
    
    # Contas a Receber
    {"name": "Visualizar Contas Receber", "resource": "accounts_receivable", "action": "view", "description": "Permite visualizar contas a receber"},
    {"name": "Criar Contas Receber", "resource": "accounts_receivable", "action": "create", "description": "Permite criar contas a receber"},
    {"name": "Editar Contas Receber", "resource": "accounts_receivable", "action": "edit", "description": "Permite editar contas a receber"},
    {"name": "Baixar Contas Receber", "resource": "accounts_receivable", "action": "settle", "description": "Permite dar baixa em contas a receber"},
    {"name": "Cancelar Contas Receber", "resource": "accounts_receivable", "action": "cancel", "description": "Permite cancelar contas a receber"},
    
    # Contas a Pagar
    {"name": "Visualizar Contas Pagar", "resource": "accounts_payable", "action": "view", "description": "Permite visualizar contas a pagar"},
    {"name": "Criar Contas Pagar", "resource": "accounts_payable", "action": "create", "description": "Permite criar contas a pagar"},
    {"name": "Editar Contas Pagar", "resource": "accounts_payable", "action": "edit", "description": "Permite editar contas a pagar"},
    {"name": "Pagar Contas", "resource": "accounts_payable", "action": "pay", "description": "Permite efetuar pagamento de contas"},
    {"name": "Cancelar Contas Pagar", "resource": "accounts_payable", "action": "cancel", "description": "Permite cancelar contas a pagar"},
    
    # Financeiro
    {"name": "Visualizar Financeiro", "resource": "financial", "action": "view", "description": "Permite visualizar informações financeiras"},
    {"name": "Fluxo de Caixa", "resource": "financial", "action": "cash_flow", "description": "Permite visualizar fluxo de caixa"},
    {"name": "DRE", "resource": "financial", "action": "dre", "description": "Permite visualizar DRE"},
    {"name": "Conciliação Bancária", "resource": "financial", "action": "bank_reconciliation", "description": "Permite fazer conciliação bancária"},
    
    # Relatórios
    {"name": "Visualizar Relatórios", "resource": "reports", "action": "view", "description": "Permite visualizar relatórios do sistema"},
    {"name": "Relatório Vendas", "resource": "reports", "action": "sales", "description": "Permite visualizar relatórios de vendas"},
    {"name": "Relatório Compras", "resource": "reports", "action": "purchases", "description": "Permite visualizar relatórios de compras"},
    {"name": "Relatório Estoque", "resource": "reports", "action": "inventory", "description": "Permite visualizar relatórios de estoque"},
    {"name": "Relatório Financeiro", "resource": "reports", "action": "financial", "description": "Permite visualizar relatórios financeiros"},
    {"name": "Exportar Relatórios", "resource": "reports", "action": "export", "description": "Permite exportar relatórios"},
    
    # Configurações
    {"name": "Visualizar Configurações", "resource": "settings", "action": "view", "description": "Permite visualizar configurações do sistema"},
    {"name": "Editar Configurações", "resource": "settings", "action": "edit", "description": "Permite editar configurações do sistema"},
    {"name": "Configurações Fiscais", "resource": "settings", "action": "tax", "description": "Permite configurar parâmetros fiscais"},
    {"name": "Backup/Restaurar", "resource": "settings", "action": "backup", "description": "Permite fazer backup e restaurar dados"},
    
    # NFe
    {"name": "Emitir NFe", "resource": "nfe", "action": "emit", "description": "Permite emitir Notas Fiscais Eletrônicas"},
    {"name": "Cancelar NFe", "resource": "nfe", "action": "cancel", "description": "Permite cancelar NFe"},
    {"name": "Consultar NFe", "resource": "nfe", "action": "query", "description": "Permite consultar status de NFe"},
    {"name": "Imprimir NFe", "resource": "nfe", "action": "print", "description": "Permite imprimir DANFE"},
]

def create_permissions():
    """Criar todas as permissoes do sistema"""
    try:
        print("Criando permissoes do sistema...")
        
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Verificar se a tabela permissions existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'permissions'
            );
        """)
        
        if not cursor.fetchone()[0]:
            print("ERRO: Tabela permissions nao encontrada!")
            return False
        
        # Contar permissoes existentes
        cursor.execute("SELECT COUNT(*) FROM permissions")
        existing_count = cursor.fetchone()[0]
        
        if existing_count > 0:
            print(f"Ja existem {existing_count} permissoes. Recriando automaticamente...")
            
            # Limpar permissoes existentes
            cursor.execute("DELETE FROM role_permissions")
            cursor.execute("DELETE FROM permissions")
            print("Permissoes antigas removidas.")
        
        # Inserir todas as permissoes
        created_count = 0
        
        for perm in PERMISSIONS:
            permission_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO permissions (
                    id, name, resource, action, description, is_active, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                permission_id,
                perm['name'],
                perm['resource'], 
                perm['action'],
                perm['description'],
                True,
                datetime.now(),
                datetime.now()
            ))
            created_count += 1
        
        # Confirmar transacao
        conn.commit()
        
        # Estatisticas finais
        cursor.execute("""
            SELECT resource, COUNT(*) as total
            FROM permissions 
            WHERE is_active = true
            GROUP BY resource 
            ORDER BY resource
        """)
        
        resources_stats = cursor.fetchall()
        
        print(f"\n=== PERMISSOES CRIADAS COM SUCESSO ===")
        print(f"Total de permissoes: {created_count}")
        print(f"\nPermissoes por recurso:")
        
        for resource, count in resources_stats:
            print(f"  {resource:<20} | {count:>3} permissoes")
        
        # Listar todas as acoes disponiveis
        cursor.execute("""
            SELECT DISTINCT action 
            FROM permissions 
            WHERE is_active = true 
            ORDER BY action
        """)
        
        actions = [row[0] for row in cursor.fetchall()]
        print(f"\nAcoes disponiveis: {', '.join(actions)}")
        
        cursor.close()
        conn.close()
        
        print(f"\nPermissoes prontas para uso no sistema!")
        return True
        
    except Exception as e:
        print(f"ERRO: {e}")
        if 'conn' in locals():
            conn.rollback()
            cursor.close()
            conn.close()
        return False

if __name__ == "__main__":
    success = create_permissions()
    if success:
        print("\nSUCESSO! Acesse o sistema para gerenciar perfis e permissoes.")
    else:
        print("\nFALHA na criacao das permissoes.")