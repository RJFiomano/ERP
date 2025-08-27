#!/usr/bin/env python3
"""
Script para executar migrations dentro do container Docker
"""
import psycopg2
import os

def main():
    try:
        # Conectar ao banco usando o hostname do Docker
        conn = psycopg2.connect(
            host="db",  # Nome do service no docker-compose
            database="erp_db",
            user="erp_user",
            password="erp_password",
            port=5432
        )
        conn.autocommit = False
        cursor = conn.cursor()
        
        print("🔗 Conexão estabelecida com o banco!")
        
        # Lista de migrations - usar todas as migrations fixas mais recentes
        migrations = [
            "022_create_purchase_orders_fixed.sql",
            "023_create_stock_entries_fixed.sql", 
            "024_create_stock_movements_fixed.sql",
            "025_create_product_costs_fixed.sql",
            "026_create_accounts_payable_fixed.sql"
        ]
        
        success_count = 0
        
        for migration_file in migrations:
            try:
                file_path = f"migrations/{migration_file}"
                print(f"▶️ Executando {migration_file}...")
                
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        sql_content = f.read()
                    
                    cursor.execute(sql_content)
                    conn.commit()
                    print(f"✅ {migration_file}")
                    success_count += 1
                else:
                    print(f"❌ Arquivo não encontrado: {file_path}")
                    
            except Exception as e:
                print(f"❌ ERRO em {migration_file}: {e}")
                conn.rollback()
        
        print(f"\n📊 Resultado: {success_count}/{len(migrations)} migrations executadas")
        
        # Verificar tabelas criadas
        if success_count > 0:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND (table_name LIKE '%compra%' OR table_name LIKE '%estoque%' OR table_name LIKE '%conta%')
                ORDER BY table_name
            """)
            tables = cursor.fetchall()
            print(f"\n🗄️ Tabelas do módulo criadas: {len(tables)}")
            for table in tables:
                print(f"  - {table[0]}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"💥 Erro: {e}")

if __name__ == "__main__":
    main()