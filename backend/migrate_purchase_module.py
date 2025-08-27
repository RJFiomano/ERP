#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para executar as migrations do módulo de compras
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def run_migration(cursor, migration_file, migration_name):
    """Executar uma migration específica"""
    try:
        print(f"Executando {migration_name}...")
        
        # Ler arquivo SQL
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Executar SQL
        cursor.execute(sql_content)
        print(f"OK {migration_name} executada com sucesso!")
        return True
        
    except Exception as e:
        print(f"ERRO em {migration_name}: {str(e)}")
        return False

def main():
    """Função principal"""
    try:
        # Conectar ao banco
        DATABASE_URL = os.getenv('DATABASE_URL')
        if not DATABASE_URL:
            print("ERRO DATABASE_URL nao encontrada no .env")
            return
        
        print("Conectando ao banco de dados...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        cursor = conn.cursor()
        
        print("OK Conexao estabelecida!")
        
        # Lista de migrations na ordem correta
        migrations = [
            ("migrations/015_create_supplier_extension.sql", "015 - Extensao Fornecedores"),
            ("migrations/016_create_purchase_orders.sql", "016 - Pedidos de Compra"),
            ("migrations/017_create_stock_entries.sql", "017 - Entradas de Estoque"),
            ("migrations/018_create_stock_movements.sql", "018 - Movimentacoes de Estoque"),
            ("migrations/019_create_product_costs.sql", "019 - Custos de Produtos"),
            ("migrations/020_create_accounts_payable.sql", "020 - Contas a Pagar"),
        ]
        
        print(f"\nExecutando {len(migrations)} migrations...\n")
        
        success_count = 0
        for migration_file, migration_name in migrations:
            if os.path.exists(migration_file):
                if run_migration(cursor, migration_file, migration_name):
                    success_count += 1
                    conn.commit()
                else:
                    conn.rollback()
                    print(f"ERRO Rollback da migration {migration_name}")
            else:
                print(f"AVISO Arquivo nao encontrado: {migration_file}")
        
        print(f"\nResultado: {success_count}/{len(migrations)} migrations executadas com sucesso!")
        
        if success_count == len(migrations):
            print("OK Modulo de compras instalado com sucesso!")
            
            # Verificar tabelas criadas
            print("\nVerificando tabelas criadas...")
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN (
                    'pedidos_compra', 
                    'pedidos_compra_itens',
                    'entradas_estoque',
                    'entradas_estoque_itens', 
                    'movimentacoes_estoque',
                    'estoque_atual',
                    'custos_produtos',
                    'politicas_precos',
                    'contas_pagar',
                    'contas_pagar_parcelas',
                    'contas_pagar_pagamentos'
                )
                ORDER BY table_name
            """)
            
            tables = cursor.fetchall()
            print(f"Tabelas criadas: {len(tables)}")
            for table in tables:
                print(f"  - {table[0]}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"ERRO geral: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    main()