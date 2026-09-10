@echo off
echo ==============================================================================
echo [ClearBounce] Iniciando Infraestrutura (Postgres + Redis) e Backend Fastify
echo ==============================================================================

echo 1. Subindo containers do PostgreSQL e Redis...
docker compose up -d

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] O Docker Desktop precisa estar aberto e em execucao!
    echo Abra o Docker Desktop no seu Windows e tente novamente.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Aguardando inicializacao do PostgreSQL (4 segundos)...
timeout /t 4 /nobreak >nul

echo.
echo 3. Executando migrations do Kysely...
cd server
call npm.cmd run migrate

echo.
echo 4. Iniciando API Fastify na porta 3333...
call npm.cmd run dev
