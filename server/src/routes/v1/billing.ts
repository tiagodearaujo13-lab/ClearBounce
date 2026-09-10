/**
 * @module billing
 * @description Rotas de billing — créditos, checkout Stripe e webhook.
 *
 * ENDPOINTS:
 * - GET  /v1/billing/credits  — Saldo atual de créditos (requer auth)
 * - POST /v1/billing/checkout — Cria sessão de pagamento Stripe (requer auth)
 * - POST /v1/billing/webhook  — Webhook Stripe (NÃO requer auth, usa assinatura)
 *
 * SEGURANÇA DO WEBHOOK:
 * - O webhook NÃO usa autenticação JWT/API Key.
 * - Em vez disso, valida a assinatura criptográfica do Stripe.
 * - Isso garante que apenas o Stripe pode chamar este endpoint.
 * - Raw body é OBRIGATÓRIO para validação de assinatura.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { db } from '../../data/database.js';
import { registerAuthGuard } from '../../middlewares/authGuard.js';
import { createError } from '../../utils/errors.js';
import type { CheckoutRequestDto } from '../../types.js';

/**
 * POR QUÊ inicializar Stripe aqui e não em um serviço separado?
 * - O cliente Stripe é stateless — apenas encapsula a API Key.
 * - Para um MVP, inicializar inline é suficiente.
 * - Se crescer, extrair para StripeService.ts.
 */
function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw createError(
      'CONFIG_ERROR',
      'STRIPE_SECRET_KEY não configurada.',
      500
    );
  }
  return new Stripe(secretKey);
}

/** Mapeamento de preço → créditos (configuração de planos) */
const CREDIT_PACKAGES: Record<string, number> = {
  /**
   * POR QUÊ hardcoded ao invés de banco?
   * - Para MVP, manter simples. Os Price IDs vêm do dashboard Stripe.
   * - Em produção, migrar para tabela `plans` no banco.
   * - Cada entry: priceId do Stripe → quantidade de créditos
   */
  price_starter: 1000,     // Starter: 1.000 verificações
  price_pro: 10000,        // Pro: 10.000 verificações
  price_enterprise: 100000, // Enterprise: 100.000 verificações
};

