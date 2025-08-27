# Arquitetura do Sistema ERP

## 📋 Visão Geral

Sistema ERP desenvolvido em arquitetura de microserviços com separação clara entre backend (API REST) e frontend (SPA), utilizando padrões modernos de desenvolvimento e boas práticas de segurança.

## 🏗️ Arquitetura Geral

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Frontend      │    │   Backend       │    │   Database      │
│   (React +      │◄──►│   (FastAPI +    │◄──►│   (PostgreSQL)  │
│   TypeScript)   │    │   SQLAlchemy)   │    │                 │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Backend (FastAPI)

### Estrutura de Camadas

```
app/
├── main.py              # Aplicação FastAPI principal
├── config.py            # Configurações e variáveis de ambiente
├── core/
│   ├── database.py      # Configuração SQLAlchemy + sessões
│   └── security.py      # JWT, RBAC, criptografia
├── models/              # Modelos de dados (SQLAlchemy ORM)
├── schemas/             # Schemas de validação (Pydantic)
├── routers/             # Endpoints da API (FastAPI routers)
├── services/            # Lógica de negócio
├── repositories/        # Camada de acesso a dados
└── tests/               # Testes automatizados
```

### Padrões Utilizados

#### 1. **Repository Pattern**
```python
# Repository para abstração do acesso a dados
class UserRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_email(self, email: str) -> User:
        return self.db.query(User).filter(User.email == email).first()
```

#### 2. **Service Layer**
```python
# Service para lógica de negócio
class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
    
    def authenticate(self, email: str, password: str) -> User:
        # Lógica de autenticação
```

#### 3. **Dependency Injection**
```python
# FastAPI DI para injeção de dependências
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # Endpoint com dependência injetada
```

### Segurança

#### JWT + RBAC
- **Access Token**: 30 minutos (configurável)
- **Refresh Token**: 7 dias (configurável)
- **Roles**: admin, financeiro, vendas, estoque, leitura
- **CORS**: Configurado para desenvolvimento

#### Middleware de Segurança
```python
# Middleware para validação de JWT
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Validação automática de tokens
```

## 🌐 Frontend (React + TypeScript)

### Estrutura de Componentes

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Layout/          # Layout principal com sidebar
│   └── ProtectedRoute   # HOC para rotas protegidas
├── contexts/            # React Contexts (Auth, Theme)
├── pages/               # Páginas da aplicação
├── services/            # Clientes da API (Axios)
├── types/               # Definições TypeScript
└── utils/               # Utilitários e helpers
```

### Padrões de Estado

#### 1. **React Query** para Server State
```typescript
// Cache automático de dados da API
const { data, isLoading } = useQuery('users', fetchUsers);
```

#### 2. **Context API** para Client State
```typescript
// Estado global de autenticação
const AuthContext = createContext<AuthContextType>();
```

#### 3. **Custom Hooks**
```typescript
// Hook personalizado para autenticação
const useAuth = () => {
    const context = useContext(AuthContext);
    return context;
};
```

### Interceptors HTTP

```typescript
// Interceptor para refresh automático de tokens
api.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401) {
            // Renovar token automaticamente
        }
    }
);
```

## 🗄️ Banco de Dados (PostgreSQL)

### Modelagem

#### Tabelas Base
```sql
-- Modelo base para todas as tabelas
CREATE TABLE base_model (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP NULL
);
```

#### Relacionamentos
```sql
-- Exemplo de relacionamento
CREATE TABLE sales (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    -- outros campos
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY,
    sale_id UUID REFERENCES sales(id),
    product_id UUID REFERENCES products(id),
    -- outros campos
);
```

### Migrations (Alembic)
```python
# Migration automática com Alembic
alembic revision --autogenerate -m "Add sales tables"
alembic upgrade head
```

## 🔐 Autenticação e Autorização

### Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as API
    participant D as Database
    
    F->>A: POST /auth/login (email, password)
    A->>D: Validar usuário
    D->>A: Dados do usuário
    A->>F: JWT tokens + user data
    F->>F: Armazenar tokens no localStorage
    
    loop Requisições autenticadas
        F->>A: Request com Authorization header
        A->>A: Validar JWT token
        A->>F: Response
    end
    
    Note over F,A: Token expira
    F->>A: POST /auth/refresh (refresh_token)
    A->>F: Novo access_token
```

### RBAC (Role-Based Access Control)

```python
# Decorator para controle de acesso
@require_roles("admin", "financeiro")
def financial_endpoint():
    # Apenas admin e financeiro podem acessar
```

## 🐳 Containerização (Docker)

### Docker Compose Services

```yaml
services:
  api:      # Backend FastAPI + Uvicorn
  web:      # Frontend React + Vite  
  db:       # PostgreSQL + extensões
  pgadmin:  # Interface de administração
```

### Volumes Persistentes
- `postgres_data`: Dados do banco
- `./backend:/app`: Hot reload do backend
- `./frontend:/app`: Hot reload do frontend

## 🧪 Testes

### Backend (PyTest)
```python
# Testes com banco de dados em memória
@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///test.db")
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
```

### Frontend (Jest + React Testing Library)
```typescript
// Testes de componentes React
test('should render login form', () => {
    render(<Login />);
    expect(screen.getByRole('button')).toBeInTheDocument();
});
```

## 📊 Monitoramento e Logs

### Logs Estruturados
```python
import logging
logger = logging.getLogger(__name__)

# Log estruturado com contexto
logger.info("User login", extra={
    "user_id": user.id,
    "ip_address": request.client.host
})
```

### Métricas (Futuro)
- Prometheus para métricas
- Grafana para dashboards
- Jaeger para tracing distribuído

## 🚀 Deploy e CI/CD (Roadmap)

### Ambientes
- **Development**: Docker Compose local
- **Staging**: Kubernetes cluster
- **Production**: Kubernetes com Helm

### Pipeline CI/CD
```yaml
# GitHub Actions exemplo
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: docker-compose run api pytest
  
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: kubectl apply -f k8s/
```

## 🔧 Configurações por Ambiente

### Variáveis de Ambiente
```bash
# Development
DATABASE_URL=postgresql://user:pass@localhost/db
ENVIRONMENT=development
DEBUG=true

# Production  
DATABASE_URL=postgresql://user:pass@prod-db/db
ENVIRONMENT=production
DEBUG=false
JWT_SECRET_KEY=super-secret-production-key
```

## 📈 Escalabilidade

### Horizontal Scaling
- API stateless permite múltiplas instâncias
- Load balancer (Nginx/HAProxy)
- Database connection pooling

### Performance
- Redis para cache de sessões
- CDN para assets estáticos
- Database read replicas

## 🔒 Segurança

### Boas Práticas Implementadas
- ✅ Validação de entrada (Pydantic)
- ✅ Sanitização de SQL (SQLAlchemy ORM)
- ✅ CORS configurado
- ✅ Rate limiting (futuro)
- ✅ HTTPS em produção
- ✅ Secrets em variáveis de ambiente

### Auditoria e Compliance
- Logs de auditoria para ações críticas
- Conformidade LGPD (futuro)
- Backup automático de dados

---
Esta arquitetura garante escalabilidade, manutenibilidade e segurança para o crescimento do sistema ERP.