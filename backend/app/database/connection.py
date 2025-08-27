"""
Módulo de conexão com banco usando psycopg2 (fallback)
"""
import psycopg2
import os
from app.config import settings

def get_db_connection():
    """Obter conexão com o banco de dados"""
    try:
        # Tentar usar parâmetros separados para evitar problemas de encoding
        conn = psycopg2.connect(
            host="localhost",
            database="erp_db",
            user="erp_user", 
            password="erp_password",
            port=5432
        )
        return conn
    except Exception as e:
        # Se falhar, tentar usar a URL do settings
        try:
            import urllib.parse
            # Parse da URL para evitar problemas de encoding
            parsed = urllib.parse.urlparse(settings.database_url)
            conn = psycopg2.connect(
                host=parsed.hostname,
                database=parsed.path[1:],  # Remove a / do início
                user=parsed.username,
                password=parsed.password,
                port=parsed.port
            )
            return conn
        except Exception as e2:
            raise Exception(f"Erro ao conectar no banco: {e2}")