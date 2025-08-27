from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(prefix="/setup", tags=["Setup"])

@router.post("/create-sale-tables")
async def create_sale_tables(
    db: Session = Depends(get_db)
):
    """Cria as tabelas sale_orders e sale_order_items se não existirem"""
    
    sql_commands = """
    -- Criar extensão para UUID se não existir
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Adicionar colunas faltantes na tabela sale_orders (se não existirem)
    DO $$ 
    BEGIN
        -- Adicionar order_date se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='order_date') THEN
            ALTER TABLE sale_orders ADD COLUMN order_date TIMESTAMP DEFAULT NOW();
        END IF;
        
        -- Adicionar delivery_date se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='delivery_date') THEN
            ALTER TABLE sale_orders ADD COLUMN delivery_date TIMESTAMP;
        END IF;
        
        -- Adicionar payment_method se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='payment_method') THEN
            ALTER TABLE sale_orders ADD COLUMN payment_method VARCHAR(30) DEFAULT 'cash';
        END IF;
        
        -- Adicionar seller_name se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='seller_name') THEN
            ALTER TABLE sale_orders ADD COLUMN seller_name VARCHAR(100);
        END IF;
        
        -- Adicionar is_active se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='is_active') THEN
            ALTER TABLE sale_orders ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
        
        -- Adicionar discount_percent se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='discount_percent') THEN
            ALTER TABLE sale_orders ADD COLUMN discount_percent NUMERIC(5, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar icms_total se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='icms_total') THEN
            ALTER TABLE sale_orders ADD COLUMN icms_total NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar pis_total se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='pis_total') THEN
            ALTER TABLE sale_orders ADD COLUMN pis_total NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar cofins_total se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='cofins_total') THEN
            ALTER TABLE sale_orders ADD COLUMN cofins_total NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar tax_total se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='tax_total') THEN
            ALTER TABLE sale_orders ADD COLUMN tax_total NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar internal_notes se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='internal_notes') THEN
            ALTER TABLE sale_orders ADD COLUMN internal_notes TEXT;
        END IF;
        
        -- Adicionar delivery_address se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_orders' AND column_name='delivery_address') THEN
            ALTER TABLE sale_orders ADD COLUMN delivery_address TEXT;
        END IF;
    END $$;

    -- Adicionar colunas faltantes na tabela sale_order_items (se não existirem)
    DO $$ 
    BEGIN
        -- Adicionar discount_percent se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='discount_percent') THEN
            ALTER TABLE sale_order_items ADD COLUMN discount_percent NUMERIC(5, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar discount_amount se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='discount_amount') THEN
            ALTER TABLE sale_order_items ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar gross_total se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='gross_total') THEN
            ALTER TABLE sale_order_items ADD COLUMN gross_total NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar net_total se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='net_total') THEN
            ALTER TABLE sale_order_items ADD COLUMN net_total NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar icms_rate se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='icms_rate') THEN
            ALTER TABLE sale_order_items ADD COLUMN icms_rate NUMERIC(5, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar pis_rate se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='pis_rate') THEN
            ALTER TABLE sale_order_items ADD COLUMN pis_rate NUMERIC(5, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar cofins_rate se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='cofins_rate') THEN
            ALTER TABLE sale_order_items ADD COLUMN cofins_rate NUMERIC(5, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar icms_amount se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='icms_amount') THEN
            ALTER TABLE sale_order_items ADD COLUMN icms_amount NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar pis_amount se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='pis_amount') THEN
            ALTER TABLE sale_order_items ADD COLUMN pis_amount NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Adicionar cofins_amount se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_order_items' AND column_name='cofins_amount') THEN
            ALTER TABLE sale_order_items ADD COLUMN cofins_amount NUMERIC(10, 2) DEFAULT 0;
        END IF;
        
        -- Permitir NULL no product_id para produtos de teste
        ALTER TABLE sale_order_items ALTER COLUMN product_id DROP NOT NULL;
    END $$;

    -- Criar índices se não existirem
    CREATE INDEX IF NOT EXISTS idx_sale_orders_client_id ON sale_orders(client_id);
    CREATE INDEX IF NOT EXISTS idx_sale_orders_status ON sale_orders(status);
    CREATE INDEX IF NOT EXISTS idx_sale_orders_order_number ON sale_orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_sale_order_items_sale_order_id ON sale_order_items(sale_order_id);
    CREATE INDEX IF NOT EXISTS idx_sale_order_items_product_id ON sale_order_items(product_id);
    """
    
    try:
        # Executar comandos SQL
        db.execute(text(sql_commands))
        db.commit()
        
        # Verificar colunas atualizadas
        result = db.execute(text("""
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name IN ('sale_orders', 'sale_order_items')
            ORDER BY table_name, ordinal_position;
        """))
        
        columns_info = {}
        for row in result.fetchall():
            table_name = row[0]
            column_name = row[1]
            if table_name not in columns_info:
                columns_info[table_name] = []
            columns_info[table_name].append(column_name)
        
        return {
            "success": True,
            "message": "Sistema de vendas preparado com sucesso!",
            "tables_updated": columns_info
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar tabelas: {str(e)}"
        )

@router.get("/check-tables")
async def check_tables(
    db: Session = Depends(get_db)
):
    """Verifica quais tabelas existem no banco"""
    
    try:
        result = db.execute(text("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name IN ('sale_orders', 'sale_order_items')
            ORDER BY table_name, ordinal_position;
        """))
        
        tables_info = {}
        for row in result.fetchall():
            table_name = row[0]
            column_name = row[1]
            data_type = row[2]
            
            if table_name not in tables_info:
                tables_info[table_name] = []
            tables_info[table_name].append({
                "column": column_name,
                "type": data_type
            })
        
        return {
            "success": True,
            "tables": tables_info
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao verificar tabelas: {str(e)}"
        )