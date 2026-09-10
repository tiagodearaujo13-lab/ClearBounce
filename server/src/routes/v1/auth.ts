/**
 * @module auth
 * @description Rotas de autenticação — registro, login e gerenciamento de API Keys.
 *
 * ENDPOINTS:
 * - POST /v1/auth/register — Cadastro de novo usuário
 * - POST /v1/auth/login    — Login com e-mail/senha → retorna JWT
 * - POST /v1/auth/api-keys — Gera nova API Key (requer auth)
 * - DELETE /v1/auth/api-keys/:id — Revoga API Key (requer auth)
 *
 * SEGURANÇA:
 * - Senhas: hash com bcrypt (custo 12) — nunca armazenadas em texto puro.
 * - API Keys: hash com SHA-256 — texto puro retornado UMA VEZ e nunca mais.
 * - JWT: assinado com HMAC-SHA256 usando JWT_SECRET do .env.
 * - Rate limiting mais restritivo em /register e /login (via config global).
 */

import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../data/database.js';
import { hashApiKey, registerAuthGuard } from '../../middlewares/authGuard.js';
import { createError } from '../../utils/errors.js';
import type {
  RegisterRequestDto,
  LoginRequestDto,
  CreateApiKeyRequestDto,
} from '../../types.js';

/**
 * POR QUÊ custo 12 no bcrypt?
 * - Custo 10 é o padrão, mas hardware moderno quebra hashes custo 10 em ataques offline.
 * - Custo 12 leva ~250ms por hash — imperceptível para o usuário, mas torna brute force inviável.
 * - Custo 14+ começa a impactar a experiência do usuário (>1s por login).
 */
const BCRYPT_ROUNDS = 12;

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Registra o guard de autenticação neste escopo
  await registerAuthGuard(fastify);

  // =========================================
  // POST /v1/auth/register
  // =========================================
  /**
   * Cadastro de novo usuário.
   *
   * POR QUÊ criar créditos com saldo 0 junto com o usuário?
   * - Evita ter que checar "créditos existem?" em cada operação de billing.
   * - A tabela credits SEMPRE tem uma row para cada usuário — simplifica queries.
   * - Saldo inicial pode ser ajustado para trial (ex: 100 créditos grátis).
   */
  fastify.post<{ Body: RegisterRequestDto }>(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', maxLength: 254 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      // Verifica se e-mail já está cadastrado
      const existing = await db
        .selectFrom('users')
        .select('id')
        .where('email', '=', email.toLowerCase().trim())
        .executeTakeFirst();

      if (existing) {
        /**
         * POR QUÊ resposta genérica?
         * - Revelar "e-mail já cadastrado" permite enumeração de contas.
         * - Um atacante poderia descobrir quais e-mails estão registrados.
         * - Resposta genérica protege a privacidade dos usuários.
         */
        throw createError(
          'REGISTRATION_FAILED',
          'Não foi possível criar a conta. Verifique os dados e tente novamente.',
          409
        );
      }

      // Hash da senha com bcrypt
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Inserção transacional: usuário + créditos iniciais
      const user = await db.transaction().execute(async (trx) => {
        const newUser = await trx
          .insertInto('users')
          .values({
            email: email.toLowerCase().trim(),
            password_hash: passwordHash,
          })
          .returning(['id', 'email', 'created_at'])
          .executeTakeFirstOrThrow();

        // Cria registro de créditos com saldo inicial
        await trx
          .insertInto('credits')
          .values({
            user_id: newUser.id,
            balance: 100, // Trial: 100 verificações grátis
          })
          .execute();

        return newUser;
      });

      return reply.status(201).send({
        message: 'Conta criada com sucesso! Você recebeu 100 créditos de boas-vindas.',
        user: {
          id: user.id,
          email: user.email,
        },
      });
    }
  );

  // =========================================
  // POST /v1/auth/login
  // =========================================
  fastify.post<{ Body: LoginRequestDto }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await db
        .selectFrom('users')
        .select(['id', 'email', 'password_hash'])
        .where('email', '=', email.toLowerCase().trim())
        .executeTakeFirst();

      /**
       * POR QUÊ mensagem idêntica para "usuário não existe" e "senha errada"?
       * - Impede enumeração de contas: atacante não sabe se o e-mail existe.
       * - Padrão OWASP para endpoints de autenticação.
       */
      if (!user) {
        throw createError(
          'INVALID_CREDENTIALS',
          'E-mail ou senha incorretos.',
          401
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw createError(
          'INVALID_CREDENTIALS',
          'E-mail ou senha incorretos.',
          401
        );
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw createError('CONFIG_ERROR', 'JWT_SECRET não configurado.', 500);
      }

      const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
      const token = jwt.sign(
        { sub: user.id, email: user.email },
        jwtSecret,
        { expiresIn }
      );

      return reply.send({
        token,
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
        },
      });
    }
  );

  // =========================================
  // POST /v1/auth/api-keys (PROTEGIDO)
  // =========================================
  /**
   * Gera nova API Key para integrações programáticas.
   *
   * FLUXO:
   * 1. Gera 32 bytes aleatórios → converte para hex (64 chars).
   * 2. Prefixo "cm_" para identificar como chave CleanMail.
   * 3. Retorna chave em texto puro ao usuário UMA ÚNICA VEZ.
   * 4. Armazena apenas o SHA-256 no banco.
   *
   * POR QUÊ randomBytes(32)?
   * - 32 bytes = 256 bits de entropia — impraticável de adivinhar por brute force.
   * - UUID v4 tem apenas 122 bits de entropia — insuficiente para API Keys.
   */
  fastify.post<{ Body: CreateApiKeyRequestDto }>(
    '/api-keys',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const { name } = request.body;

      // Gera chave com alta entropia + prefixo identificável
      const rawKey = `cm_${randomBytes(32).toString('hex')}`;
      const keyHash = hashApiKey(rawKey);

      const apiKey = await db
        .insertInto('api_keys')
        .values({
          user_id: user.id,
          key_hash: keyHash,
          name: name.trim(),
        })
        .returning(['id', 'name', 'created_at'])
        .executeTakeFirstOrThrow();

      /**
       * ⚠️ ATENÇÃO: A chave em texto puro (rawKey) é retornada SOMENTE nesta resposta.
       * Se o usuário perder a chave, precisará gerar uma nova.
       * Isso é intencional — mesmo padrão usado por GitHub, Stripe, AWS.
       */
      return reply.status(201).send({
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey,
        createdAt: apiKey.created_at,
        warning: '⚠️ Guarde esta chave com segurança. Ela não será exibida novamente.',
      });
    }
  );

  // =========================================
  // DELETE /v1/auth/api-keys/:id (PROTEGIDO)
  // =========================================
  /**
   * Revoga uma API Key (soft delete).
   *
   * POR QUÊ soft delete (revoked_at) ao invés de DELETE?
   * - Permite auditoria: saber QUANDO uma chave foi revogada.
   * - Permite reativação futura se necessário.
   * - O authGuard filtra WHERE revoked_at IS NULL — chaves revogadas são ignoradas.
   */
  fastify.delete<{ Params: { id: string } }>(
    '/api-keys/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const result = await db
        .updateTable('api_keys')
        .set({ revoked_at: new Date() })
        .where('id', '=', id)
        .where('user_id', '=', user.id)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        throw createError(
          'NOT_FOUND',
          'API Key não encontrada ou já revogada.',
          404
        );
      }

      return reply.send({ message: 'API Key revogada com sucesso.' });
    }
  );
}
