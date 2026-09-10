/**
 * @file login/page.tsx
 * @description Página de login com formulário validado e design premium.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/verify');
    } catch (err: any) {
      setError(
        err.response?.data?.message ?? 'Erro ao fazer login. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="gradient-hero grid-pattern flex min-h-screen items-center justify-center px-6">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600/20 blur-[128px]" />

      <div className="glass-card animate-slide-up relative w-full max-w-md p-8">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <span className="text-lg font-bold text-white">CM</span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Bem-vindo de volta</h1>
          <p className="mt-1 text-surface-200">Entre na sua conta CleanMail</p>
        </div>

        {/* Erro */}
        {error && (
          <div
            className="mb-4 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm font-medium text-surface-200"
            >
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              aria-label="Endereço de e-mail"
              className="w-full rounded-lg border border-white/10 bg-surface-800/50 px-4 py-3 text-white placeholder:text-surface-200/50 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-medium text-surface-200"
            >
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              aria-label="Senha"
              minLength={8}
              className="w-full rounded-lg border border-white/10 bg-surface-800/50 px-4 py-3 text-white placeholder:text-surface-200/50 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary-600 py-3 font-semibold text-white shadow-lg transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-200">
          Não tem conta?{' '}
          <Link
            href="/register"
            className="font-medium text-primary-400 hover:text-primary-300"
          >
            Criar conta grátis
          </Link>
        </p>
      </div>
    </main>
  );
}
