#!/bin/bash

# Setup script para ERP Sistema
# Este script automatiza a configuração inicial do projeto

echo "🚀 Iniciando setup do ERP Sistema..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Instale o Docker antes de continuar."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Instale o Docker Compose antes de continuar."
    exit 1
fi

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "📄 Criando arquivo .env..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Edite as configurações se necessário."
else
    echo "📄 Arquivo .env já existe."
fi

# Parar containers existentes (se houver)
echo "🛑 Parando containers existentes..."
docker-compose down

# Construir e iniciar containers
echo "🏗️  Construindo e iniciando containers..."
docker-compose up -d --build

# Aguardar banco de dados ficar disponível
echo "⏳ Aguardando banco de dados..."
sleep 15

# Executar migrations e seed
echo "🗄️  Executando migrations e criando dados iniciais..."
docker-compose exec -T api python seed_data.py

echo ""
echo "✅ Setup concluído com sucesso!"
echo ""
echo "🌐 Acessos do sistema:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   Swagger/OpenAPI: http://localhost:8000/docs"
echo "   PgAdmin: http://localhost:5050"
echo ""
echo "👤 Usuário padrão:"
echo "   Email: admin@local"
echo "   Senha: Admin!123"
echo ""
echo "📋 Para acompanhar os logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Para parar o sistema:"
echo "   docker-compose down"
echo ""
echo "🎉 Bom desenvolvimento!"