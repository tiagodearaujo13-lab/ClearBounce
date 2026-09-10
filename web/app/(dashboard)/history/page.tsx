/**
 * @file history/page.tsx
 * @description Histórico de batch jobs do usuário.
 */

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface BatchJob {
  id: string;
  status: string;
  totalEmails: number;
  processedEmails: number;
  progress: number;
  createdAt: string;
  completedAt: string | null;
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        // Nota: Este endpoint precisa ser implementado no backend (listagem de jobs)
        // Por agora, demonstramos a UI com dados vazios
        setJobs([]);
      } catch {
        // Silencia erro
      } finally {
        setIsLoading(false);
      }
    }

    fetchJobs();
  }, []);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(date));

  const statusLabel: Record<string, string> = {
    queued: 'Na fila',
    processing: 'Processando',
    completed: 'Concluído',
    failed: 'Falhou',
  };

  const statusBadge: Record<string, string> = {
    queued: 'badge-unknown',
    processing: 'badge-unknown',
    completed: 'badge-valid',
    failed: 'badge-invalid',
  };

  return (
    <div>
      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/5 px-6 py-4">
          <h3 className="text-lg font-semibold">Histórico de Verificações</h3>
          <p className="text-sm text-surface-200">
            Acompanhe o status e baixe resultados de verificações em lote.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="mx-auto h-12 w-12 text-surface-200/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h4 className="mt-4 text-lg font-medium text-surface-200">
              Nenhuma verificação ainda
            </h4>
            <p className="mt-1 text-sm text-surface-200/60">
              Faça upload de um CSV na página de Verificação para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-white/5 text-left text-sm text-surface-200">
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">E-mails</th>
                  <th className="px-6 py-3 font-medium">Progresso</th>
                  <th className="px-6 py-3 font-medium">Criado em</th>
                  <th className="px-6 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-white/5 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-surface-200">
                      {job.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${statusBadge[job.status]}`}>
                        {statusLabel[job.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {job.totalEmails.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-800">
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-surface-200">
                          {job.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-200">
                      {formatDate(job.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {job.status === 'completed' && (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL}/v1/verify/batch/${job.id}/download`}
                          className="text-sm font-medium text-primary-400 hover:text-primary-300"
                          download
                        >
                          Baixar
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
