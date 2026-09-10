/**
 * @module index
 * @description Ponto de entrada do servidor Fastify — CleanMail API.
 *
 * POR QUÊ registrar plugins nesta ordem específica?
 * 1. Helmet PRIMEIRO: garante headers de segurança em TODAS as respostas, mesmo erros.
 * 2. CORS SEGUNDO: precisa estar antes das rotas para tratar preflight OPTIONS.
 * 3. Rate Limit TERCEIRO: protege contra abuso ANTES de processar qualquer lógica.
 * 4. Multipart QUARTO: habilita upload de arquivos para as rotas de batch.
 * 5. Rotas POR ÚLTIMO: tudo acima já está ativo quando as rotas são registradas.
 *
 * POR QUÊ graceful shutdown?
 * - Em produção (Render, Docker), o processo recebe SIGTERM antes de ser encerrado.
 * - Precisamos fechar conexões abertas (DB, Redis, sockets) para evitar data corruption.
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { registerRateLimiter } from './middlewares/rateLimiter.js';
import { authRoutes } from './routes/v1/auth.js';
import { verifyRoutes } from './routes/v1/verify.js';
import { billingRoutes } from './routes/v1/billing.js';
import { db } from './data/database.js';
import { disposableStore } from './services/DisposableStore.js';

/**
 * Bootstrap do servidor Fastify.
 * Separado em função async para permitir await na inicialização de plugins.
 */
async function bootstrap(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      /**
       * POR QUÊ transport apenas em desenvolvimento?
       * - Em produção, JSON puro é melhor para ingestão em serviços de log (Datadog, etc).
       * - Em dev, pino-pretty torna os logs legíveis no terminal.
       */
      ...(process.env.NODE_ENV !== 'production' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }),
    },
  });

  // Preserva o corpo bruto para validação criptográfica do Stripe e ainda
  // entrega JSON normal às demais rotas.
  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (request, body, done) => {
      try {
        const raw = typeof body === 'string' ? body : body.toString('utf8');
        (request as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(raw, 'utf8');
        done(null, JSON.parse(raw));
      } catch {
        done(new Error('JSON inválido'));
      }
    },
  );

  // =========================================
  // 1. HELMET — Headers de segurança HTTP
  // =========================================
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    noSniff: true,
  });

  // =========================================
  // 2. CORS — Controle de Origem Cruzada
  // =========================================
  await fastify.register(cors, {
    /**
     * POR QUÊ origin restrito ao CORS_ORIGIN?
     * - Evita que qualquer domínio faça requests à API.
     * - Em produção, será o domínio do frontend Vercel.
     */
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // =========================================
  // 3. RATE LIMITING — Proteção contra abuso
  // =========================================
  await registerRateLimiter(fastify);

  // =========================================
  // 4. MULTIPART — Upload de arquivos CSV
  // =========================================
  await fastify.register(multipart, {
    limits: {
      /**
       * POR QUÊ limitar a 10MB?
       * - Um CSV com 100.000 e-mails pesa ~3-5MB.
       * - 10MB é generoso sem expor o servidor a uploads abusivos.
       */
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 1, // Apenas um arquivo por request
    },
  });

  // =========================================
  // 5. CARREGAR DADOS EM MEMÓRIA
  // =========================================
  /**
   * POR QUÊ carregar no boot e não lazy?
   * - A lista de descartáveis é consultada em CADA verificação.
   * - Carregar uma vez no boot garante latência zero nas consultas.
   */
  await disposableStore.load();
  fastify.log.info(
    `📋 Lista de descartáveis carregada: ${disposableStore.size} domínios`
  );

  // =========================================
  // 6. ROTAS — Endpoints versionados
  // =========================================
  await fastify.register(authRoutes, { prefix: '/v1/auth' });
  await fastify.register(verifyRoutes, { prefix: '/v1/verify' });
  await fastify.register(billingRoutes, { prefix: '/v1/billing' });

  // =========================================
  // HEALTH CHECK — Endpoint de saúde
  // =========================================
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // =========================================
  // INICIAR SERVIDOR
  // =========================================
  const port = Number(process.env.PORT) || 3333;
  const host = '0.0.0.0'; // Bind em todas as interfaces (necessário em containers)

  await fastify.listen({ port, host });
  fastify.log.info(`🚀 CleanMail API rodando em http://localhost:${port}`);

  // =========================================
  // GRACEFUL SHUTDOWN
  // =========================================
  /**
   * POR QUÊ capturar SIGTERM e SIGINT separadamente?
   * - SIGTERM: enviado por orquestradores (Docker, Render) ao encerrar o processo.
   * - SIGINT: enviado pelo terminal (Ctrl+C) durante desenvolvimento.
   * - Ambos precisam fechar o servidor limpo para evitar conexões órfãs.
   */
  const shutdown = async (signal: string): Promise<void> => {
    fastify.log.info(`⏹️  Recebido ${signal}. Encerrando servidor...`);

    // Fecha o Fastify (para de aceitar requests, finaliza pendentes)
    await fastify.close();

    // Destrói o pool de conexões do banco
    await db.destroy();

    fastify.log.info('✅ Servidor encerrado com sucesso.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Executa o bootstrap e captura erros fatais
bootstrap().catch((error) => {
  console.error('❌ Erro fatal ao iniciar o servidor:', error);
  process.exit(1);
});
