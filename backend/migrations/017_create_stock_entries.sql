-- Migration: Criação das tabelas de entrada de estoque
-- Tabelas: entradas_estoque e entradas_estoque_itens

-- Tabela principal de entradas de estoque
CREATE TABLE IF NOT EXISTS entradas_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_entrada VARCHAR(20) UNIQUE NOT NULL, -- ENT000001, ENT000002, etc.
    
    -- Relações
    supplier_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    pedido_id UUID REFERENCES pedidos_compra(id) ON DELETE SET NULL, -- pode ser entrada sem pedido
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Dados da Nota Fiscal
    nfe_numero VARCHAR(20),
    nfe_serie VARCHAR(5),
    nfe_chave_acesso VARCHAR(44), -- chave de 44 dígitos
    nfe_data_emissao DATE,
    nfe_valor_total DECIMAL(15,2),
    nfe_xml_content TEXT, -- conteúdo completo do XML
    nfe_protocolo_autorizacao VARCHAR(20),
    
    -- Datas
    data_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_recebimento TIMESTAMP, -- quando físicamente recebido
    data_conferencia TIMESTAMP, -- quando conferido
    data_lancamento TIMESTAMP, -- quando lançado no sistema
    
    -- Status
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN (
        'pendente', 'recebido', 'conferido', 'lancado', 'cancelado', 'divergencia'
    )),
    tipo_entrada VARCHAR(20) DEFAULT 'compra' CHECK (tipo_entrada IN (
        'compra', 'devolucao', 'transferencia', 'ajuste', 'consignacao', 'brinde'
    )),
    
    -- Valores
    subtotal DECIMAL(15,2) DEFAULT 0.00,
    desconto_valor DECIMAL(15,2) DEFAULT 0.00,
    frete_valor DECIMAL(12,2) DEFAULT 0.00,
    seguro_valor DECIMAL(12,2) DEFAULT 0.00,
    outras_despesas DECIMAL(12,2) DEFAULT 0.00,
    
    -- Impostos
    icms_base_calculo DECIMAL(15,2) DEFAULT 0.00,
    icms_valor DECIMAL(12,2) DEFAULT 0.00,
    icms_st_valor DECIMAL(12,2) DEFAULT 0.00,
    ipi_valor DECIMAL(12,2) DEFAULT 0.00,
    pis_valor DECIMAL(12,2) DEFAULT 0.00,
    cofins_valor DECIMAL(12,2) DEFAULT 0.00,
    
    total_produtos DECIMAL(15,2) DEFAULT 0.00,
    total_nota DECIMAL(15,2) DEFAULT 0.00,
    
    -- Informações adicionais
    observacoes TEXT,
    observacoes_conferencia TEXT,
    numero_volumes INTEGER DEFAULT 0,
    peso_bruto DECIMAL(12,3) DEFAULT 0.000,
    peso_liquido DECIMAL(12,3) DEFAULT 0.000,
    
    -- Divergências
    tem_divergencia BOOLEAN DEFAULT false,
    divergencia_descricao TEXT,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Tabela de itens da entrada de estoque
