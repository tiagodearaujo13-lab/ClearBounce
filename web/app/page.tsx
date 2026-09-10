/**
 * @file page.tsx
 * @description Landing page pública do CleanMail.
 *
 * SEÇÕES:
 * 1. Hero — Headline impactante + CTA principal
 * 2. Features — 3 pilares: Velocidade, Segurança, Escala
 * 3. How It Works — Pipeline de 4 etapas visual
 * 4. Pricing — 3 planos de créditos
 * 5. Footer — Links e copyright
 */

import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* =========================================
          NAVBAR
          ========================================= */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-sm font-bold text-white">CM</span>
            </div>
            <span className="text-lg font-bold text-white">CleanMail</span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-surface-200 transition hover:text-white">
              Recursos
            </a>
            <a href="#how-it-works" className="text-sm text-surface-200 transition hover:text-white">
              Como Funciona
            </a>
            <a href="#pricing" className="text-sm text-surface-200 transition hover:text-white">
              Preços
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-surface-200 transition hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-500 hover:shadow-primary-600/25"
            >
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* =========================================
          HERO SECTION
          ========================================= */}
      <section className="gradient-hero grid-pattern relative flex min-h-screen items-center justify-center px-6 pt-20">
        {/* Glow decorativo */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600/20 blur-[128px]" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-950/50 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-success-400 animate-pulse" />
            <span className="text-sm font-medium text-primary-300">
              +10 milhões de e-mails validados
            </span>
          </div>

          <h1 className="animate-slide-up mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            Limpe suas listas.{' '}
            <span className="text-gradient">Proteja sua reputação.</span>
          </h1>

          <p className="animate-slide-up mx-auto mb-10 max-w-2xl text-lg text-surface-200 md:text-xl" style={{ animationDelay: '0.1s' }}>
            Validação de e-mails em escala com verificação SMTP real.
            Detecte endereços inválidos, descartáveis e inexistentes antes de enviar.
          </p>

          <div className="animate-slide-up flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: '0.2s' }}>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-primary-500/30 hover:-translate-y-0.5"
            >
              Começar Grátis
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-8 py-4 text-lg font-medium text-surface-200 transition hover:border-white/20 hover:text-white"
            >
              Como Funciona
            </a>
          </div>

          {/* Stats */}
          <div className="animate-slide-up mt-16 grid grid-cols-3 gap-8 border-t border-white/5 pt-8" style={{ animationDelay: '0.3s' }}>
            <div>
              <p className="text-3xl font-bold text-white">99.2%</p>
              <p className="mt-1 text-sm text-surface-200">Precisão</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">&lt;3s</p>
              <p className="mt-1 text-sm text-surface-200">Por E-mail</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">100</p>
              <p className="mt-1 text-sm text-surface-200">Créditos Grátis</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          FEATURES SECTION
          ========================================= */}
      <section id="features" className="relative px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Por que escolher o <span className="text-gradient">CleanMail</span>?
            </h2>
            <p className="mx-auto max-w-2xl text-surface-200">
              Motor de validação em 4 etapas com proteções de segurança enterprise.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Feature 1 — Velocidade */}
            <div className="glass-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600/20">
                <svg className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold">Ultra Rápido</h3>
              <p className="text-surface-200">
                Pipeline otimizado em 4 etapas: sintaxe → DNS → descartáveis → SMTP.
                Falha cedo para economizar tempo em cada verificação.
              </p>
            </div>

            {/* Feature 2 — Segurança */}
            <div className="glass-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success-500/20">
                <svg className="h-6 w-6 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold">Segurança OWASP</h3>
              <p className="text-surface-200">
                Proteção contra SSRF, CSV Injection e brute force.
                API Keys com SHA-256. Rate limiting por IP e por chave.
              </p>
            </div>

            {/* Feature 3 — Escala */}
            <div className="glass-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-500/20">
                <svg className="h-6 w-6 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold">Upload em Massa</h3>
              <p className="text-surface-200">
                Faça upload de CSVs com até 100.000 e-mails.
                Processamento em background com acompanhamento em tempo real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          HOW IT WORKS
          ========================================= */}
      <section id="how-it-works" className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Pipeline de Validação em{' '}
              <span className="text-gradient">4 Etapas</span>
            </h2>
            <p className="mx-auto max-w-2xl text-surface-200">
              Cada etapa é mais rigorosa que a anterior. E-mails inválidos são
              rejeitados rapidamente, economizando recursos.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {[
              { step: '01', title: 'Sintaxe', desc: 'Regex RFC 5322 + limite 254 chars', color: 'primary' },
              { step: '02', title: 'DNS / MX', desc: 'Resolução de MX com timeout 2.5s', color: 'primary' },
              { step: '03', title: 'Descartáveis', desc: 'Lookup O(1) em +4.500 domínios', color: 'warning' },
              { step: '04', title: 'SMTP', desc: 'Handshake TCP com proteção SSRF', color: 'success' },
            ].map((item) => (
              <div key={item.step} className="glass-card relative p-6 text-center">
                <span className="text-5xl font-black text-white/5">{item.step}</span>
                <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-surface-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          PRICING SECTION
          ========================================= */}
      <section id="pricing" className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Planos <span className="text-gradient">Simples e Transparentes</span>
            </h2>
            <p className="mx-auto max-w-2xl text-surface-200">
              Pague apenas pelo que usar. Sem assinatura mensal obrigatória.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Starter */}
            <div className="glass-card p-8">
              <h3 className="text-lg font-semibold text-surface-200">Starter</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">R$49</span>
              </div>
              <p className="mt-2 text-sm text-surface-200">1.000 verificações</p>
              <ul className="mt-6 space-y-3">
                {['Validação SMTP completa', 'Detecção de descartáveis', 'API REST + Dashboard', 'Suporte por e-mail'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-surface-200">
                    <svg className="h-4 w-4 flex-shrink-0 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-lg border border-white/10 py-3 text-center font-semibold text-white transition hover:border-primary-500/50 hover:bg-primary-600/10"
              >
                Começar
              </Link>
            </div>

            {/* Pro — Destacado */}
            <div className="glass-card animate-pulse-glow relative border-primary-500/30 p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Mais Popular
              </div>
              <h3 className="text-lg font-semibold text-surface-200">Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">R$299</span>
              </div>
              <p className="mt-2 text-sm text-surface-200">10.000 verificações</p>
              <ul className="mt-6 space-y-3">
                {['Tudo do Starter', 'Upload de CSV em massa', 'Processamento prioritário', 'Webhooks e notificações', 'Suporte prioritário'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-surface-200">
                    <svg className="h-4 w-4 flex-shrink-0 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-lg bg-primary-600 py-3 text-center font-semibold text-white shadow-lg transition hover:bg-primary-500"
              >
                Escolher Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div className="glass-card p-8">
              <h3 className="text-lg font-semibold text-surface-200">Enterprise</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">R$1.499</span>
              </div>
              <p className="mt-2 text-sm text-surface-200">100.000 verificações</p>
              <ul className="mt-6 space-y-3">
                {['Tudo do Pro', 'API Keys ilimitadas', 'SLA 99.9% uptime', 'Gerente de conta dedicado', 'Integração personalizada'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-surface-200">
                    <svg className="h-4 w-4 flex-shrink-0 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-lg border border-white/10 py-3 text-center font-semibold text-white transition hover:border-primary-500/50 hover:bg-primary-600/10"
              >
                Contato Comercial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          FOOTER
          ========================================= */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-600">
              <span className="text-xs font-bold text-white">CM</span>
            </div>
            <span className="text-sm text-surface-200">
              © {new Date().getFullYear()} CleanMail. Todos os direitos reservados.
            </span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-surface-200 hover:text-white">Termos de Uso</a>
            <a href="#" className="text-sm text-surface-200 hover:text-white">Privacidade</a>
            <a href="#" className="text-sm text-surface-200 hover:text-white">Documentação API</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
