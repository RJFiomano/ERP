#!/usr/bin/env python3
"""Script para executar migração das tabelas sale_orders"""

import os
import sys
from pathlib import Path

# Adicionar o diretório do backend ao path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from app.config import settings

def run_migration():
    """Executa a migração SQL manualmente"""
    
    print("Executando migracao das tabelas sale_orders...")
    
    try:
        # Criar engine de conexão
        engine = create_engine(settings.database_url)
        
        # Ler arquivo SQL
        sql_file = backend_dir / "create_sale_orders.sql"
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Executar SQL
        with engine.begin() as conn:
            # Dividir em statements separados
            statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
            
            for i, statement in enumerate(statements, 1):
                if statement:
                    print(f"Executando statement {i}/{len(statements)}")
                    conn.execute(text(statement))
        
        print("Migracao executada com sucesso!")
        return True
        
    except Exception as e:
        print(f"Erro na migracao: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)