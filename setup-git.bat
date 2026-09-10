@echo off
echo ==============================================================================
echo Inicializando Git para ClearBounce...
echo ==============================================================================

git init
git add -A
git commit -m "feat: scaffold completo do ClearBounce SaaS - Fastify + Next.js com pipeline SMTP, seguranca OWASP e testes"
git branch -M main
git branch develop
git remote remove origin 2>nul
git remote add origin https://github.com/tiagodearaujo13-lab/ClearBounce.git

echo.
echo Repositorio inicializado com sucesso!
echo Branches locais: main e develop
echo Remoto: https://github.com/tiagodearaujo13-lab/ClearBounce.git
echo.
echo Enviando para o GitHub...
git push -u origin main
git push -u origin develop

echo.
echo Concluido!
pause
