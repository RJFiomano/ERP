#!/usr/bin/env python3
"""
Script para testar o sistema de vendas do ERP
Testa conectividade com PostgreSQL e funcionalidades básicas
"""

import sys
import os
import requests
import json
import psycopg2
from datetime import datetime

# Configurações
API_BASE_URL = "http://localhost:8000"
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'erp_db',
    'user': 'erp_user',
    'password': 'erp_password'
}

def test_database_connection():
    """Testa conectividade com PostgreSQL"""
    print("Testando conexão com PostgreSQL...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"OK PostgreSQL conectado: {version[0]}")
        
        # Verificar se as tabelas existem
        tables_to_check = ['clients', 'products', 'sales', 'sale_items', 'users']
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = ANY(%s)
        """, (tables_to_check,))
        
        existing_tables = [row[0] for row in cursor.fetchall()]
        print(f"Tabelas encontradas: {existing_tables}")
        
        missing_tables = set(tables_to_check) - set(existing_tables)
        if missing_tables:
            print(f"AVISO Tabelas faltando: {missing_tables}")
            print("Execute as migrações: python run_migration.py")
        else:
            print("OK Todas as tabelas necessárias estão presentes")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"ERRO ao conectar com PostgreSQL: {e}")
        return False

def test_api_connection():
    """Testa conectividade com a API"""
    print("\nTestando conexão com API...")
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("OK API respondendo")
            return True
        else:
            print(f"ERRO API retornou status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"ERRO ao conectar com API: {e}")
        print("Certifique-se de que o backend está rodando:")
        print("   cd backend && uvicorn app.main:app --reload")
        return False

def test_sales_endpoints():
    """Testa endpoints de vendas"""
    print("\nTestando endpoints de vendas...")
    
    try:
        # Testar listagem de vendas (sem autenticação por enquanto)
        response = requests.get(f"{API_BASE_URL}/sales/", timeout=5)
        print(f"GET /sales/ - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Vendas encontradas: {len(data.get('sales', []))}")
        
        # Testar vendas recentes
        response = requests.get(f"{API_BASE_URL}/quick-sales/recent", timeout=5)
        print(f"GET /quick-sales/recent - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Vendas recentes: {len(data.get('data', []))}")
        
        # Testar estatísticas do dia
        response = requests.get(f"{API_BASE_URL}/quick-sales/stats/today", timeout=5)
        print(f"GET /quick-sales/stats/today - Status: {response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"ERRO ao testar endpoints: {e}")
        return False

def test_frontend_connection():
    """Testa se o frontend está acessível"""
    print("\nTestando frontend...")
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print("OK Frontend acessível")
            return True
        else:
            print(f"ERRO Frontend retornou status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"ERRO ao acessar frontend: {e}")
        print("Certifique-se de que o frontend está rodando:")
        print("   cd frontend && npm run dev")
        return False

def create_sample_data():
    """Cria dados de exemplo para teste"""
    print("\nCriando dados de exemplo...")
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Verificar se já existe dados
        cursor.execute("SELECT COUNT(*) FROM products")
        product_count = cursor.fetchone()[0]
        
        if product_count == 0:
            print("Inserindo produtos de exemplo...")
            
            # Produtos de exemplo
            sample_products = [
                ("Produto A", "7891234567890", 10.50, 100),
                ("Produto B", "7891234567891", 25.00, 50),
                ("Produto C", "7891234567892", 15.75, 75)
            ]
            
            for name, barcode, price, stock in sample_products:
                cursor.execute("""
                    INSERT INTO products (id, name, barcode, sale_price, stock_quantity, is_active, created_at)
                    VALUES (gen_random_uuid(), %s, %s, %s, %s, true, %s)
                """, (name, barcode, price, stock, datetime.now()))
            
            conn.commit()
            print("OK Produtos de exemplo criados")
        else:
            print(f"INFO {product_count} produtos já existem no banco")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"ERRO ao criar dados de exemplo: {e}")
        return False

def main():
    """Função principal de teste"""
    print("TESTANDO SISTEMA DE VENDAS ERP")
    print("=" * 50)
    
    # Testes de conectividade
    db_ok = test_database_connection()
    api_ok = test_api_connection()
    
    if not db_ok:
        print("\nERRO Sistema não pode funcionar sem PostgreSQL")
        sys.exit(1)
    
    if not api_ok:
        print("\nERRO Sistema não pode funcionar sem a API")
        sys.exit(1)
    
    # Criar dados de exemplo
    create_sample_data()
    
    # Testar endpoints específicos
    test_sales_endpoints()
    
    # Testar frontend
    test_frontend_connection()
    
    print("\n" + "=" * 50)
    print("TESTES CONCLUIDOS!")
    print("\nPara usar o sistema de vendas:")
    print("1. Acesse: http://localhost:3000")
    print("2. Faça login com suas credenciais")
    print("3. Vá para a tela 'Vendas'")
    print("4. Use a aba 'Venda Rápida' para teste")
    print("\nPara configurar para produção:")
    print("1. Edite o arquivo .env.production")
    print("2. Configure a URL do banco PostgreSQL")
    print("3. Altere JWT_SECRET_KEY para uma chave segura")
    print("4. Configure as credenciais de email se necessário")

if __name__ == "__main__":
    main()