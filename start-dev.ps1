# ==============================================================================
# Script de Inicialização de Infraestrutura e Backend - ClearBounce
# ==============================================================================

Write-Host "Iniciando PostgreSQL 16 e Redis 7 via Docker Compose..." -ForegroundColor Cyan

docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Nao foi possivel conectar ao Docker Desktop." -ForegroundColor Red
    Write-Host "Por favor, abra o aplicativo Docker Desktop no Windows e aguarde o status 'Engine running'." -ForegroundColor Yellow
    exit 1
}

Write-Host "Aguardando inicializacao do PostgreSQL (4 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

Write-Host "Executando migrations do banco de dados (Kysely)..." -ForegroundColor Cyan
Set-Location server
npm.cmd run migrate

Write-Host "Iniciando backend Fastify em desenvolvimento..." -ForegroundColor Green
npm.cmd run dev
