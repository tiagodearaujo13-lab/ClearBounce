/**
 * @module authGuard
 * @description Middleware de autenticação dual: JWT Bearer ou API Key.
 *
 * POR QUÊ dois métodos de autenticação?
 * - JWT Bearer: para o frontend (dashboard web) — token de sessão com expiração.
 * - API Key (header X-API-Key): para integrações programáticas — não expira, mas pode ser revogada.
 *
 * POR QUÊ SHA-256 para API Keys?
 * - Se o banco for comprometido, o atacante obtém apenas hashes — inúteis para autenticação.
 * - bcrypt seria desnecessariamente lento para API Keys (diferente de senhas que precisam de lentidão).
 * - SHA-256 é rápido e suficiente porque API Keys são geradas com alta entropia (não são senhas humanas).
 *
 * FLUXO:
 * 1. Verifica se há header Authorization (Bearer JWT) → decodifica e valida.
 * 2. Se não há JWT, verifica header X-API-Key → faz SHA-256 e busca no banco.
 * 3. Se nenhum está presente, retorna 401.
 * 4. Se válido, injeta `request.user` com { id, email }.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types.js';
import { db } from '../data/database.js';
import { createError } from '../utils/errors.js';

/**
 * Gera o hash SHA-256 de uma API Key.
 * Usado tanto na criação (para armazenar) quanto na validação (para comparar).
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

function hashesEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Decorator Fastify que protege rotas com autenticação.
 *
 * POR QUÊ decorator ao invés de plugin?
 * - Decorators permitem uso seletivo: `{ preHandler: [fastify.authenticate] }`
 * - Nem toda rota precisa de auth (ex: /health, /v1/auth/login).
 * - Plugin global forçaria exclusões via allowlist — mais frágil.
 *
 * @example
 * // No registro de rotas:
 * fastify.get('/v1/billing/credits', {
 *   preHandler: [fastify.authenticate],
 * }, handler);
 */
export async function registerAuthGuard(
  fastify: FastifyInstance
): Promise<void> {
  /**
   * Decora o request com a propriedade `user`.
   * POR QUÊ null como valor inicial?
   * - Fastify requer declaração prévia de propriedades customizadas via decorator.
   * - O valor real é preenchido pelo preHandler, null é apenas placeholder.
   */
  fastify.decorateRequest('user', null);

  /**
   * Decora a instância com o método `authenticate`.
   * Disponível como `fastify.authenticate` em qualquer rota.
   */
  fastify.decorate(
    'authenticate',
    async function authenticate(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      // =========================================
      // Tentativa 1: JWT Bearer Token
      // =========================================
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7); // Remove "Bearer "

        try {
          const jwtSecret = process.env.JWT_SECRET;
          if (!jwtSecret) {
            throw createError(
              'CONFIG_ERROR',
              'JWT_SECRET não configurado no servidor.',
              500
            );
          }

          const payload = jwt.verify(token, jwtSecret) as JwtPayload;

          /**
           * Injeta dados do usuário no request.
           * A partir daqui, qualquer handler pode acessar `request.user`.
           */
          request.user = {
            id: payload.sub,
            email: payload.email,
          };

          return; // Autenticação bem-sucedida via JWT
        } catch (error) {
          /**
           * POR QUÊ não retornar 401 imediatamente?
           * - Se o JWT falhou, pode ser que o cliente está usando API Key.
           * - Só retornamos 401 se AMBOS os métodos falharem.
           *
           * Exceção: se o JWT está expirado (TokenExpiredError), retornamos 401
           * imediatamente — o cliente precisa saber que deve fazer refresh.
           */
          if (error instanceof jwt.TokenExpiredError) {
            throw createError(
              'TOKEN_EXPIRED',
              'Token de autenticação expirado. Faça login novamente.',
              401
            );
          }
          // Se não é expiração, cai para a tentativa de API Key abaixo
        }
      }

      // =========================================
      // Tentativa 2: API Key via header X-API-Key
      // =========================================
      const apiKey = request.headers['x-api-key'] as string | undefined;
      if (apiKey) {
        /**
         * POR QUÊ hash antes da query?
         * - Nunca enviamos a chave em texto puro para o banco.
         * - A comparação é feita entre hashes: SHA-256(input) vs SHA-256(armazenado).
         */
        const keyHash = hashApiKey(apiKey);

        const records = await db
          .selectFrom('api_keys')
          .innerJoin('users', 'users.id', 'api_keys.user_id')
          .select(['users.id as userId', 'users.email as userEmail', 'api_keys.key_hash as keyHash'])
          .where('api_keys.revoked_at', 'is', null) // Só aceita chaves não-revogadas
          .execute();

        let matchedRecord: typeof records[number] | undefined;
        for (const candidate of records) {
          const matches = hashesEqual(keyHash, candidate.keyHash);
          if (matches) matchedRecord = candidate;
        }

        if (matchedRecord) {
          const record = matchedRecord;
          request.user = {
            id: record.userId,
            email: record.userEmail,
          };
          return; // Autenticação bem-sucedida via API Key
        }
      }

      // =========================================
      // Nenhum método válido → 401
      // =========================================
      throw createError(
        'UNAUTHORIZED',
        'Autenticação necessária. Forneça um Bearer Token ou X-API-Key válido.',
        401
      );
    }
  );
}

// =========================================
// Augmentação de tipos do Fastify
// =========================================
/**
 * POR QUÊ augmentar os tipos?
 * - Sem isso, TypeScript não sabe que `fastify.authenticate` e `request.user` existem.
 * - A augmentação garante autocompletar e type-safety em todas as rotas.
 */
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }

  interface FastifyRequest {
    user: {
      id: string;
      email: string;
    } | null;
  }
}
