/**
 * @file settings/page.tsx
 * @description Página de configurações: API Keys e billing.
 */

'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/services/api';

interface ApiKeyItem {
  id: string;
  name: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
      new Date(date)
    );

  async function handleCreateKey(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCreatedKey(null);
    setIsCreating(true);

    try {
      const response = await api.post('/v1/auth/api-keys', {
        name: newKeyName,
      });
      setCreatedKey(response.data.key);
      setNewKeyName('');

      // Adiciona na lista local
      setApiKeys((prev) => [
        {
          id: response.data.id,
          name: response.data.name,
          createdAt: response.data.createdAt,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar API Key.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevokeKey(id: string) {
    try {
      await api.delete(`/v1/auth/api-keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      // Silencia erro
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* =========================================
          API KEYS
          ========================================= */}
      <section className="glass-card p-8">
        <h3 className="mb-1 text-xl font-semibold">API Keys</h3>
        <p className="mb-6 text-sm text-surface-200">
          Gerencie suas chaves de API para integrações programáticas.
        </p>

        {/* Formulário de criação */}
        <form onSubmit={handleCreateKey} className="flex gap-3">
          <input
            id="api-key-name"
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Nome da chave (ex: Integração CRM)"
            required
            maxLength={100}
            aria-label="Nome da API Key"
            className="flex-1 rounded-lg border border-white/10 bg-surface-800/50 px-4 py-3 text-white placeholder:text-surface-200/50 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? 'Gerando...' : 'Gerar Chave'}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400">
            {error}
          </div>
        )}

        {/* Chave recém-criada (exibida uma única vez) */}
        {createdKey && (
          <div className="mt-4 rounded-lg border border-warning-500/30 bg-warning-500/10 p-4">
            <p className="mb-2 text-sm font-medium text-warning-400">
              ⚠️ Copie esta chave agora — ela não será exibida novamente!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-surface-900 px-3 py-2 font-mono text-sm text-white">
                {createdKey}
              </code>
              <button
                onClick={() => copyToClipboard(createdKey)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
              >
                {copied ? '✅ Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de chaves */}
        <div className="mt-6 space-y-3">
          {apiKeys.length === 0 ? (
            <p className="py-8 text-center text-sm text-surface-200/60">
              Nenhuma API Key criada ainda.
            </p>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-surface-800/30 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{key.name}</p>
                  <p className="text-xs text-surface-200">
                    Criada em {formatDate(key.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  className="rounded-lg border border-danger-500/30 px-3 py-1.5 text-sm font-medium text-danger-400 transition hover:bg-danger-500/10"
                >
                  Revogar
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* =========================================
          BILLING
          ========================================= */}
      <section className="glass-card p-8">
        <h3 className="mb-1 text-xl font-semibold">Comprar Créditos</h3>
        <p className="mb-6 text-sm text-surface-200">
          Escolha um pacote de créditos para continuar verificando e-mails.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: 'Starter', credits: '1.000', price: 'R$49', priceId: 'price_starter' },
            { name: 'Pro', credits: '10.000', price: 'R$299', priceId: 'price_pro', popular: true },
            { name: 'Enterprise', credits: '100.000', price: 'R$1.499', priceId: 'price_enterprise' },
          ].map((pkg) => (
            <button
              key={pkg.priceId}
              onClick={async () => {
                try {
                  const response = await api.post('/v1/billing/checkout', {
                    priceId: pkg.priceId,
                  });
                  window.location.href = response.data.checkoutUrl;
                } catch {
                  // Silencia erro
                }
              }}
              className={`relative rounded-xl border p-6 text-left transition hover:-translate-y-0.5 ${
                pkg.popular
                  ? 'border-primary-500/50 bg-primary-600/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-bold uppercase text-white">
                  Popular
                </span>
              )}
              <p className="text-sm font-medium text-surface-200">{pkg.name}</p>
              <p className="mt-2 text-2xl font-bold text-white">{pkg.price}</p>
              <p className="mt-1 text-sm text-surface-200">
                {pkg.credits} verificações
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
