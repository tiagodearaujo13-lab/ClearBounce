/**
 * @file register/page.tsx
 * @description Página de cadastro com validação e auto-login.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Validação client-side
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password);
      router.push('/verify');
    } catch (err: any) {
      setError(
        err.response?.data?.message ?? 'Erro ao criar conta. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="gradient-hero grid-pattern flex min-h-screen items-center justify-center px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600/20 blur-[128px]" />

      <div className="glass-card animate-slide-up relative w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <span className="text-lg font-bold text-white">CM</span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Crie sua conta</h1>
          <p className="mt-1 text-surface-200">
            Ganhe 100 verificações grátis para começar
          </p>
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="register-email"
              className="mb-2 block text-sm font-medium text-surface-200"
            >
              E-mail
            </label>
            <input
              id="register-email"
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
              htmlFor="register-password"
              className="mb-2 block text-sm font-medium text-surface-200"
            >
              Senha
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              aria-label="Senha"
              minLength={8}
              className="w-full rounded-lg border border-white/10 bg-surface-800/50 px-4 py-3 text-white placeholder:text-surface-200/50 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label
              htmlFor="register-confirm-password"
              className="mb-2 block text-sm font-medium text-surface-200"
            >
              Confirmar Senha
            </label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repita a senha"
              aria-label="Confirmar senha"
              minLength={8}
              className="w-full rounded-lg border border-white/10 bg-surface-800/50 px-4 py-3 text-white placeholder:text-surface-200/50 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary-600 py-3 font-semibold text-white shadow-lg transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Criando conta...' : 'Criar Conta Grátis'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-200">
          Já tem conta?{' '}
          <Link
            href="/login"
            className="font-medium text-primary-400 hover:text-primary-300"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  );
}
