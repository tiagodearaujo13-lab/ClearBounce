# ==============================================================================
# Script de Inicialização Git - ClearBounce
# ==============================================================================

Write-Host "Iniciando configuracao do Git para ClearBounce..." -ForegroundColor Cyan

# 1. Inicializar repositorio Git
git init

# 2. Adicionar todos os arquivos
git add -A

# 3. Commit profissional inicial
git commit -m "feat: scaffold completo do ClearBounce SaaS - Fastify + Next.js com pipeline SMTP, seguranca OWASP e testes"

# 4. Configurar branch main
git branch -M main

# 5. Criar branch develop
git branch develop

# 6. Adicionar repositorio remoto
git remote remove origin 2>$null
git remote add origin https://github.com/tiagodearaujo13-lab/ClearBounce.git

Write-Host "Repositorio configurado com sucesso!" -ForegroundColor Green
Write-Host "Branches locais: main e develop" -ForegroundColor Yellow
Write-Host "Remoto configurado: https://github.com/tiagodearaujo13-lab/ClearBounce.git" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para enviar para o GitHub, execute:" -ForegroundColor Cyan
Write-Host "  git push -u origin main" -ForegroundColor White
Write-Host "  git push -u origin develop" -ForegroundColor White
