/**
 * @module queues
 * @description Definição das filas BullMQ para processamento assíncrono.
 *
 * POR QUÊ BullMQ ao invés de processar inline?
 * - Um CSV com 100.000 e-mails levaria ~30 minutos para processar (SMTP é lento).
 * - Processar inline travaria o request HTTP — timeout em 30s na maioria dos proxies.
 * - BullMQ enfileira o trabalho e processa em background, retornando imediatamente.
 * - Benefícios extras: retry automático, concorrência configurável, progresso em tempo real.
 *
 * POR QUÊ Redis ao invés de fila in-memory?
 * - Redis persiste a fila em disco — sobrevive a crashes e restarts do servidor.
 * - Permite escalar horizontalmente: múltiplos workers processando a mesma fila.
 * - BullMQ sem Redis perde todos os jobs pendentes se o processo morrer.
 */

import { Queue } from 'bullmq';

/** Dados enviados pelo produtor (rota /v1/verify/batch) para o worker */
export interface BatchVerifyJobData {
  jobId: string;
  userId: string;
  filePath: string;
  emailColIndex: number;
  totalEmails: number;
}

/**
 * Configuração de conexão Redis.
 *
 * POR QUÊ extrair em função?
 * - Queue e Worker precisam da MESMA configuração de conexão.
 * - Centralizar evita duplicação e erros de configuração divergente.
 */
export function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    /**
     * POR QUÊ maxRetriesPerRequest: null?
     * - BullMQ exige esta configuração para funcionar corretamente com ioredis.
     * - Sem isso, ioredis lança erro após 20 tentativas de reconexão.
     * - null = retry infinito (o worker reconecta automaticamente ao Redis).
     */
    maxRetriesPerRequest: null,
  };
}

/**
 * Fila de verificação de e-mails em lote.
 *
 * POR QUÊ defaultJobOptions.removeOnComplete?
 * - Jobs completados consomem memória no Redis sem utilidade.
 * - Mantemos os últimos 100 para debugging, removendo os mais antigos.
 * - Em produção, ajustar baseado no volume de jobs.
 */
export const emailVerificationQueue = new Queue<BatchVerifyJobData>(
  'email-verification',
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s, 20s entre retries
      },
    },
  }
);