export async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  await registerAuthGuard(fastify);

  // =========================================
  // GET /v1/billing/credits
  // =========================================
  fastify.get(
    '/credits',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user!;

      const credits = await db
        .selectFrom('credits')
        .select(['balance', 'updated_at'])
        .where('user_id', '=', user.id)
        .executeTakeFirst();

      return reply.send({
        balance: credits?.balance ?? 0,
        updatedAt: credits?.updated_at ?? null,
      });
    }
  );

  // =========================================
  // POST /v1/billing/checkout
  // =========================================
  /**
   * Cria sessão de checkout no Stripe.
   *
   * FLUXO:
   * 1. Usuário clica em "Comprar créditos" no frontend.
   * 2. Frontend chama POST /v1/billing/checkout com priceId.
   * 3. Backend cria sessão Stripe Checkout e retorna URL.
   * 4. Frontend redireciona para o Stripe (página de pagamento hospedada).
   * 5. Após pagamento, Stripe chama nosso webhook para confirmar.
   * 6. Webhook adiciona créditos ao usuário.
   *
   * POR QUÊ Stripe Checkout (hosted) ao invés de Elements (embedded)?
   * - Checkout hosted é PCI compliant sem nenhum esforço nosso.
   * - Dados de cartão NUNCA passam pelo nosso servidor.
   * - Suporta múltiplos métodos de pagamento (cartão, boleto, PIX) nativamente.
   */
  fastify.post<{ Body: CheckoutRequestDto }>(
    '/checkout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['priceId'],
          properties: {
            priceId: { type: 'string' },
            credits: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const { priceId } = request.body;

      const stripe = getStripeClient();

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        /**
         * POR QUÊ metadata com userId e priceId?
         * - O webhook precisa saber QUEM pagou e QUAL pacote.
         * - Metadata é incluída no evento checkout.session.completed.
         * - Alternativa seria buscar pelo customer email — menos confiável.
         */
        metadata: {
          userId: user.id,
          priceId,
        },
        /**
         * POR QUÊ client_reference_id?
         * - Backup para identificar o usuário caso metadata falhe.
         * - Campo nativo do Stripe, sempre disponível no evento.
         */
        client_reference_id: user.id,
        success_url: `${process.env.CORS_ORIGIN}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CORS_ORIGIN}/dashboard/billing?cancelled=true`,
      });

      return reply.send({
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    }
  );

  // =========================================
  // POST /v1/billing/webhook
  // =========================================
  /**
   * Webhook para receber eventos do Stripe.
   *
   * SEGURANÇA CRÍTICA:
   * - Valida assinatura do webhook usando STRIPE_WEBHOOK_SECRET.
   * - Raw body é OBRIGATÓRIO — JSON parseado invalida a assinatura.
   * - Se a assinatura não bater, rejeita com 400.
   *
   * POR QUÊ addContentTypeParser para raw body?
   * - Fastify parseia JSON automaticamente, mas o Stripe precisa do body RAW.
   * - Registramos um parser que mantém o body como Buffer para este endpoint.
   */
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      /**
       * POR QUÊ manter como buffer?
       * - stripe.webhooks.constructEvent() precisa do body exatamente como recebido.
       * - Se parsearmos para JSON e serializarmos de volta, a assinatura quebra
       *   por diferenças de formatação (espaços, ordem de chaves).
       */
      done(null, body);
    }
  );

  fastify.post(
    '/webhook',
    {
      /**
       * POR QUÊ NÃO tem preHandler: [fastify.authenticate]?
       * - O Stripe não envia JWT nem API Key.
       * - A autenticação é feita pela validação de assinatura criptográfica.
       * - Adicionar auth aqui bloquearia TODOS os webhooks do Stripe.
       */
      config: {
        // Desabilita rate limit para webhook (Stripe pode enviar muitos eventos)
        rateLimit: false,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const stripe = getStripeClient();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw createError(
          'CONFIG_ERROR',
          'STRIPE_WEBHOOK_SECRET não configurado.',
          500
        );
      }

      const signature = request.headers['stripe-signature'] as string;
      if (!signature) {
        throw createError(
          'INVALID_WEBHOOK',
          'Header stripe-signature ausente.',
          400
        );
      }

      let event: Stripe.Event;
      try {
        /**
         * VALIDAÇÃO CRIPTOGRÁFICA:
         * - O Stripe assina cada evento com HMAC-SHA256 usando o webhook secret.
         * - constructEvent() verifica essa assinatura contra o raw body.
         * - Se alguém tentar forjar um evento, a assinatura não bate → exceção.
         */
        event = stripe.webhooks.constructEvent(
          request.body as Buffer,
          signature,
          webhookSecret
        );
      } catch (error) {
        fastify.log.warn(
          `⚠️ Webhook do Stripe com assinatura inválida: ${(error as Error).message}`
        );
        throw createError(
          'INVALID_SIGNATURE',
          'Assinatura do webhook inválida.',
          400
        );
      }

      // =========================================
      // Processar evento
      // =========================================
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId ?? session.client_reference_id;
          const priceId = session.metadata?.priceId;

          if (!userId || !priceId) {
            fastify.log.error('❌ Webhook: userId ou priceId ausente no metadata.');
            break;
          }

          const creditsToAdd = CREDIT_PACKAGES[priceId] ?? 0;
          if (creditsToAdd === 0) {
            fastify.log.warn(`⚠️ PriceId "${priceId}" não mapeado para nenhum pacote de créditos.`);
            break;
          }

          /**
           * POR QUÊ raw SQL com incremento ao invés de SELECT + UPDATE?
           * - Evita race condition: se dois webhooks chegarem simultaneamente,
           *   SELECT + UPDATE poderia sobrescrever o saldo com valor desatualizado.
           * - balance = balance + N é atômico no PostgreSQL.
           */
          await db
            .updateTable('credits')
            .set((eb) => ({
              balance: eb('balance', '+', creditsToAdd),
              updated_at: new Date(),
            }))
            .where('user_id', '=', userId)
            .execute();

          fastify.log.info(
            `✅ Créditos adicionados: +${creditsToAdd} para usuário ${userId}`
          );
          break;
        }

        default:
          // Eventos não tratados são ignorados silenciosamente
          fastify.log.debug(`Evento Stripe ignorado: ${event.type}`);
      }

      /**
       * POR QUÊ sempre retornar 200?
       * - O Stripe espera 2xx para confirmar recebimento.
       * - Se retornarmos 4xx/5xx, o Stripe vai REENVIAR o evento (até 3 dias).
       * - Mesmo se não processamos o evento, confirmamos recebimento.
       */
      return reply.status(200).send({ received: true });
    }
  );
}