CREATE TABLE IF NOT EXISTS entradas_estoque_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrada_id UUID NOT NULL REFERENCES entradas_estoque(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    pedido_item_id UUID REFERENCES pedidos_compra_itens(id) ON DELETE SET NULL,
    
    -- Quantidades
    quantidade_nota DECIMAL(12,3) NOT NULL, -- quantidade na nota fiscal
    quantidade_recebida DECIMAL(12,3), -- quantidade fisicamente recebida
    quantidade_conferida DECIMAL(12,3), -- quantidade após conferência
    quantidade_lancada DECIMAL(12,3) DEFAULT 0.00, -- quantidade lançada no estoque
    
    -- Valores unitários
    preco_unitario DECIMAL(12,2) NOT NULL,
    custo_unitario DECIMAL(12,2) NOT NULL, -- preço + rateio de despesas
    desconto_item DECIMAL(12,2) DEFAULT 0.00,
    
    -- Valores totais do item
    valor_total_item DECIMAL(15,2) NOT NULL,
    
    -- Impostos por item
    icms_percentual DECIMAL(5,2) DEFAULT 0.00,
    icms_valor DECIMAL(12,2) DEFAULT 0.00,
    icms_st_percentual DECIMAL(5,2) DEFAULT 0.00,
    icms_st_valor DECIMAL(12,2) DEFAULT 0.00,
    ipi_percentual DECIMAL(5,2) DEFAULT 0.00,
    ipi_valor DECIMAL(12,2) DEFAULT 0.00,
    pis_percentual DECIMAL(5,4) DEFAULT 0.00,
    pis_valor DECIMAL(12,2) DEFAULT 0.00,
    cofins_percentual DECIMAL(5,4) DEFAULT 0.00,
    cofins_valor DECIMAL(12,2) DEFAULT 0.00,
    
    -- Controle de qualidade/lote
    lote VARCHAR(50),
    data_fabricacao DATE,
    data_validade DATE,
    numero_serie VARCHAR(50),
    
    -- Informações da NFe por item
    nfe_item_numero INTEGER, -- número do item na NFe
    nfe_produto_codigo VARCHAR(50), -- código do produto na NFe
    nfe_produto_descricao TEXT, -- descrição na NFe
    nfe_produto_ncm VARCHAR(10), -- NCM na NFe
    nfe_produto_cfop VARCHAR(10), -- CFOP na NFe
    unidade_medida VARCHAR(10) DEFAULT 'UN',
    
    -- Divergências
    tem_divergencia BOOLEAN DEFAULT false,
    tipo_divergencia VARCHAR(20), -- quantidade, preco, produto, qualidade
    divergencia_descricao TEXT,
    divergencia_resolvida BOOLEAN DEFAULT false,
    
    -- Controle
    numero_item INTEGER NOT NULL, -- ordem do item na entrada
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(entrada_id, numero_item),
    CHECK (quantidade_nota > 0),
    CHECK (preco_unitario >= 0),
    CHECK (custo_unitario >= 0)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_supplier ON entradas_estoque(supplier_id);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_pedido ON entradas_estoque(pedido_id);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_status ON entradas_estoque(status);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_data ON entradas_estoque(data_entrada);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_nfe ON entradas_estoque(nfe_chave_acesso);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_numero ON entradas_estoque(numero_entrada);

CREATE INDEX IF NOT EXISTS idx_entradas_estoque_itens_entrada ON entradas_estoque_itens(entrada_id);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_itens_produto ON entradas_estoque_itens(product_id);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_itens_lote ON entradas_estoque_itens(lote);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_itens_validade ON entradas_estoque_itens(data_validade);
CREATE INDEX IF NOT EXISTS idx_entradas_estoque_itens_divergencia ON entradas_estoque_itens(tem_divergencia) WHERE tem_divergencia = true;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_entradas_estoque_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_entradas_estoque_updated_at
    BEFORE UPDATE ON entradas_estoque
    FOR EACH ROW
    EXECUTE FUNCTION update_entradas_estoque_updated_at();

CREATE TRIGGER trigger_entradas_estoque_itens_updated_at
    BEFORE UPDATE ON entradas_estoque_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_entradas_estoque_updated_at();

-- Função para gerar número da entrada automaticamente
CREATE OR REPLACE FUNCTION generate_numero_entrada()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    new_numero VARCHAR(20);
BEGIN
    IF NEW.numero_entrada IS NULL THEN
        -- Buscar próximo número
        SELECT COALESCE(
            MAX(CAST(SUBSTRING(numero_entrada FROM 4) AS INTEGER)) + 1, 
            1
        ) INTO next_number
        FROM entradas_estoque 
        WHERE numero_entrada ~ '^ENT[0-9]+$';
        
        -- Formatar número com zeros à esquerda
        new_numero := 'ENT' || LPAD(next_number::TEXT, 6, '0');
        NEW.numero_entrada := new_numero;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_numero_entrada
    BEFORE INSERT ON entradas_estoque
    FOR EACH ROW
    EXECUTE FUNCTION generate_numero_entrada();

-- Trigger para marcar divergência na entrada quando item tem divergência
CREATE OR REPLACE FUNCTION check_entrada_divergencia()
RETURNS TRIGGER AS $$
BEGIN
    -- Se algum item tem divergência, marcar a entrada também
    IF NEW.tem_divergencia = true THEN
        UPDATE entradas_estoque 
        SET tem_divergencia = true,
            divergencia_descricao = COALESCE(divergencia_descricao, '') || 
                CASE WHEN divergencia_descricao IS NOT NULL THEN E'\n' ELSE '' END ||
                'Item ' || NEW.numero_item || ': ' || COALESCE(NEW.divergencia_descricao, 'Divergência não especificada')
        WHERE id = NEW.entrada_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_entrada_divergencia
    AFTER INSERT OR UPDATE ON entradas_estoque_itens
    FOR EACH ROW
    WHEN (NEW.tem_divergencia = true)
    EXECUTE FUNCTION check_entrada_divergencia();

-- RLS (Row Level Security)
ALTER TABLE entradas_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas_estoque_itens ENABLE ROW LEVEL SECURITY;

-- Comentários para documentação
COMMENT ON TABLE entradas_estoque IS 'Entradas de estoque - recebimento de mercadorias';
COMMENT ON TABLE entradas_estoque_itens IS 'Itens das entradas de estoque com detalhes fiscais';

COMMENT ON COLUMN entradas_estoque.numero_entrada IS 'Número sequencial da entrada (ENT000001)';
COMMENT ON COLUMN entradas_estoque.nfe_chave_acesso IS 'Chave de acesso da NFe (44 dígitos)';
COMMENT ON COLUMN entradas_estoque.status IS 'pendente, recebido, conferido, lancado, cancelado, divergencia';
COMMENT ON COLUMN entradas_estoque.tipo_entrada IS 'compra, devolucao, transferencia, ajuste, consignacao, brinde';

COMMENT ON COLUMN entradas_estoque_itens.quantidade_nota IS 'Quantidade informada na nota fiscal';
COMMENT ON COLUMN entradas_estoque_itens.quantidade_recebida IS 'Quantidade fisicamente recebida';
COMMENT ON COLUMN entradas_estoque_itens.quantidade_conferida IS 'Quantidade após conferência';
COMMENT ON COLUMN entradas_estoque_itens.custo_unitario IS 'Custo final unitário incluindo rateio de despesas';