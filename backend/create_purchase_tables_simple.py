#!/usr/bin/env python3

import psycopg2

# Configurações do banco
DB_CONFIG = {
    'host': 'db',
    'port': 5432,
    'database': 'erp_db', 
    'user': 'erp_user',
    'password': 'erp_password'
}

def create_purchase_tables():
    """Criar tabelas de pedidos de compra de forma simples"""
    try:
        print("🔧 Criando tabelas de pedidos de compra...")
        
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Remover tabelas antigas se existirem
        cur.execute("DROP TABLE IF EXISTS pedidos_compra_itens CASCADE")
        cur.execute("DROP TABLE IF EXISTS pedidos_compra CASCADE")
        cur.execute("DROP SEQUENCE IF EXISTS seq_pedido_compra_numero CASCADE")
        
        print("🗑️ Tabelas antigas removidas")
        
        # Criar extensões necessárias
        cur.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
        
        # Criar sequência para numeração
        cur.execute("CREATE SEQUENCE seq_pedido_compra_numero START 1")
        
        # Criar tabela principal
        cur.execute("""
            CREATE TABLE pedidos_compra (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                numero_pedido VARCHAR(20) UNIQUE NOT NULL,
                supplier_id UUID REFERENCES suppliers(id),
                pessoa_id UUID REFERENCES suppliers(id),
                user_id UUID REFERENCES users(id),
                
                -- Datas
                data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
                data_entrega_prevista DATE,
                
                -- Valores
                subtotal DECIMAL(15,2) DEFAULT 0.00,
                desconto_total DECIMAL(15,2) DEFAULT 0.00,
                valor_frete DECIMAL(15,2) DEFAULT 0.00,
                valor_total DECIMAL(15,2) DEFAULT 0.00,
                
                -- Status e condições
                status VARCHAR(20) NOT NULL DEFAULT 'rascunho',
                condicoes_pagamento VARCHAR(50) DEFAULT 'a_vista',
                
                -- Logística
                local_entrega TEXT,
                observacoes TEXT,
                urgencia VARCHAR(20) DEFAULT 'normal',
                
                -- Auditoria
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                created_by UUID,
                updated_by UUID
            )
        """)
        
        print("✅ Tabela pedidos_compra criada")
        
        # Criar tabela de itens
        cur.execute("""
            CREATE TABLE pedidos_compra_itens (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                pedido_id UUID NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES products(id),
                
                -- Quantidades
                quantidade DECIMAL(15,3) NOT NULL DEFAULT 0,
                quantidade_pedida DECIMAL(15,3) NOT NULL DEFAULT 0,
                quantidade_recebida DECIMAL(15,3) DEFAULT 0,
                
                -- Preços
                preco_unitario DECIMAL(15,2) DEFAULT 0.00,
                desconto_item DECIMAL(15,2) DEFAULT 0.00,
                preco_final DECIMAL(15,2) DEFAULT 0.00,
                subtotal_item DECIMAL(15,2) DEFAULT 0.00,
                valor_total_item DECIMAL(15,2) DEFAULT 0.00,
                
                -- Controle
                numero_item INTEGER,
                observacoes_item TEXT,
                status_item VARCHAR(20) DEFAULT 'pendente',
                
                -- Auditoria
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        print("✅ Tabela pedidos_compra_itens criada")
        
        # Criar índices
        cur.execute("CREATE INDEX idx_pedidos_compra_supplier ON pedidos_compra(supplier_id)")
        cur.execute("CREATE INDEX idx_pedidos_compra_status ON pedidos_compra(status)")
        cur.execute("CREATE INDEX idx_pedidos_compra_data ON pedidos_compra(data_pedido)")
        cur.execute("CREATE INDEX idx_pedidos_compra_itens_pedido ON pedidos_compra_itens(pedido_id)")
        cur.execute("CREATE INDEX idx_pedidos_compra_itens_produto ON pedidos_compra_itens(product_id)")
        
        print("✅ Índices criados")
        
        # Função para atualizar numero_pedido automaticamente
        cur.execute("""
            CREATE OR REPLACE FUNCTION set_numero_pedido()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.numero_pedido IS NULL OR NEW.numero_pedido = '' THEN
                    NEW.numero_pedido := 'PC' || LPAD(nextval('seq_pedido_compra_numero')::TEXT, 6, '0');
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
        
        # Trigger para numero_pedido
        cur.execute("""
            DROP TRIGGER IF EXISTS trigger_set_numero_pedido ON pedidos_compra;
            CREATE TRIGGER trigger_set_numero_pedido
                BEFORE INSERT ON pedidos_compra
                FOR EACH ROW
                EXECUTE FUNCTION set_numero_pedido();
        """)
        
        print("✅ Triggers criados")
        
        # Confirmar transação
        conn.commit()
        
        # Verificar se as tabelas foram criadas
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name IN ('pedidos_compra', 'pedidos_compra_itens')
            ORDER BY table_name
        """)
        tables = cur.fetchall()
        
        print(f"\n🎯 Tabelas criadas: {[t[0] for t in tables]}")
        
        cur.close()
        conn.close()
        
        print("\n🎉 Tabelas de pedidos de compra criadas com sucesso!")
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        if 'conn' in locals():
            conn.rollback()
            cur.close()
            conn.close()
        return False

if __name__ == "__main__":
    success = create_purchase_tables()
    if success:
        print("\n✅ Pronto! Agora você pode criar pedidos de compras no sistema!")
    else:
        print("\n❌ Falha na criação das tabelas.")