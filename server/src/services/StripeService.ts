import Stripe from 'stripe';
import { createError } from '../utils/errors.js';

export type Plan = 'starter' | 'pro' | 'enterprise';
export type Currency = 'brl' | 'eur' | 'usd';

export const PLANS: readonly Plan[] = ['starter', 'pro', 'enterprise'];
export const CURRENCIES: readonly Currency[] = ['brl', 'eur', 'usd'];

export const CREDITS_BY_PLAN: Record<Plan, number> = {
  starter: 5_000,
  pro: 25_000,
  enterprise: 100_000,
};

/**
 * Price IDs devem ser fornecidos por ambiente; nunca aceite um Price ID vindo do cliente.
 * O fallback vazio faz a aplicação falhar de forma explícita quando o catálogo não foi configurado.
 */
export const STRIPE_PRICE_IDS: Record<Plan, Record<Currency, string>> = {
  starter: {
    brl: process.env.STRIPE_PRICE_STARTER_BRL ?? '',
    eur: process.env.STRIPE_PRICE_STARTER_EUR ?? '',
    usd: process.env.STRIPE_PRICE_STARTER_USD ?? '',
  },
  pro: {
    brl: process.env.STRIPE_PRICE_PRO_BRL ?? '',
    eur: process.env.STRIPE_PRICE_PRO_EUR ?? '',
    usd: process.env.STRIPE_PRICE_PRO_USD ?? '',
  },
  enterprise: {
    brl: process.env.STRIPE_PRICE_ENTERPRISE_BRL ?? '',
    eur: process.env.STRIPE_PRICE_ENTERPRISE_EUR ?? '',
    usd: process.env.STRIPE_PRICE_ENTERPRISE_USD ?? '',
  },
};

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw createError('CONFIG_ERROR', 'STRIPE_SECRET_KEY não configurada no ambiente.', 500);
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

export function isPlan(value: string): value is Plan {
  return PLANS.includes(value as Plan);
}

export function isCurrency(value: string): value is Currency {
  return CURRENCIES.includes(value as Currency);
}

export function getPriceId(plan: Plan, currency: Currency): string {
  const priceId = STRIPE_PRICE_IDS[plan][currency];
  if (!priceId) {
    throw createError(
      'CONFIG_ERROR',
      `Price ID Stripe não configurado para ${plan}/${currency}.`,
      500
    );
  }
  return priceId;
}

export function getCreditsForPlan(plan: Plan): number {
  return CREDITS_BY_PLAN[plan];
}

export function getCreditsForPrice(priceId: string): number | null {
  for (const plan of PLANS) {
    for (const currency of CURRENCIES) {
      if (STRIPE_PRICE_IDS[plan][currency] === priceId && priceId.length > 0) {
        return CREDITS_BY_PLAN[plan];
      }
    }
  }
  return null;
}
