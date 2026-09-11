/**
 * @module lib/formatters
 * @description Formatadores de dados para exibição na UI.
 */

/**
 * Formata uma data ISO para formato brasileiro legível.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
}

/**
 * Formata um número com separadores de milhar brasileiro.
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('pt-BR');
}

/**
 * Formata créditos com sufixo apropriado.
 * Ex: 1500 → "1.500", 1000000 → "1M"
 */
export function formatCredits(credits: number): string {
  if (credits >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(1)}M`;
  }
  return formatNumber(credits);
}

/**
 * Formata tempo em milissegundos para formato legível.
 * Ex: 1500 → "1.5s", 250 → "250ms"
 */
export function formatElapsedTime(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}

/**
 * Retorna label em português para status de verificação.
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    valid: 'Válido',
    invalid: 'Inválido',
    disposable: 'Descartável',
    unknown: 'Inconclusivo',
    security_block: 'Bloqueado',
    unverifiable_network_blocked: 'SMTP indisponível',
    queued: 'Na Fila',
    processing: 'Processando',
    completed: 'Concluído',
    failed: 'Falhou',
  };
  return labels[status] ?? status;
}
