import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Stripe from 'stripe';
import { db } from '../../data/database.js';
import { registerAuthGuard } from '../../middlewares/authGuard.js';
import { createError } from '../../utils/errors.js';
import {
  getCreditsForPlan,
  getPriceId,
  getStripe,
  isCurrency,
  isPlan,
  type Currency,
  type Plan,
} from '../../services/StripeService.js';
import type { CheckoutRequestDto } from '../../types.js';

interface CheckoutBody extends CheckoutRequestDto {
  plan: Plan;
  currency: Currency;
}

export async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  await registerAuthGuard(fastify);

  fastify.get('/credits', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
  });

  fastify.post<{ Body: CheckoutRequestDto }>(
    '/checkout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['plan', 'currency'],
          properties: {
            plan: { type: 'string', enum: ['starter', 'pro', 'enterprise'] },
            currency: { type: 'string', enum: ['brl', 'eur', 'usd'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { plan, currency } = request.body;
      if (!isPlan(plan) || !isCurrency(currency)) {
        throw createError('INVALID_CHECKOUT', 'Plano ou moeda inválidos.', 400);
      }

      const user = request.user!;
      const priceId = getPriceId(plan, currency);
      const stripe = getStripe();
      const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
        currency === 'brl' ? ['card', 'pix'] : currency === 'eur' ? ['card', 'sepa_debit'] : ['card'];

      const origin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: paymentMethodTypes,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          userId: user.id,
          plan,
          currency,
          priceId,
          credits: String(getCreditsForPlan(plan)),
        },
        client_reference_id: user.id,
        success_url: `${origin}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=cancelled`,
      });

      return reply.send({ checkoutUrl: session.url, sessionId: session.id });
    },
  );

  fastify.post(
    '/webhook',
    { config: { rateLimit: false } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw createError('CONFIG_ERROR', 'STRIPE_WEBHOOK_SECRET não configurado.', 500);
      }

      const signature = request.headers['stripe-signature'];
      if (typeof signature !== 'string') {
        throw createError('INVALID_WEBHOOK', 'Header stripe-signature ausente.', 400);
      }

      let event: Stripe.Event;
      try {
        event = getStripe().webhooks.constructEvent(
          ((request.raw as FastifyRequest['raw'] & { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0)),
          signature,
          webhookSecret,
        );
      } catch (error) {
        fastify.log.warn(`Webhook Stripe rejeitado: ${error instanceof Error ? error.message : 'assinatura inválida'}`);
        throw createError('INVALID_SIGNATURE', 'Assinatura do webhook inválida.', 400);
      }

      // A chave primária event_id torna a operação atômica contra replay/concurrency.
      const inserted = await db
        .insertInto('stripe_events')
        .values({ event_id: event.id, event_type: event.type })
        .onConflict((oc) => oc.column('event_id').doNothing())
        .returning('event_id')
        .executeTakeFirst();

      if (!inserted) {
        return reply.status(200).send({ received: true, duplicate: true });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        const plan = session.metadata?.plan;
        if (!userId || !plan || !isPlan(plan)) {
          fastify.log.error(`Webhook ${event.id} sem metadata válida.`);
          return reply.status(200).send({ received: true });
        }

        await db
          .updateTable('credits')
          .set((eb) => ({
            balance: eb('balance', '+', getCreditsForPlan(plan)),
            updated_at: new Date(),
          }))
          .where('user_id', '=', userId)
          .execute();
      }

      // invoice.payment_succeeded pode ser usado para assinaturas futuras; neste catálogo
      // de pagamentos únicos não credita novamente para evitar dupla concessão.
      return reply.status(200).send({ received: true });
    },
  );
}
