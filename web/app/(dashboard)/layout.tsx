/**
 * @file (dashboard)/layout.tsx
 * @description Layout do painel do usuário com sidebar e header.
 *
 * POR QUÊ layout separado para dashboard?
 * - Compartilha sidebar/header entre todas as páginas internas.
 * - Renderiza uma vez — performance excelente na navegação interna.
 * - Protege automaticamente todas as rotas filhas (redirect se não autenticado).
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

/** Items de navegação da sidebar */
const NAV_ITEMS = [
  {
    href: '/verify',
    label: 'Verificar',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'Histórico',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Configurações',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [credits, setCredits] = useState<number>(0);

  /**
   * Proteção de rota: redireciona para login se não autenticado.
   *
   * POR QUÊ no layout ao invés de middleware?
   * - Middleware do Next.js roda no edge (limitações de runtime).
   * - Verificação client-side é mais simples para MVP.
   * - Em produção, adicionar middleware de auth para proteção server-side.
   */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  /** Busca saldo de créditos ao montar e a cada 30s */
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCredits = async () => {
      try {
        const response = await api.get('/v1/billing/credits');
        setCredits(response.data.balance);
      } catch {
        // Silencia erro — créditos são informação complementar
      }
    };

    fetchCredits();
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-surface-950">
      {/* =========================================
          SIDEBAR
          ========================================= */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-white/5 bg-surface-900/50 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-white/5 px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <span className="text-sm font-bold text-white">CM</span>
          </div>
          <span className="text-lg font-bold text-white">CleanMail</span>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Menu principal">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-surface-200 hover:bg-white/5 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer da sidebar */}
        <div className="border-t border-white/5 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600/20">
              <span className="text-xs font-bold text-primary-400">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-white">
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-surface-200 transition hover:bg-white/5 hover:text-white"
              aria-label="Sair da conta"
              title="Sair"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================
          CONTEÚDO PRINCIPAL
          ========================================= */}
      <div className="ml-64 flex-1">
        {/* Header com saldo de créditos */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-surface-950/80 px-8 py-4 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white">
            {NAV_ITEMS.find((i) => i.href === pathname)?.label ?? 'Dashboard'}
          </h2>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-800/50 px-4 py-2">
            <svg className="h-4 w-4 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-white">
              {credits.toLocaleString('pt-BR')}
            </span>
            <span className="text-sm text-surface-200">créditos</span>
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
