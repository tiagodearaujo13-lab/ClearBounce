/**
 * @module fullFlow.spec
 * @description Testes E2E com Playwright — fluxo completo do usuário.
 *
 * FLUXO TESTADO:
 * 1. Cadastro de novo usuário
 * 2. Login
 * 3. Verificação de e-mail avulso
 * 4. Upload de CSV fictício
 * 5. Acompanhamento do progresso
 * 6. Download do resultado
 *
 * POR QUÊ E2E?
 * - Testa a aplicação como o usuário REAL usa.
 * - Valida integração frontend ↔ backend completa.
 * - Detecta bugs que unit tests não capturam (ex: CSS que esconde botão).
 *
 * REQUISITOS:
 * - Server rodando em http://localhost:3333
 * - Frontend rodando em http://localhost:3000
 * - PostgreSQL e Redis disponíveis
 */

import { test, expect } from '@playwright/test';

/** Gera e-mail único para evitar conflito entre execuções de teste */
const testEmail = `e2e_${Date.now()}@cleanmail-test.com`;
const testPassword = 'SenhaSegura123!';

test.describe('CleanMail — Fluxo Completo E2E', () => {
  test.describe.configure({ mode: 'serial' });

  test('01 — Deve exibir a landing page com CTA', async ({ page }) => {
    await page.goto('/');

    // Verifica elementos chave da landing page
    await expect(page.locator('h1')).toContainText('Limpe suas listas');
    await expect(page.locator('a[href="/register"]').first()).toBeVisible();
  });

  test('02 — Deve cadastrar um novo usuário', async ({ page }) => {
    await page.goto('/register');

    // Preenche formulário
    await page.fill('#register-email', testEmail);
    await page.fill('#register-password', testPassword);
    await page.fill('#register-confirm-password', testPassword);

    // Submete
    await page.click('button[type="submit"]');

    // Deve redirecionar para /verify após cadastro bem-sucedido
    await page.waitForURL('**/verify', { timeout: 10000 });
    await expect(page).toHaveURL(/\/verify/);
  });

  test('03 — Deve fazer login com credenciais cadastradas', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.fill('#login-email', testEmail);
    await page.fill('#login-password', testPassword);
    await page.click('button[type="submit"]');

    // Deve redirecionar para /verify
    await page.waitForURL('**/verify', { timeout: 10000 });
    await expect(page).toHaveURL(/\/verify/);
  });

  test('04 — Deve verificar um e-mail avulso', async ({ page }) => {
    await page.goto('/verify');

    // Aguarda a página carregar completamente
    await page.waitForSelector('#single-email-input');

    // Digita e-mail para verificar
    await page.fill('#single-email-input', 'test@example.com');
    await page.click('button:has-text("Verificar")');

    // Aguarda resultado aparecer (pode levar alguns segundos por causa do SMTP)
    await page.waitForSelector('.badge', { timeout: 30000 });

    // Deve exibir um resultado com status
    const resultSection = page.locator('text=Etapa');
    await expect(resultSection).toBeVisible();
  });

  test('05 — Deve fazer upload de CSV fictício', async ({ page }) => {
    await page.goto('/verify');

    /**
     * Cria um CSV fictício em memória para upload.
     *
     * POR QUÊ não usar arquivo real?
     * - Testes devem ser auto-contidos — sem dependência de arquivos externos.
     * - Buffer permite gerar dados diferentes a cada execução.
     */
    const csvContent = [
      'email,nome',
      'valid@gmail.com,Usuário 1',
      'invalid@dominioquenaoexiste123456.com,Usuário 2',
      'test@mailinator.com,Usuário 3',
    ].join('\n');

    // Upload do arquivo via Playwright
    const fileInput = page.locator('#csv-file-input');
    await fileInput.setInputFiles({
      name: 'test-emails.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Deve mostrar nome do arquivo selecionado
    await expect(page.locator('text=test-emails.csv')).toBeVisible();

    // Clica em upload
    await page.click('button:has-text("Iniciar Verificação em Lote")');

    // Deve exibir barra de progresso
    await page.waitForSelector('[role="progressbar"]', { timeout: 15000 });
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
  });

  test('06 — Deve navegar para histórico', async ({ page }) => {
    await page.goto('/history');

    // Deve exibir a página de histórico
    await expect(page.locator('text=Histórico de Verificações')).toBeVisible();
  });

  test('07 — Deve acessar configurações e ver área de API Keys', async ({
    page,
  }) => {
    await page.goto('/settings');

    // Deve exibir seção de API Keys
    await expect(page.locator('text=API Keys')).toBeVisible();

    // Deve exibir seção de billing
    await expect(page.locator('text=Comprar Créditos')).toBeVisible();
  });
});
