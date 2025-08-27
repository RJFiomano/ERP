#!/usr/bin/env python3
"""
Script para executar migrations usando SQLAlchemy
"""
import os
import sys
from sqlalchemy import create_engine, text
from app.config import settings

def run_migration_file(engine, file_path, migration_name):
    """Executar uma migration específica"""
    try:
        print(f"Executando {migration_name}...")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        with engine.connect() as conn:
            # Executar SQL usando text() para raw SQL
            conn.execute(text(sql_content))
            conn.commit()
        
        print(f"OK {migration_name}")
        return True
        
    except Exception as e:
        print(f"ERRO em {migration_name}: {e}")
        return False

def main():
    try:
        # Usar engine do SQLAlchemy
        print("Conectando com SQLAlchemy...")
        engine = create_engine(settings.database_url)
        
        # Testar conexão
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database()"))
            db_name = result.fetchone()[0]
            print(f"Conectado ao banco: {db_name}")
        
        # Lista de migrations
        migrations = [
            ("migrations/015_create_supplier_extension.sql", "015 - Extensao Fornecedores"),
            ("migrations/016_create_purchase_orders.sql", "016 - Pedidos de Compra"),
            ("migrations/017_create_stock_entries.sql", "017 - Entradas de Estoque"),
            ("migrations/018_create_stock_movements.sql", "018 - Movimentacoes de Estoque"),
            ("migrations/019_create_product_costs.sql", "019 - Custos de Produtos"),
            ("migrations/020_create_accounts_payable.sql", "020 - Contas a Pagar"),
        ]
        
        success_count = 0
        for file_path, migration_name in migrations:
            if os.path.exists(file_path):
                if run_migration_file(engine, file_path, migration_name):
                    success_count += 1
            else:
                print(f"Arquivo nao encontrado: {file_path}")
        
        print(f"\nResultado: {success_count}/{len(migrations)} migrations executadas")
        
        if success_count > 0:
            # Verificar tabelas criadas
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND (table_name LIKE 'pedidos_%' 
                         OR table_name LIKE 'entradas_%'
                         OR table_name LIKE 'movimentacoes_%'
                         OR table_name LIKE 'estoque_%'
                         OR table_name LIKE 'custos_%'
                         OR table_name LIKE 'politicas_%'
                         OR table_name LIKE 'contas_%')
                    ORDER BY table_name
                """))
                tables = result.fetchall()
                
                print(f"\nTabelas do modulo criadas: {len(tables)}")
                for table in tables:
                    print(f"  - {table[0]}")
        
        if success_count == len(migrations):
            print("\nModulo de compras instalado com sucesso!")
        
    except Exception as e:
        print(f"Erro geral: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()