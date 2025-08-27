# Módulo de Compras e Gestão de Estoque - ERP

## Visão Geral

Este documento descreve o módulo completo de compras e gestão de estoque implementado para o sistema ERP, incluindo estrutura de banco de dados, APIs e funcionalidades.

## Estrutura do Banco de Dados

### 1. Fornecedores (Extensão de Contatos)
**Tabela:** `contacts` (campos adicionais)
- Campos específicos para fornecedores
- Condições de pagamento padrão
- Prazos de entrega e pedidos mínimos
- Avaliação e histórico de compras

### 2. Pedidos de Compra
**Tabelas:** `pedidos_compra` e `pedidos_compra_itens`
- Controle completo de pedidos
- Status: rascunho → enviado → confirmado → recebido
- Cálculo automático de totais e impostos
- Numeração sequencial automática (PED000001)

### 3. Entradas de Estoque
**Tabelas:** `entradas_estoque` e `entradas_estoque_itens`
- Recebimento de mercadorias
- Importação de dados da NFe
- Controle de lotes e validades
- Detecção automática de divergências

### 4. Movimentações de Estoque
**Tabelas:** `movimentacoes_estoque` e `estoque_atual`
- Histórico completo de todas movimentações
- Cálculo automático de custo médio
- Estoque atual consolidado
- Alertas de reposição automáticos

### 5. Custos de Produtos
**Tabelas:** `custos_produtos` e `politicas_precos`
- Histórico de custos por compra
- Cálculo automático de preços sugeridos
- Políticas de margem por produto
- Controle de preços promocionais

### 6. Contas a Pagar
**Tabelas:** `contas_pagar`, `contas_pagar_parcelas`, `contas_pagar_pagamentos`
- Gestão financeira das compras
- Parcelamento automático
- Controle de vencimentos e atrasos
- Histórico completo de pagamentos

## APIs Implementadas

### Compras (`/api/purchase`)
- `GET /suppliers` - Lista de fornecedores
- `PUT /suppliers/{id}` - Atualizar dados do fornecedor
- `POST /orders` - Criar pedido de compra
- `GET /orders` - Buscar pedidos
- `GET /orders/{id}` - Detalhes do pedido
- `PUT /orders/{id}/status` - Atualizar status

### Estoque (`/api/stock`)
- `POST /entries` - Criar entrada de estoque
- `POST /entries/{id}/process` - Processar entrada (dar baixa)
- `POST /import-nfe` - Importar XML da NFe
- `POST /movements` - Movimentação manual
- `GET /movements` - Histórico de movimentações
- `GET /current` - Situação atual do estoque
- `GET /product/{id}` - Detalhes do produto
- `GET /reports/*` - Relatórios diversos

### Contas a Pagar (`/api/accounts-payable`)
- `POST /` - Criar conta a pagar
- `GET /` - Buscar contas
- `GET /{id}` - Detalhes da conta
- `POST /payments` - Processar pagamento
- `GET /reports/*` - Relatórios financeiros
- `GET /dashboard/summary` - Dashboard resumo

## Funcionalidades Principais

### 1. Gestão de Fornecedores
- Cadastro integrado com sistema de contatos
- Condições comerciais específicas
- Histórico de compras e avaliações
- Controle de fornecedores ativos/inativos

### 2. Pedidos de Compra
- Criação de pedidos com múltiplos itens
- Cálculo automático de valores e impostos
- Controle de status e aprovações
- Vinculação com recebimentos

### 3. Entrada de Estoque
- Recebimento baseado em pedidos ou avulso
- Importação automática de XMLs da NFe
- Conferência de quantidades e valores
- Detecção de divergências automática

### 4. Controle de Estoque
- Movimentações em tempo real
- Cálculo automático de custo médio ponderado
- Alertas de estoque mínimo
- Controle de lotes e validades
- Relatórios de valorização

### 5. Gestão de Custos
- Histórico completo de custos por produto
- Cálculo automático de preços sugeridos
- Políticas de margem personalizáveis
- Análise de rentabilidade

### 6. Contas a Pagar
- Geração automática a partir das entradas
- Parcelamento flexível
- Controle de vencimentos
- Relatórios financeiros
- Projeção de fluxo de caixa

## Fluxo Operacional

### Processo Completo de Compra:

1. **Criação do Pedido**
   - Selecionar fornecedor
   - Adicionar produtos e quantidades
   - Definir condições de pagamento
   - Enviar pedido → Status: "enviado"

2. **Confirmação do Pedido**
   - Fornecedor confirma → Status: "confirmado"
   - Aguardar entrega

