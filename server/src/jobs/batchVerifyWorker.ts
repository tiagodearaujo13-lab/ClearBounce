/**
 * @module batchVerifyWorker
 * @description Processamento compartilhado entre BullMQ e o modo inline serverless.
 */

import { Worker, type Job } from 'bullmq';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../data/database.js';
import { smtpVerifier } from '../services/SmtpVerifier.js';
import { parseCsv, generateSanitizedCsv, sanitizeField } from '../services/CsvSanitizer.js';
import { getRedisConnection, type BatchVerifyJobData } from './queues.js';
import { VerificationStatus, type EmailVerificationResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RESULTS_DIR = join(__dirname, '..', '..', 'uploads', 'results');
const INLINE_RESULTS_DIR = '/tmp/clearbounce/results';
const INLINE_CONCURRENCY = 5;

type ProgressCallback = (progress: number) => Promise<void>;

function resultRow(row: string[], result: EmailVerificationResult): string[] {
  return [
    ...row.map(sanitizeField),
    sanitizeField(result.status),
    sanitizeField(result.stage),
    sanitizeField(result.reason),
    sanitizeField(String(result.smtpCode ?? '')),
    sanitizeField(String(result.elapsedMs)),
  ];
}

async function verifyRow(row: string[], emailColIndex: number): Promise<string[]> {
  const email = row[emailColIndex]?.trim();
  if (!email) {
    return [
      ...row.map(sanitizeField),
      'invalid',
      'syntax',
      'Campo de e-mail vazio',
      '',
      '0',
    ];
  }

  try {
    return resultRow(row, await smtpVerifier.verify(email));
  } catch (error) {
    return resultRow(row, {      email,
      status: VerificationStatus.UNKNOWN,
      stage: 'smtp',
      reason: `Erro inesperado: ${(error as Error).message}`,
      elapsedMs: 0,
    });
  }
}

/**
 * Processa um batch com concorrência limitada. Promise.allSettled garante que
 * uma verificação isolada não interrompa o restante do CSV.
 */
async function processBatch(
  data: BatchVerifyJobData,
  onProgress: ProgressCallback,
): Promise<void> {
  const { jobId, userId, filePath, emailColIndex, totalEmails } = data;
  try {
    await db.updateTable('batch_jobs').set({ status: 'processing' }).where('id', '=', jobId).execute();

    const rows = await parseCsv(await readFile(filePath, 'utf-8'));
    if (rows.length < 2) throw new Error('CSV vazio ou sem dados após o cabeçalho.');

    const headers = rows[0]!;
    const dataRows = rows.slice(1);
    const resultHeaders = [
      ...headers,
      'cm_status',
      'cm_stage',
      'cm_reason',
      'cm_smtp_code',
      'cm_elapsed_ms',
    ];
    const resultRows: string[][] = new Array(dataRows.length);
    let processedCount = 0;

    for (let offset = 0; offset < dataRows.length; offset += INLINE_CONCURRENCY) {
      const chunk = dataRows.slice(offset, offset + INLINE_CONCURRENCY);
      const settled = await Promise.allSettled(
        chunk.map((row) => verifyRow(row, emailColIndex)),
      );

      settled.forEach((item, index) => {
        const row = chunk[index]!;
        resultRows[offset + index] = item.status === 'fulfilled'
          ? item.value
          : resultRow(row, {
              email: row[emailColIndex]?.trim() ?? '',
              status: VerificationStatus.UNKNOWN,
              stage: 'smtp',
              reason: `Erro inesperado: ${item.reason instanceof Error ? item.reason.message : String(item.reason)}`,
              elapsedMs: 0,
            });
        processedCount += 1;
      });

      await db
        .updateTable('batch_jobs')
        .set({ processed_emails: processedCount })
        .where('id', '=', jobId)
        .execute();
      await onProgress(Math.round((processedCount / Math.max(totalEmails, 1)) * 100));
    }

    await db
      .updateTable('credits')
      .set((eb) => ({
        balance: eb('balance', '-', processedCount),
        updated_at: new Date(),
      }))
      .where('user_id', '=', userId)
      .execute();

    const resultCsv = generateSanitizedCsv(resultHeaders, resultRows);
    const serverless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
    const resultDirectory = serverless ? INLINE_RESULTS_DIR : RESULTS_DIR;
    const resultPath = join(resultDirectory, `result_${jobId}.csv`);
    await mkdir(resultDirectory, { recursive: true });
    await writeFile(resultPath, resultCsv, 'utf-8');

    await db
      .updateTable('batch_jobs')
      .set({
        status: 'completed',
        processed_emails: processedCount,
        result_path: resultPath,
        result_data: serverless ? resultCsv : null,
        completed_at: new Date(),
      })
      .where('id', '=', jobId)
      .execute();
  } catch (error) {
    await db
      .updateTable('batch_jobs')
      .set({ status: 'failed', completed_at: new Date() })
      .where('id', '=', jobId)
      .execute();
    throw error;
  }
}

/** Executa o batch dentro da invocação HTTP serverless, sem worker persistente. */
export async function processBatchInline(data: BatchVerifyJobData): Promise<void> {
  await processBatch(data, async () => undefined);
}

export function startBatchVerifyWorker(): Worker<BatchVerifyJobData> {
  const worker = new Worker<BatchVerifyJobData>(
    'email-verification',
    async (job: Job<BatchVerifyJobData>) => {
      await processBatch(job.data, async (progress) => {
        await job.updateProgress(progress);
      });
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );

  worker.on('completed', (job) => console.log(`Job ${job.id} completado com sucesso`));
  worker.on('failed', (job, error) => console.error(`Job ${job?.id} falhou: ${error.message}`));
  console.log('Worker de verificação batch iniciado (concurrency: 3)');
  return worker;
}
