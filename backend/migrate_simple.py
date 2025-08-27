#!/usr/bin/env python3
"""
Script simples para executar migrations
"""
import os
import subprocess

def run_sql_file(sql_file):
    """Executar arquivo SQL usando subprocess"""
    try:
        # Comando para executar SQL
        cmd = [
            'python', '-c', f'''
import psycopg2
import os

conn = psycopg2.connect(
    "host=localhost dbname=erp_db user=erp_user password=erp_password port=5432"
)

with open(r"{sql_file}", "r", encoding="utf-8") as f:
    sql = f.read()

cursor = conn.cursor()
cursor.execute(sql)
conn.commit()
cursor.close()
conn.close()
print("OK")
'''
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
        
        if result.returncode == 0:
            print(f"OK {sql_file}")
            return True
        else:
            print(f"ERRO {sql_file}: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"ERRO {sql_file}: {e}")
        return False

def main():
    migrations = [
        "migrations/015_create_supplier_extension.sql",
        "migrations/016_create_purchase_orders.sql", 
        "migrations/017_create_stock_entries.sql",
        "migrations/018_create_stock_movements.sql",
        "migrations/019_create_product_costs.sql",
        "migrations/020_create_accounts_payable.sql"
    ]
    
    print("Executando migrations do modulo de compras...")
    
    success_count = 0
    for migration in migrations:
        if os.path.exists(migration):
            if run_sql_file(migration):
                success_count += 1
        else:
            print(f"Arquivo nao encontrado: {migration}")
    
    print(f"\nResultado: {success_count}/{len(migrations)} executadas com sucesso")
    
    if success_count == len(migrations):
        print("Modulo de compras instalado!")

if __name__ == "__main__":
    main()