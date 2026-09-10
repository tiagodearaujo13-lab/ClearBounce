/**
 * @module rateLimiter
 * @description Rate limiting por IP com @fastify/rate-limit.
 *
 * POR QUÊ rate limiting?
 * - Protege contra ataques de força bruta (login, registro).
 * - Previne abuso de recursos (verificação de e-mails em massa sem pagar).
 * - Mitiga DDoS básico na camada de aplicação.
 *
 * POR QUÊ dois limites separados?
 * - Endpoints públicos (login, registro): 20 req/min — mais restritivo.
 * - Endpoints autenticados: 100 req/min por IP — razoável para uso legítimo.
 * - Rate limit por API Key é aplicado no authGuard individualmente.
 */

import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

export async function registerRateLimiter(
  fastify: FastifyInstance
): Promise<void> {
  await fastify.register(rateLimit, {
    /**
     * Limite global padrão: 100 requests por minuto por IP.
     *
     * POR QUÊ 100?
     * - Um usuário normal do dashboard faz ~10-20 requests/min navegando.
     * - Validação de e-mail avulso é 1 request por vez.
     * - 100 dá margem para uso intenso sem permitir abuso.
     */
    max: 100,
    timeWindow: '1 minute',

    /**
     * POR QUÊ keyGenerator por IP?
     * - Identifica o cliente pelo IP real, considerando proxies (X-Forwarded-For).
     * - Em produção atrás de um load balancer (Render), o IP vem no header.
     */
    keyGenerator: (request) => {
      return request.ip;
    },

    /**
     * Resposta customizada quando o limite é excedido.
     *
     * POR QUÊ mensagem genérica?
     * - Não revelamos o limite exato ao atacante (security through obscurity
     *   NÃO é a defesa principal, mas é uma camada adicional).
     * - Incluímos Retry-After no header (padrão do plugin) para clientes legítimos.
     */
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Limite de requisições excedido. Tente novamente em ${context.after}.`,
      code: 'RATE_LIMIT_EXCEEDED',
    }),
  });
}
