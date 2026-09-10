/**
 * @module batchVerifyWorker
 * @description Worker BullMQ que processa verificação de e-mails em lote.
 *
 * FLUXO DO WORKER:
 * 1. Recebe job com caminho do arquivo CSV e metadata.
 * 2. Lê e parseia o CSV.
 * 3. Itera sobre cada e-mail, executando o pipeline de verificação.
 * 4. Atualiza progresso a cada e-mail processado (disponível via API).
 * 5. Deduz créditos do usuário conforme processa.
 * 6. Gera CSV de resultado sanitizado.
 * 7. Atualiza status do batch job no banco para 'completed'.
 *
 * POR QUÊ concurrency: 3?
 * - Cada verificação SMTP leva 1-5 segundos (I/O bound, não CPU bound).
 * - Processar 3 jobs simultaneamente utiliza melhor a rede sem sobrecarregar.
 * - Em produção, ajustar baseado em RAM e largura de banda disponível.
 *
 * POR QUÊ não paralelizar e-mails DENTRO de um job?
 * - Servidores SMTP limitam conexões simultâneas do mesmo IP.
 * - Abrir 100 conexões simultâneas resultaria em rate limiting/ban.
 * - Processamento sequencial com delay é mais confiável.
 */

import { Worker, type Job } from 'bullmq';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../data/database.js';
import { smtpVerifier } from '../services/SmtpVerifier.js';
import {
  parseCsv,
  generateSanitizedCsv,
  sanitizeField,
} from '../services/CsvSanitizer.js';
import { getRedisConnection, type BatchVerifyJobData } from './queues.js';
import type { EmailVerificationResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Diretório para armazenar resultados processados */
const RESULTS_DIR = join(__dirname, '..', '..', 'uploads', 'results');

/**
 * Processador principal do job de verificação em lote.
 *
 * @param job - Job BullMQ com dados do batch
 */
async function processJob(job: Job<BatchVerifyJobData>): Promise<void> {
  const { jobId, userId, filePath, emailColIndex, totalEmails } = job.data;

  console.log(`🔄 Iniciando processamento do batch ${jobId}: ${totalEmails} e-mails`);

  try {
    // =========================================
    // 1. Atualizar status para 'processing'
    // =========================================
    await db
      .updateTable('batch_jobs')
      .set({ status: 'processing' })
      .where('id', '=', jobId)
      .execute();

    // =========================================
    // 2. Ler e parsear o CSV
    // =========================================
    const fileContent = await readFile(filePath, 'utf-8');
    const rows = await parseCsv(fileContent);

    if (rows.length < 2) {
      throw new Error('CSV vazio ou sem dados após o cabeçalho.');
    }

    const headers = rows[0]!;
    const dataRows = rows.slice(1);

    // Headers do CSV de resultado (originais + colunas de resultado)
    const resultHeaders = [
      ...headers,
      'cm_status',       // Status da verificação
      'cm_stage',        // Etapa onde parou
      'cm_reason',       // Motivo legível
      'cm_smtp_code',    // Código SMTP (se aplicável)
      'cm_elapsed_ms',   // Tempo de verificação
    ];

    const resultRows: string[][] = [];
    let processedCount = 0;

    // =========================================
    // 3. Processar cada e-mail sequencialmente
    // =========================================
    for (const row of dataRows) {
      const email = row[emailColIndex]?.trim();

      if (!email) {
        // Linha sem e-mail — mantém no resultado com status 'invalid'
        resultRows.push([
          ...row.map(sanitizeField),
          'invalid',
          'syntax',
          'Campo de e-mail vazio',
          '',
          '0',
        ]);
        processedCount++;
        continue;
      }

      // Executa o pipeline de verificação
      let result: EmailVerificationResult;
      try {
        result = await smtpVerifier.verify(email);
      } catch (error) {
        result = {
          email,
          status: 'unknown' as any,
          stage: 'smtp',
          reason: `Erro inesperado: ${(error as Error).message}`,
          elapsedMs: 0,
        };
      }

      // Adiciona colunas de resultado (sanitizadas contra CSV Injection)
      resultRows.push([
        ...row.map(sanitizeField),
        sanitizeField(result.status),
        sanitizeField(result.stage),
        sanitizeField(result.reason),
        sanitizeField(String(result.smtpCode ?? '')),
        sanitizeField(String(result.elapsedMs)),
      ]);

      processedCount++;

      // =========================================
      // 4. Atualizar progresso
      // =========================================
      /**
       * POR QUÊ atualizar a cada 10 e-mails ao invés de cada 1?
       * - Atualizar o banco a cada e-mail gera milhares de queries em batches grandes.
       * - A cada 10 é um bom equilíbrio: progresso visível no UI sem sobrecarregar o DB.
       * - O job.updateProgress() atualiza no Redis (rápido) para o polling da API.
       */
      if (processedCount % 10 === 0 || processedCount === totalEmails) {
        await db
          .updateTable('batch_jobs')
          .set({ processed_emails: processedCount })
          .where('id', '=', jobId)
          .execute();

        await job.updateProgress(
          Math.round((processedCount / totalEmails) * 100)
        );
      }

      /**
       * POR QUÊ delay de 100ms entre verificações?
       * - Evita sobrecarregar servidores SMTP com conexões rápidas demais.
       * - Muitos MTAs interpretam conexões muito rápidas como spam/ataque.
       * - 100ms é quase imperceptível no total mas mostra "bom comportamento".
       */
      await sleep(100);
    }

    // =========================================
    // 5. Deduzir créditos
    // =========================================
    /**
     * POR QUÊ deduzir tudo no final ao invés de a cada e-mail?
     * - Uma única query UPDATE é MUITO mais eficiente que 100.000 queries individuais.
     * - Se o job falhar no meio, o retry vai reprocessar — deduzir no final evita cobrança dupla.
     * - Alternativa: deduzir tudo ANTES (na rota /batch) e reembolsar se falhar.
     */
    await db
      .updateTable('credits')
      .set((eb) => ({
        balance: eb('balance', '-', processedCount),
        updated_at: new Date(),
      }))
      .where('user_id', '=', userId)
      .execute();

    // =========================================
    // 6. Gerar CSV de resultado
    // =========================================
    const resultCsv = generateSanitizedCsv(resultHeaders, resultRows);
    const resultFileName = `result_${jobId}.csv`;
    const resultPath = join(RESULTS_DIR, resultFileName);

    // Cria diretório de resultados se não existir
    const { mkdir } = await import('node:fs/promises');
    await mkdir(RESULTS_DIR, { recursive: true });

    await writeFile(resultPath, resultCsv, 'utf-8');

    // =========================================
    // 7. Finalizar job
    // =========================================
    await db
      .updateTable('batch_jobs')
      .set({
        status: 'completed',
        processed_emails: processedCount,
        result_path: resultPath,
        completed_at: new Date(),
      })
      .where('id', '=', jobId)
      .execute();

    console.log(`✅ Batch ${jobId} concluído: ${processedCount}/${totalEmails} e-mails processados`);
  } catch (error) {
    // =========================================
    // FALHA DO JOB
    // =========================================
    console.error(`❌ Batch ${jobId} falhou:`, error);

    await db
      .updateTable('batch_jobs')
      .set({
        status: 'failed',
        completed_at: new Date(),
      })
      .where('id', '=', jobId)
      .execute();

    throw error; // Re-throw para BullMQ tentar retry
  }
}

/** Helper para delay entre verificações */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =========================================
// INICIALIZAR WORKER
// =========================================
/**
 * POR QUÊ exportar como função ao invés de inicializar imediatamente?
 * - Permite controlar QUANDO o worker inicia (ex: não iniciar em testes).
 * - O index.ts pode chamar startWorker() após todas as dependências estarem prontas.
 * - Em testes, não queremos workers processando jobs reais.
 */
export function startBatchVerifyWorker(): Worker<BatchVerifyJobData> {
  const worker = new Worker<BatchVerifyJobData>(
    'email-verification',
    processJob,
    {
      connection: getRedisConnection(),
      /**
       * POR QUÊ concurrency: 3?
       * - Cada job é I/O bound (DNS + SMTP) — CPU fica ociosa entre requests.
       * - 3 jobs simultâneos utiliza a rede sem sobrecarregar.
       * - Ajustar baseado no hardware: mais RAM/rede → mais concurrency.
       */
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completado com sucesso`);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} falhou: ${error.message}`);
  });

  console.log('🏭 Worker de verificação batch iniciado (concurrency: 3)');

  return worker;
}
