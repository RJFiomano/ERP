#!/usr/bin/env python3
"""
Script para verificar estado do banco de dados
"""
import psycopg2
import os

def main():
    try:
        # Conectar ao banco
        conn = psycopg2.connect(
            host="db",
            database="erp_db",
            user="erp_user", 
            password="erp_password",
            port=5432
        )
        cursor = conn.cursor()
        
        print("🔗 Conexão estabelecida com o banco!")
        
        # Verificar todas as tabelas
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        print(f"\n📋 Tabelas existentes ({len(tables)}):")
        for table in tables:
            print(f"  - {table[0]}")
            
        # Verificar se existe tabela users
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY ordinal_position
        """)
        user_columns = cursor.fetchall()
        
        if user_columns:
            print(f"\n👤 Estrutura da tabela 'users' ({len(user_columns)} colunas):")
            for col_name, col_type in user_columns:
                print(f"  - {col_name}: {col_type}")
        else:
            print("\n❌ Tabela 'users' não encontrada!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"💥 Erro: {e}")

if __name__ == "__main__":
    main()