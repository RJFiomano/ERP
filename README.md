# ERP Sistema - PME Brasil

Sistema ERP completo para Pequenas e Médias Empresas no Brasil, desenvolvido com FastAPI (Python) e React (TypeScript).

## 🚀 Funcionalidades

### ✅ Implementado
- **Autenticação JWT** com refresh token e recuperação de senha
- **Autorização RBAC** (Admin, Financeiro, Vendas, Estoque, Leitura)
- **Dashboard** com KPIs principais
- **Interface responsiva** com Material UI
- **Estrutura completa** de cadastros (stubs implementados)
- **Mock de integrações** (NF-e, pagamentos, email)

### 📋 Módulos do Sistema

#### 🔐 Autenticação e Usuários
- Login/logout com JWT
- Recuperação de senha por email
- Gerenciamento de usuários (RBAC)
- Usuário seed: `admin@local` / `Admin!123`

#### 📊 Cadastros
- **Clientes** (PF/PJ, CPF/CNPJ, endereços)
- **Fornecedores** (PF/PJ, dados completos)
- **Produtos** (SKU, NCM, CFOP, CST, preços, estoque)

#### 💰 Financeiro
- Contas a receber/pagar
- Integração de pagamentos (PIX, cartão, boleto - mock)
- Dashboard financeiro com KPIs

#### 🛒 Vendas
- Pedidos de venda com itens
- Cálculo automático de impostos (ICMS, PIS, COFINS)
- Emissão NF-e SP (mock)

#### 📦 Estoque
- Controle de entradas/saídas
- Ajustes de inventário
- Alertas de estoque mínimo
- Movimentações com histórico

#### 📈 Relatórios
- Dashboard com gráficos
- Relatórios de vendas, financeiro, estoque
- Exportação CSV/PDF
- Filtros avançados

## 🛠 Stack Tecnológica

### Backend
- **Python 3.11** + FastAPI + Uvicorn
- **PostgreSQL** com SQLAlchemy 2.x + Alembic
- **JWT** para autenticação + RBAC
- **Pydantic v2** para validação
- **Bcrypt** para hash de senhas

### Frontend
- **React 18** + TypeScript + Vite
- **Material UI (MUI)** para interface
- **React Query** para gerenciamento de estado
- **React Router** para navegação
- **Axios** com interceptors JWT

### Infraestrutura
- **Docker Compose** (API + Web + DB + PgAdmin)
- **PostgreSQL 15** com extensões UUID
- **Nginx** (configuração futura para produção)

## 📦 Instalação e Execução

### Pré-requisitos
- Docker e Docker Compose
- Git

### 1. Clone do Projeto
```bash
git clone <repository-url>
cd ERP
```

### 2. Configuração do Ambiente
```bash
# Copie e ajuste as variáveis de ambiente
cp .env.example .env

# Edite o arquivo .env conforme necessário
# Para desenvolvimento, os valores padrão funcionam
```

### 3. Execução com Docker
```bash
# Iniciar todos os serviços
docker compose up -d

# Para acompanhar os logs
docker compose logs -f

# Para parar os serviços
docker compose down
```

### 4. Inicialização do Banco
```bash
# Executar migrations e seed inicial
docker compose exec api python seed_data.py
```

## 🌐 Acessos do Sistema

Após a execução dos comandos acima:

- **Frontend (React)**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Swagger/OpenAPI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc  
- **PgAdmin**: http://localhost:5050
  - Email: `admin@admin.com`
  - Senha: `admin`

### 👤 Usuário Padrão
- **Email**: `admin@local`
- **Senha**: `Admin!123`
- **Perfil**: Administrador

## 🔧 Desenvolvimento

### Backend (FastAPI)
```bash
# Instalar dependências
cd backend
pip install -r requirements.txt

# Executar em modo desenvolvimento
uvicorn app.main:app --reload

# Executar testes
pytest

# Criar nova migration
alembic revision --autogenerate -m "Descrição da mudança"

# Aplicar migrations
alembic upgrade head
```

### Frontend (React)
```bash
# Instalar dependências
cd frontend
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Linting
npm run lint
```

## 📊 Fluxo Demonstrativo Completo

O sistema permite demonstrar um fluxo completo de vendas:

1. **Cadastrar Cliente** (PJ: ACME Ltda, CNPJ)
2. **Cadastrar Produto** (Widget A, preço R$ 100,00, estoque 50)
3. **Criar Venda** (5 unidades = R$ 500,00)
4. **Gerar AR** (conta a receber de R$ 500,00)
5. **Simular Pagamento PIX** (baixa conta recebível)
6. **Emitir NF-e SP** (mock - PDF gerado)

## 🗂 Estrutura de Arquivos

```
ERP/
├── backend/
│   ├── app/
│   │   ├── core/          # Configuração, segurança, database
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── routers/       # FastAPI routers
│   │   ├── services/      # Business logic
│   │   └── tests/         # Testes automatizados
│   ├── alembic/           # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── services/      # API clients
│   │   └── types/         # TypeScript types
│   └── package.json
├── docker/
│   └── init.sql          # Scripts de inicialização DB
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚧 Próximos Passos (Roadmap)

### Curto Prazo
- [ ] CRUD completo de clientes/fornecedores/produtos
- [ ] Implementação real de vendas com itens
- [ ] Integração real com API de CEP
- [ ] Validação de CPF/CNPJ no frontend

### Médio Prazo
- [ ] Integração real NF-e (SEFAZ SP)
- [ ] Gateway de pagamentos real (PIX, cartões)
- [ ] Relatórios com gráficos (Chart.js/Recharts)
- [ ] Upload de certificado digital A1

### Longo Prazo
- [ ] Multi-tenant (várias empresas)
- [ ] App mobile (React Native)
- [ ] BI/Analytics avançado
- [ ] Integração contábil

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Para dúvidas e suporte:
- Abra uma issue no GitHub
- Email: suporte@erpsistema.com.br
- Documentação: [Wiki do Projeto]

---
**ERP Sistema** - Desenvolvido para PMEs brasileiras 🇧🇷