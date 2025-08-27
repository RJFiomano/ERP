#!/usr/bin/env python3

import psycopg2
from psycopg2 import sql
import hashlib
from passlib.context import CryptContext

# Configurações do banco
DB_CONFIG = {
    'host': 'db',
    'port': 5432,
    'database': 'erp_db', 
    'user': 'erp_user',
    'password': 'erp_password'
}

def fix_admin_email():
    """Atualiza o email do usuário admin para um formato válido"""
    
    try:
        # Conectar ao banco
        print("🔗 Conectando ao banco de dados...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Verificar se existe usuário com admin@local
        cur.execute("SELECT id, email FROM users WHERE email = 'admin@local'")
        user = cur.fetchone()
        
        if user:
            user_id, old_email = user
            print(f"📧 Usuário encontrado: {old_email}")
            
            # Atualizar email
            new_email = 'admin@localhost.com'
            cur.execute("UPDATE users SET email = %s WHERE id = %s", (new_email, user_id))
            
            print(f"✅ Email atualizado de {old_email} para {new_email}")
        else:
            print("❌ Usuário admin@local não encontrado")
            
            # Verificar se já existe admin@localhost.com
            cur.execute("SELECT id, email FROM users WHERE email = 'admin@localhost.com'")
            existing = cur.fetchone()
            
            if existing:
                print("✅ Usuário admin@localhost.com já existe")
            else:
                # Criar usuário com email válido
                pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
                hashed_password = pwd_context.hash('Admin!123')
                
                cur.execute("""
                    INSERT INTO users (id, email, hashed_password, full_name, is_active, role, created_at, updated_at) 
                    VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), NOW())
                """, ('admin@localhost.com', hashed_password, 'Administrador do Sistema', True, 'ADMIN'))
                
                print("✅ Novo usuário admin@localhost.com criado")
        
        # Confirmar transação
        conn.commit()
        
        # Listar usuários
        cur.execute("SELECT email, full_name, role FROM users")
        users = cur.fetchall()
        
        print("\n👥 Usuários no sistema:")
        for email, name, role in users:
            print(f"  📧 {email} - {name} ({role})")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Erro no banco de dados: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        return False
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    success = fix_admin_email()
    if success:
        print("\n🎉 Email do admin corrigido com sucesso!")
        print("📧 Use: admin@localhost.com")
        print("🔑 Senha: Admin!123")
    else:
        print("❌ Falha ao corrigir email!")
