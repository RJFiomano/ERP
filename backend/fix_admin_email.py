#!/usr/bin/env python3
"""
Script para corrigir o email do usuário admin
"""
import psycopg2

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
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("🔗 Atualizando email do usuário admin...")
        
        # Atualizar email do admin para um formato válido
        cursor.execute("""
            UPDATE users 
            SET email = 'admin@exemplo.com' 
            WHERE email = 'admin@local'
        """)
        
        print("✅ Email do admin atualizado para: admin@exemplo.com")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"💥 Erro: {e}")

if __name__ == "__main__":
    main()