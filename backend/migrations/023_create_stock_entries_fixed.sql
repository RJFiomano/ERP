-- Migration: Sistema de Entradas de Estoque
-- Adaptado para usar a tabela suppliers existente

-- Sequência para numeração automática das entradas
CREATE SEQUENCE IF NOT EXISTS seq_entrada_estoque_numero START 1;

-- Tabela principal de entradas de estoque
CREATE TABLE IF NOT EXISTS entradas_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_entrada VARCHAR(20) UNIQUE NOT NULL DEFAULT 'ENT' || LPAD(nextval('seq_entrada_estoque_numero')::TEXT, 6, '0'),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    pedido_id UUID REFERENCES pedidos_compra(id),
    user_id UUID, -- Usuário responsável pela entrada
    
    -- Dados da NFe
    nfe_numero VARCHAR(20),
    nfe_serie VARCHAR(10),
    nfe_chave_acesso VARCHAR(44),
    nfe_data_emissao DATE,
    nfe_valor_total DECIMAL(15,2),
    nfe_xml_content TEXT, -- Armazenar XML completo da NFe
    
    -- Informações da entrada
    data_recebimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo_entrada VARCHAR(30) DEFAULT 'compra' CHECK (tipo_entrada IN ('compra', 'devolucao', 'transferencia', 'ajuste', 'consignacao', 'brinde')),
    
    -- Totais (calculados automaticamente)
    total_produtos DECIMAL(15,2) DEFAULT 0.00,
    total_nota DECIMAL(15,2) DEFAULT 0.00,
    divergencia_valor DECIMAL(15,2) GENERATED ALWAYS AS (ABS(COALESCE(nfe_valor_total, 0) - total_produtos)) STORED,
    
    -- Conferência e status
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'conferido', 'lancado', 'cancelado')),
    data_conferencia TIMESTAMP,
    conferido_por UUID,
    data_lancamento TIMESTAMP,
    lancado_por UUID,
    
    -- Observações
    observacoes TEXT,
    motivo_divergencia TEXT,
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_nfe_chave_length CHECK (nfe_chave_acesso IS NULL OR LENGTH(nfe_chave_acesso) = 44)
);

-- Tabela de itens das entradas
CREATE TABLE IF NOT EXISTS entradas_estoque_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrada_id UUID NOT NULL REFERENCES entradas_estoque(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Quantidades
    quantidade_nota DECIMAL(15,3) NOT NULL CHECK (quantidade_nota >= 0),
    quantidade_recebida DECIMAL(15,3) DEFAULT 0 CHECK (quantidade_recebida >= 0),
    quantidade_conferida DECIMAL(15,3),
    divergencia_quantidade DECIMAL(15,3) GENERATED ALWAYS AS (ABS(quantidade_nota - COALESCE(quantidade_conferida, quantidade_recebida))) STORED,
    
    -- Preços e custos
    preco_unitario DECIMAL(15,2) NOT NULL CHECK (preco_unitario >= 0),
    custo_unitario DECIMAL(15,2) CHECK (custo_unitario >= 0),
    valor_total_item DECIMAL(15,2) GENERATED ALWAYS AS (quantidade_recebida * COALESCE(custo_unitario, preco_unitario)) STORED,
    
    -- Informações do produto
    lote VARCHAR(50),
    data_validade DATE,
    numero_item INTEGER NOT NULL,
    
    -- Dados da NFe para conferência
    nfe_produto_codigo VARCHAR(50),
    nfe_produto_descricao TEXT,
    nfe_ncm VARCHAR(10),
    nfe_unidade VARCHAR(10),
    
    -- Impostos da NFe (para futura implementação fiscal)
    nfe_icms_valor DECIMAL(15,2) DEFAULT 0,
    nfe_ipi_valor DECIMAL(15,2) DEFAULT 0,
    nfe_pis_valor DECIMAL(15,2) DEFAULT 0,
    nfe_cofins_valor DECIMAL(15,2) DEFAULT 0,
    
    -- Status do item
    status_item VARCHAR(20) DEFAULT 'pendente' CHECK (status_item IN ('pendente', 'conferido', 'lancado', 'divergente')),
    motivo_divergencia TEXT,
    
    UNIQUE(entrada_id, numero_item)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_supplier ON entradas_estoque(supplier_id);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_pedido ON entradas_estoque(pedido_id);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_status ON entradas_estoque(status);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_data ON entradas_estoque(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_nfe ON entradas_estoque(nfe_numero, nfe_serie);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_user ON entradas_estoque(user_id);

CREATE INDEX IF NOT EXISTS idx_entradas_itens_entrada ON entradas_estoque_itens(entrada_id);
CREATE INDEX IF NOT EXISTS idx_entradas_itens_product ON entradas_estoque_itens(product_id);
CREATE INDEX IF NOT EXISTS idx_entradas_itens_lote ON entradas_estoque_itens(lote);
CREATE INDEX IF NOT EXISTS idx_entradas_itens_validade ON entradas_estoque_itens(data_validade);

-- Função para atualizar totais da entrada
CREATE OR REPLACE FUNCTION update_entrada_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE entradas_estoque SET
        total_produtos = (
            SELECT COALESCE(SUM(valor_total_item), 0)
            FROM entradas_estoque_itens 
            WHERE entrada_id = COALESCE(NEW.entrada_id, OLD.entrada_id)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.entrada_id, OLD.entrada_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para cálculos automáticos
DROP TRIGGER IF EXISTS trigger_entrada_totals ON entradas_estoque_itens;
CREATE TRIGGER trigger_entrada_totals
    AFTER INSERT OR UPDATE OR DELETE ON entradas_estoque_itens
    FOR EACH ROW EXECUTE FUNCTION update_entrada_totals();

-- Função para detectar divergências automaticamente
CREATE OR REPLACE FUNCTION check_entrada_divergences()
RETURNS TRIGGER AS $$
BEGIN
    -- Marcar item como divergente se houver diferença significativa
    IF NEW.divergencia_quantidade > 0 OR (NEW.quantidade_conferida IS NOT NULL AND NEW.quantidade_conferida != NEW.quantidade_nota) THEN
        NEW.status_item = 'divergente';
        NEW.motivo_divergencia = COALESCE(NEW.motivo_divergencia, 'Divergência de quantidade');
    ELSE
        NEW.status_item = 'conferido';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para detecção de divergências
DROP TRIGGER IF EXISTS trigger_check_divergences ON entradas_estoque_itens;
CREATE TRIGGER trigger_check_divergences
    BEFORE UPDATE OF quantidade_conferida ON entradas_estoque_itens
    FOR EACH ROW EXECUTE FUNCTION check_entrada_divergences();

COMMENT ON TABLE entradas_estoque IS 'Entradas de estoque com integração NFe e controle de divergências';
COMMENT ON TABLE entradas_estoque_itens IS 'Itens das entradas de estoque com rastreamento de lotes e validade';