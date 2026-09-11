/**
 * @module queues
 * @description Integração opcional com BullMQ.
 *
 * Redis é obrigatório apenas no modo persistente (Docker/VPS). Em Vercel ou sem
 * REDIS_URL, o produtor usa o processador inline da rota de batch.
 */

import { Queue } from 'bullmq';

export interface BatchVerifyJobData {
  jobId: string;
  userId: string;
  filePath: string;
  emailColIndex: number;
  totalEmails: number;
}

export function isServerless(): boolean {
  return process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function hasRedis(): boolean {
  return Boolean(process.env.REDIS_URL) && !isServerless();
}

export function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL não configurada; BullMQ está desativado.');
  }

  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

let queue: Queue<BatchVerifyJobData> | null = null;

/** Cria a fila somente quando Redis está explicitamente disponível. */
export function getEmailVerificationQueue(): Queue<BatchVerifyJobData> | null {
  if (!hasRedis()) return null;

  queue ??= new Queue<BatchVerifyJobData>('email-verification', {
    connection: getRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });

  return queue;
}

/** Fecha a fila no shutdown do processo persistente. */
export async function closeQueue(): Promise<void> {
  await queue?.close();
  queue = null;
}
