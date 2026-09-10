/**
 * @module verify
 * @description Rotas de verificação de e-mail — avulso e batch (CSV).
 *
 * ENDPOINTS:
 * - POST /v1/verify/single           — Verifica um e-mail avulso (síncrono)
 * - POST /v1/verify/batch            — Upload de CSV → enfileira job BullMQ
 * - GET  /v1/verify/batch/:jobId     — Consulta status/progresso do batch
 * - GET  /v1/verify/batch/:jobId/download — Download do CSV processado
 *
 * TODAS AS ROTAS requerem autenticação (JWT ou API Key).
 * TODAS AS ROTAS deduzem créditos do usuário.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { db } from '../../data/database.js';
import { smtpVerifier } from '../../services/SmtpVerifier.js';
import { parseCsv, findEmailColumnIndex } from '../../services/CsvSanitizer.js';
import { emailVerificationQueue } from '../../jobs/queues.js';
import { registerAuthGuard } from '../../middlewares/authGuard.js';
import { createError } from '../../utils/errors.js';
import type { VerifySingleRequestDto, BatchStatus } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Diretório para armazenar uploads de CSV */
const UPLOADS_DIR = join(__dirname, '..', '..', '..', 'uploads');

export async function verifyRoutes(fastify: FastifyInstance): Promise<void> {
  await registerAuthGuard(fastify);

  // =========================================
  // POST /v1/verify/single
  // =========================================
  /**
   * Verificação síncrona de um único e-mail.
   *
   * POR QUÊ síncrono?
   * - Verificar 1 e-mail leva ~1-5 segundos (DNS + SMTP).
   * - Para o usuário, esperar 5s é aceitável em verificação avulsa.
   * - Para batch (1000+ e-mails), usamos BullMQ assíncrono.
   */
  fastify.post<{ Body: VerifySingleRequestDto }>(
    '/single',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', maxLength: 254 },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const { email } = request.body;

      // =========================================
      // Verificar créditos ANTES de processar
      // =========================================
      /**
       * POR QUÊ checar créditos antes?
       * - Evita desperdício de recursos (DNS, SMTP) se o usuário não pode pagar.
       * - Princípio: cobrar antes, entregar depois.
       */
      const credits = await db
        .selectFrom('credits')
        .select('balance')
        .where('user_id', '=', user.id)
        .executeTakeFirst();

      if (!credits || credits.balance < 1) {
        throw createError(
          'INSUFFICIENT_CREDITS',
          'Créditos insuficientes. Adquira mais créditos para continuar verificando.',
          402
        );
      }

      // Executa o pipeline de verificação
      const result = await smtpVerifier.verify(email);

      // Deduz 1 crédito
      await db
        .updateTable('credits')
        .set({
          balance: credits.balance - 1,
          updated_at: new Date(),
        })
        .where('user_id', '=', user.id)
        .execute();

      return reply.send({
        result,
        creditsRemaining: credits.balance - 1,
      });
    }
  );

  // =========================================
  // POST /v1/verify/batch
  // =========================================
  /**
   * Upload de CSV para verificação em lote.
   *
   * FLUXO:
   * 1. Recebe arquivo CSV via multipart upload.
   * 2. Valida tipo e tamanho (máximo 10MB, definido no multipart plugin).
   * 3. Conta e-mails no CSV para estimar créditos necessários.
   * 4. Verifica se o usuário tem créditos suficientes.
   * 5. Salva o arquivo no disco.
   * 6. Cria registro de batch_job no banco.
   * 7. Enfileira job no BullMQ.
   * 8. Retorna jobId para polling de progresso.
   */
  fastify.post(
    '/batch',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user!;

      // Recebe o arquivo do multipart
      const data = await request.file();
      if (!data) {
        throw createError('MISSING_FILE', 'Nenhum arquivo CSV enviado.', 400);
      }

      /**
       * POR QUÊ validar mimetype?
       * - Previne upload de executáveis, scripts ou imagens disfarçados de CSV.
       * - Validação de mimetype + extensão é defense in depth.
       */
      const allowedMimeTypes = ['text/csv', 'text/plain', 'application/csv'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        throw createError(
          'INVALID_FILE_TYPE',
          'Tipo de arquivo inválido. Envie um arquivo .csv.',
          400
        );
      }

      // Lê o conteúdo do arquivo em buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Parseia o CSV para contar e-mails
      const rows = await parseCsv(fileBuffer);
      if (rows.length < 2) {
        throw createError(
          'EMPTY_CSV',
          'O arquivo CSV está vazio ou contém apenas o cabeçalho.',
          400
        );
      }

      const headers = rows[0]!;
      const emailColIndex = findEmailColumnIndex(headers);
      const totalEmails = rows.length - 1; // Exclui o header

      // Verifica créditos
      const credits = await db
        .selectFrom('credits')
        .select('balance')
        .where('user_id', '=', user.id)
        .executeTakeFirst();

      if (!credits || credits.balance < totalEmails) {
        throw createError(
          'INSUFFICIENT_CREDITS',
          `Créditos insuficientes. Necessário: ${totalEmails}, disponível: ${credits?.balance ?? 0}.`,
          402
        );
      }

      // Salva o arquivo no disco
      await mkdir(UPLOADS_DIR, { recursive: true });
      const fileName = `${user.id}_${Date.now()}.csv`;
      const filePath = join(UPLOADS_DIR, fileName);
      await writeFile(filePath, fileBuffer);

      // Cria registro do batch job
      const job = await db
        .insertInto('batch_jobs')
        .values({
          user_id: user.id,
          status: 'queued',
          total_emails: totalEmails,
          processed_emails: 0,
          file_path: filePath,
        })
        .returning(['id', 'status', 'total_emails', 'created_at'])
        .executeTakeFirstOrThrow();

      // Enfileira no BullMQ
      await emailVerificationQueue.add('verify-batch', {
        jobId: job.id,
        userId: user.id,
        filePath,
        emailColIndex,
        totalEmails,
      });

      return reply.status(202).send({
        jobId: job.id,
        status: 'queued',
        totalEmails,
        message: `Batch enfileirado com sucesso. ${totalEmails} e-mails serão processados.`,
      });
    }
  );

  // =========================================
  // GET /v1/verify/batch/:jobId
  // =========================================
  fastify.get<{ Params: { jobId: string } }>(
    '/batch/:jobId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const { jobId } = request.params;

      const job = await db
        .selectFrom('batch_jobs')
        .selectAll()
        .where('id', '=', jobId)
        .where('user_id', '=', user.id) // Garante que o usuário só vê seus próprios jobs
        .executeTakeFirst();

      if (!job) {
        throw createError('NOT_FOUND', 'Batch job não encontrado.', 404);
      }

      const progress =
        job.total_emails > 0
          ? Math.round((job.processed_emails / job.total_emails) * 100)
          : 0;

      return reply.send({
        id: job.id,
        status: job.status,
        totalEmails: job.total_emails,
        processedEmails: job.processed_emails,
        progress,
        createdAt: job.created_at,
        completedAt: job.completed_at,
      });
    }
  );

  // =========================================
  // GET /v1/verify/batch/:jobId/download
  // =========================================
  /**
   * Download do CSV processado com resultados.
   *
   * POR QUÊ stream ao invés de buffer?
   * - Arquivos grandes (10MB+) em buffer consomem muita RAM.
   * - Stream envia pedaços conforme lidos do disco — uso de memória constante.
   */
  fastify.get<{ Params: { jobId: string } }>(
    '/batch/:jobId/download',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const { jobId } = request.params;

      const job = await db
        .selectFrom('batch_jobs')
        .select(['status', 'result_path'])
        .where('id', '=', jobId)
        .where('user_id', '=', user.id)
        .executeTakeFirst();

      if (!job) {
        throw createError('NOT_FOUND', 'Batch job não encontrado.', 404);
      }

      if (job.status !== 'completed' || !job.result_path) {
        throw createError(
          'NOT_READY',
          'O processamento ainda não foi concluído. Verifique o status do batch.',
          409
        );
      }

      const fileStream = createReadStream(job.result_path);

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename="cleanmail_results_${jobId}.csv"`
        )
        .send(fileStream);
    }
  );
}