3. **Recebimento da Mercadoria**
   - Criar entrada de estoque
   - Importar XML da NFe (opcional)
   - Conferir quantidades e valores
   - Status pedido → "recebido"

4. **Processamento da Entrada**
   - Conferência final
   - Processar entrada → Atualiza estoque
   - Cria movimentações automáticas
   - Atualiza custos médios

5. **Geração das Contas a Pagar**
   - Criar conta a pagar da NFe
   - Definir parcelamento
   - Controlar vencimentos

6. **Pagamento**
   - Registrar pagamentos das parcelas
   - Atualizar status das contas
   - Relatórios financeiros

## Triggers e Automações

### Triggers Implementados:
- **Numeração automática** de pedidos, entradas e contas
- **Cálculo automático** de valores e totais
- **Atualização de estoque** após movimentações
- **Cálculo de custo médio** ponderado
- **Criação de parcelas** automáticas
- **Atualização de status** baseado em pagamentos
- **Detecção de divergências** automática

### Validações:
- Estoque não pode ficar negativo (exceto ajustes)
- Fornecedores devem estar ativos
- Produtos devem existir no cadastro
- Valores devem ser positivos
- Datas de vencimento devem ser futuras

## Relatórios Disponíveis

### Estoque:
- Produtos com estoque baixo
- Valorização de estoque
- Resumo de movimentações
- Análise de custos e margens

### Financeiro:
- Contas em atraso
- Cronograma de pagamentos
- Fluxo de caixa projetado
- Contas por fornecedor
- Dashboard resumo

### Compras:
- Performance de fornecedores
- Resumo de pedidos
- Análise de recebimentos

## Integrações

### Sistema Atual:
- **Cadastro de Produtos** - Reutiliza produtos existentes
- **Cadastro de Contatos** - Extensão para fornecedores
- **Sistema de Vendas** - Movimentações de saída
- **Autenticação** - Controle de usuários

### Futuras Integrações:
- **Contabilidade** - Lançamentos automáticos
- **Fiscal** - Integração com SPED
- **BI/Dashboards** - Análises avançadas

## Segurança

### Row Level Security (RLS):
- Todas as tabelas com RLS habilitado
- Usuários só acessam dados da própria empresa
- Controle por perfil de usuário

### Auditoria:
- Campos de controle em todas as tabelas
- Histórico de alterações
- Rastreabilidade completa

## Como Utilizar

### Para Desenvolvedores:

1. **Executar Migrations:**
```bash
# Executar as migrations na ordem:
015_create_supplier_extension.sql
016_create_purchase_orders.sql
017_create_stock_entries.sql
018_create_stock_movements.sql
019_create_product_costs.sql
020_create_accounts_payable.sql
```

2. **Registrar Rotas:**
```python
# No main.py ou app.py
from app.routes import purchase_routes, stock_routes, accounts_payable_routes

app.include_router(purchase_routes.router)
app.include_router(stock_routes.router)
app.include_router(accounts_payable_routes.router)
```

3. **Utilizar Serviços:**
```python
from app.services.purchase_service import PurchaseService
from app.services.stock_service import StockService
from app.services.accounts_payable_service import AccountsPayableService

# Exemplo de uso
service = PurchaseService()
result = await service.get_suppliers({'active_only': True})
```

### Para Usuários Finais:

1. **Cadastrar Fornecedores:**
   - Usar cadastro de contatos existente
   - Marcar como tipo "supplier"
   - Definir condições comerciais

2. **Criar Pedidos:**
   - Selecionar fornecedor
   - Adicionar produtos
   - Configurar prazos e condições

3. **Receber Mercadorias:**
   - Criar entrada de estoque
   - Importar XML da NFe
   - Conferir e processar

4. **Controlar Pagamentos:**
   - Acompanhar vencimentos
   - Registrar pagamentos
   - Monitorar fluxo de caixa

## Tecnologias Utilizadas

- **Backend:** Python/FastAPI
- **Banco de Dados:** PostgreSQL
- **ORM:** Psycopg2 (raw SQL)
- **Autenticação:** JWT/Supabase Auth
- **Validação:** Pydantic Models
- **Logging:** Python logging

## Conclusão

O módulo de compras implementado oferece uma solução completa para:
- Gestão de fornecedores e pedidos
- Controle rigoroso de estoque
- Gestão financeira integrada
- Relatórios gerenciais completos
- Automações que reduzem erros manuais

O sistema está pronto para uso em produção e pode ser facilmente expandido com novas funcionalidades conforme a necessidade do negócio.