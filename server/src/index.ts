/**
 * @module index
 * @description Bootstrap da API Fastify, reutilizável em processo Node e Vercel.
 */

import 'dotenv/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { registerRateLimiter } from './middlewares/rateLimiter.js';
import { authRoutes } from './routes/v1/auth.js';
import { verifyRoutes } from './routes/v1/verify.js';
import { billingRoutes } from './routes/v1/billing.js';
import { db } from './data/database.js';
import { migrateDatabase } from './data/migrate.js';
import { disposableStore } from './services/DisposableStore.js';
import { hasRedis, isServerless } from './jobs/queues.js';
import { startBatchVerifyWorker } from './jobs/batchVerifyWorker.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody: Buffer | null;
  }
}

/** Constrói a aplicação sem abrir uma porta TCP durante o import. */
export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // O parser preserva o payload exato necessário para a assinatura do Stripe.
  fastify.removeContentTypeParser('application/json');
  fastify.decorateRequest('rawBody', null);
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (request, body, done) => {
      try {
        const raw = typeof body === 'string' ? body : body.toString('utf8');
        request.rawBody = Buffer.from(raw, 'utf8');
        done(null, JSON.parse(raw));
      } catch {
        done(new Error('JSON inválido'));
      }
    },
  );

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

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  await registerRateLimiter(fastify);

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  // Auto-migração é idempotente e executada uma vez por instância da API.
  if (process.env.AUTO_MIGRATE !== 'false') {
    await migrateDatabase();
  }

  await disposableStore.load();
  fastify.log.info(`Lista de descartáveis carregada: ${disposableStore.size} domínios`);

  await fastify.register(authRoutes, { prefix: '/v1/auth' });
  await fastify.register(verifyRoutes, { prefix: '/v1/verify' });
  await fastify.register(billingRoutes, { prefix: '/v1/billing' });

  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  return fastify;
}

let appPromise: Promise<FastifyInstance> | undefined;

/** Retorna uma única instância pronta para reutilização entre invocações serverless. */
export function getApp(): Promise<FastifyInstance> {
  appPromise ??= buildApp();
  return appPromise;
}

async function startServer(): Promise<void> {
  const fastify = await getApp();
  let worker: ReturnType<typeof startBatchVerifyWorker> | undefined;

  if (!isServerless() && hasRedis()) {
    worker = startBatchVerifyWorker();
  }

  const port = Number(process.env.PORT) || 3333;
  await fastify.listen({ port, host: '0.0.0.0' });
  fastify.log.info(`CleanBounce API rodando em http://localhost:${port}`);

  const shutdown = async (signal: string): Promise<void> => {
    fastify.log.info(`Recebido ${signal}. Encerrando servidor...`);
    await worker?.close();
    await fastify.close();
    await db.destroy();
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

const isMainModule = process.argv[1]
  ? fileURLToPath(import.meta.url) === resolve(process.argv[1])
  : false;

if (isMainModule) {
  startServer().catch((error) => {
    console.error('Erro fatal ao iniciar o servidor:', error);
    process.exitCode = 1;
  });
}
