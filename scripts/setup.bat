@echo off
echo 🚀 Iniciando setup do ERP Sistema...

REM Verificar se Docker está instalado
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker não está instalado. Instale o Docker antes de continuar.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose não está instalado. Instale o Docker Compose antes de continuar.
    pause
    exit /b 1
)

REM Criar arquivo .env se não existir
if not exist .env (
    echo 📄 Criando arquivo .env...
    copy .env.example .env
    echo ✅ Arquivo .env criado. Edite as configurações se necessário.
) else (
    echo 📄 Arquivo .env já existe.
)

REM Parar containers existentes (se houver)
echo 🛑 Parando containers existentes...
docker-compose down

REM Construir e iniciar containers
echo 🏗️  Construindo e iniciando containers...
docker-compose up -d --build

REM Aguardar banco de dados ficar disponível
echo ⏳ Aguardando banco de dados...
timeout /t 15 /nobreak >nul

REM Executar migrations e seed
echo 🗄️  Executando migrations e criando dados iniciais...
docker-compose exec -T api python seed_data.py

echo.
echo ✅ Setup concluído com sucesso!
echo.
echo 🌐 Acessos do sistema:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8000
echo    Swagger/OpenAPI: http://localhost:8000/docs
echo    PgAdmin: http://localhost:5050
echo.
echo 👤 Usuário padrão:
echo    Email: admin@local
echo    Senha: Admin!123
echo.
echo 📋 Para acompanhar os logs:
echo    docker-compose logs -f
echo.
echo 🛑 Para parar o sistema:
echo    docker-compose down
echo.
echo 🎉 Bom desenvolvimento!
pause