/**
 * @file verify/page.tsx
 * @description Página principal de verificação: e-mail avulso + upload CSV.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/services/api';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useBatchProgress } from '@/hooks/useBatchProgress';

/** Mapeamento de status para classes CSS de badge */
const STATUS_BADGE: Record<string, string> = {
  valid: 'badge-valid',
  invalid: 'badge-invalid',
  disposable: 'badge-disposable',
  unknown: 'badge-unknown',
  security_block: 'badge-invalid',
  unverifiable_network_blocked: 'badge-unknown',
};

const STATUS_LABEL: Record<string, string> = {
  valid: 'Válido',
  invalid: 'Inválido',
  disposable: 'Descartável',
  unknown: 'Inconclusivo',
  unverifiable_network_blocked: 'SMTP indisponível no ambiente',
  security_block: 'Bloqueado (SSRF)',
};

export default function VerifyPage() {
  // =========================================
  // Estado: Verificação Avulsa
  // =========================================
  const [singleEmail, setSingleEmail] = useState('');
  const [singleResult, setSingleResult] = useState<any>(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState('');

  // =========================================
  // Estado: Upload CSV
  // =========================================
  const upload = useFileUpload();
  const batch = useBatchProgress(upload.jobId);

  const [downloadError, setDownloadError] = useState('');

  async function handleBatchDownload(jobId: string) {
    setDownloadError('');
    try {
      const response = await api.get(`/v1/verify/batch/${jobId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cleanmail_results_${jobId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Não foi possível baixar o resultado. Tente novamente.');
    }
  }

  async function handleSingleVerify(e: FormEvent) {
    e.preventDefault();
    setSingleError('');
    setSingleResult(null);
    setSingleLoading(true);

    try {
      const response = await api.post('/v1/verify/single', {
        email: singleEmail,
      });
      setSingleResult(response.data);
    } catch (err: any) {
      setSingleError(
        err.response?.data?.message ?? 'Erro ao verificar e-mail.'
      );
    } finally {
      setSingleLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* =========================================
          VERIFICAÇÃO AVULSA
          ========================================= */}
      <section className="glass-card p-8">
        <h3 className="mb-1 text-xl font-semibold">Verificação Avulsa</h3>
        <p className="mb-6 text-sm text-surface-200">
          Digite um e-mail para verificar instantaneamente.
        </p>

        <form onSubmit={handleSingleVerify} className="flex gap-3">
          <input
            id="single-email-input"
            type="email"
            value={singleEmail}
            onChange={(e) => setSingleEmail(e.target.value)}
            placeholder="exemplo@dominio.com"
            required
            aria-label="E-mail para verificar"
            className="flex-1 rounded-lg border border-white/10 bg-surface-800/50 px-4 py-3 text-white placeholder:text-surface-200/50 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={singleLoading}
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {singleLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Verificando...
              </span>
            ) : (
              'Verificar'
            )}
          </button>
        </form>

        {singleError && (
          <div className="mt-4 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400">
            {singleError}
          </div>
        )}

        {singleResult && (
          <div className="mt-6 rounded-lg border border-white/5 bg-surface-800/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-white">
                  {singleResult.result.email}
                </p>
                <p className="mt-1 text-sm text-surface-200">
                  {singleResult.result.reason}
                </p>
              </div>
              <span
                className={`badge ${STATUS_BADGE[singleResult.result.status] ?? 'badge-unknown'}`}
              >
                {STATUS_LABEL[singleResult.result.status] ?? singleResult.result.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-4 border-t border-white/5 pt-4">
              <div>
                <p className="text-xs text-surface-200">Etapa</p>
                <p className="font-medium text-white">{singleResult.result.stage}</p>
              </div>
              <div>
                <p className="text-xs text-surface-200">Código SMTP</p>
                <p className="font-medium text-white">
                  {singleResult.result.smtpCode ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-200">Tempo</p>
                <p className="font-medium text-white">
                  {singleResult.result.elapsedMs}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-200">Créditos restantes</p>
                <p className="font-medium text-warning-400">
                  {singleResult.creditsRemaining?.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =========================================
          UPLOAD DE CSV
          ========================================= */}
      <section className="glass-card p-8">
        <h3 className="mb-1 text-xl font-semibold">Verificação em Lote</h3>
        <p className="mb-6 text-sm text-surface-200">
          Faça upload de um arquivo CSV com a lista de e-mails a verificar.
        </p>

        {/* Dropzone */}
        <div
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition ${
            upload.file
              ? 'border-primary-500/50 bg-primary-600/5'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <input
            id="csv-file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.selectFile(file);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Selecionar arquivo CSV"
          />

          <div className="flex flex-col items-center gap-3">
            <svg className="h-10 w-10 text-surface-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>

            {upload.file ? (
              <div>
                <p className="font-medium text-white">{upload.file.name}</p>
                <p className="text-sm text-surface-200">
                  {(upload.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-white">
                  Arraste ou clique para selecionar
                </p>
                <p className="text-sm text-surface-200">
                  CSV até 10MB • Uma coluna com e-mails
                </p>
              </div>
            )}
          </div>
        </div>

        {upload.error && (
          <div className="mt-4 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400">
            {upload.error}
          </div>
        )}

        {/* Botão de upload */}
        {upload.file && !upload.jobId && (
          <button
            onClick={upload.upload}
            disabled={upload.isUploading}
            className="mt-4 w-full rounded-lg bg-primary-600 py-3 font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {upload.isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Enviando... {upload.progress}%
              </span>
            ) : (
              'Iniciar Verificação em Lote'
            )}
          </button>
        )}

        {/* =========================================
            PROGRESSO DO BATCH
            ========================================= */}
        {batch.data && (
          <div className="mt-6 rounded-lg border border-white/5 bg-surface-800/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-white">
                Processamento em andamento
              </h4>
              <span
                className={`badge ${
                  batch.data.status === 'completed'
                    ? 'badge-valid'
                    : batch.data.status === 'failed'
                    ? 'badge-invalid'
                    : 'badge-unknown'
                }`}
              >
                {batch.data.status === 'completed'
                  ? 'Concluído'
                  : batch.data.status === 'failed'
                  ? 'Falhou'
                  : batch.data.status === 'processing'
                  ? 'Processando'
                  : 'Na fila'}
              </span>
            </div>

            {/* Barra de progresso */}
            <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-surface-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-500"
                style={{ width: `${batch.data.progress}%` }}
                role="progressbar"
                aria-valuenow={batch.data.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso: ${batch.data.progress}%`}
              />
            </div>

            <div className="flex justify-between text-sm text-surface-200">
              <span>
                {batch.data.processedEmails.toLocaleString('pt-BR')} de{' '}
                {batch.data.totalEmails.toLocaleString('pt-BR')} e-mails
              </span>
              <span className="font-medium text-white">
                {batch.data.progress}%
              </span>
            </div>

            {/* Botão de download */}
            {batch.data.status === 'completed' && (
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  void handleBatchDownload(batch.data?.id ?? '');
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-success-600 py-3 font-semibold text-white transition hover:bg-success-500"
                download
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Baixar CSV com Resultados
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
