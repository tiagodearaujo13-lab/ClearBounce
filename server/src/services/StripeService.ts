/**
 * @module StripeService
 * @description Serviço de integração com Stripe para gerenciamento de pagamentos.
 *
 * POR QUÊ isolar em serviço?
 * - Centraliza toda a lógica de interação com Stripe.
 * - Facilita mock em testes (substituir este módulo por fake).
 * - Quando adicionar novos métodos de pagamento, só altera aqui.
 *
 * NOTA: No MVP, a maioria da lógica está inline nas rotas de billing.
 * Este serviço serve como ponto de extensão para funcionalidades futuras:
 * - Gerenciamento de assinaturas (subscription)
 * - Portal do cliente Stripe
 * - Invoices e recibos
 * - Reembolsos
 */

import Stripe from 'stripe';
import { createError } from '../utils/errors.js';

let stripeInstance: Stripe | null = null;

/**
 * Retorna instância singleton do cliente Stripe.
 *
 * POR QUÊ singleton?
 * - O cliente Stripe é stateless, mas instanciar múltiplas vezes é desperdício.
 * - Singleton garante que a API Key é validada uma única vez.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw createError(
        'CONFIG_ERROR',
        'STRIPE_SECRET_KEY não configurada no ambiente.',
        500
      );
    }

    stripeInstance = new Stripe(secretKey);
  }

  return stripeInstance;
}

/**
 * Pacotes de créditos disponíveis para compra.
 *
 * POR QUÊ definir aqui e não no banco?
 * - Para MVP, hardcoded é mais simples e rápido.
 * - Os price IDs são criados no dashboard do Stripe.
 * - Para escalar, migrar para tabela `plans` no banco.
 */
export const CREDIT_PACKAGES = [
  {
    name: 'Starter',
    credits: 1_000,
    priceId: 'price_starter',
    description: '1.000 verificações de e-mail',
  },
  {
    name: 'Pro',
    credits: 10_000,
    priceId: 'price_pro',
    description: '10.000 verificações de e-mail',
  },
  {
    name: 'Enterprise',
    credits: 100_000,
    priceId: 'price_enterprise',
    description: '100.000 verificações de e-mail',
  },
] as const;

/**
 * Busca a quantidade de créditos para um priceId.
 */
export function getCreditsForPrice(priceId: string): number | null {
  const pkg = CREDIT_PACKAGES.find((p) => p.priceId === priceId);
  return pkg?.credits ?? null;
}
