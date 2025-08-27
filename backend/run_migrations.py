#!/usr/bin/env python3
"""
Script simples para executar migrations
"""
import psycopg2
import os

def main():
    try:
        # Conectar diretamente ao banco local
        conn = psycopg2.connect(
            host="localhost",
            database="erp_db",
            user="erp_user",
            password="erp_password",
            port=5432
        )
        conn.autocommit = False
        cursor = conn.cursor()
        
        print("Conexao estabelecida!")
        
        # Lista de migrations
        migrations = [
            "015_create_supplier_extension.sql",
            "016_create_purchase_orders.sql", 
            "017_create_stock_entries.sql",
            "018_create_stock_movements.sql",
            "019_create_product_costs.sql",
            "020_create_accounts_payable.sql"
        ]
        
        success_count = 0
        
        for migration_file in migrations:
            try:
                file_path = f"migrations/{migration_file}"
                print(f"Executando {migration_file}...")
                
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        sql_content = f.read()
                    
                    cursor.execute(sql_content)
                    conn.commit()
                    print(f"OK {migration_file}")
                    success_count += 1
                else:
                    print(f"Arquivo nao encontrado: {file_path}")
                    
            except Exception as e:
                print(f"ERRO em {migration_file}: {e}")
                conn.rollback()
        
        print(f"\nResultado: {success_count}/{len(migrations)} migrations executadas")
        
        # Verificar tabelas criadas
        if success_count > 0:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%compra%' OR table_name LIKE '%estoque%'
                ORDER BY table_name
            """)
            tables = cursor.fetchall()
            print(f"\nTabelas do modulo criadas: {len(tables)}")
            for table in tables:
                print(f"  - {table[0]}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    main()