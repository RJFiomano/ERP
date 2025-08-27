#!/usr/bin/env python3
"""
Script para criar usuário administrador
"""
import psycopg2
import uuid
from datetime import datetime
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

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
        
        print("🔗 Conexão estabelecida com o banco!")
        
        # Verificar se já existe usuário admin
        cursor.execute("SELECT id, email FROM users WHERE email = 'admin@local'")
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"👤 Usuário admin já existe: {existing_user[1]} (ID: {existing_user[0]})")
        else:
            # Criar usuário admin
            admin_id = str(uuid.uuid4())
            admin_email = "admin@local"
            admin_name = "Administrador do Sistema"
            admin_password = hash_password("Admin!123")
            now = datetime.now()
            
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (admin_id, admin_email, admin_password, admin_name, 'ADMIN', True, now, now))
            
            print(f"✅ Usuário admin criado com sucesso!")
            print(f"   📧 Email: {admin_email}")
            print(f"   🔑 Senha: Admin!123")
            print(f"   🆔 ID: {admin_id}")
        
        # Verificar se existe role de admin
        cursor.execute("SELECT id, name FROM roles WHERE name = 'Administrador' OR name = 'admin'")
        admin_role = cursor.fetchone()
        
        if not admin_role:
            # Criar role de administrador
            role_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO roles (id, name, description, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
            """, (role_id, "Administrador", "Acesso completo ao sistema", now, now))
            print(f"✅ Role 'Administrador' criada com ID: {role_id}")
            
            # Atualizar usuário admin com role_id
            cursor.execute("UPDATE users SET role_id = %s WHERE email = 'admin@local'", (role_id,))
            print("✅ Usuário admin vinculado à role de Administrador")
        else:
            print(f"👔 Role admin já existe: {admin_role[1]} (ID: {admin_role[0]})")
            # Garantir que o usuário admin tem a role correta
            cursor.execute("UPDATE users SET role_id = %s WHERE email = 'admin@local'", (admin_role[0],))
            print("✅ Usuário admin vinculado à role existente")
        
        # Listar usuários
        cursor.execute("""
            SELECT u.id, u.email, u.name, u.role, u.is_active, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at
        """)
        users = cursor.fetchall()
        
        print(f"\n👥 Usuários no sistema ({len(users)}):")
        for user in users:
            active_status = "✅" if user[4] else "❌"
            role_info = f" (Role: {user[5]})" if user[5] else ""
            print(f"  {active_status} {user[1]} - {user[2]} - {user[3]}{role_info}")
        
        cursor.close()
        conn.close()
        
        print(f"\n🎉 Sistema pronto para uso!")
        print(f"   🌐 Frontend: http://localhost:3000")
        print(f"   🔧 Backend API: http://localhost:8000") 
        print(f"   📊 Swagger: http://localhost:8000/docs")
        print(f"   🗄️ PgAdmin: http://localhost:5050")
        
    except Exception as e:
        print(f"💥 Erro: {e}")

if __name__ == "__main__":
    main()