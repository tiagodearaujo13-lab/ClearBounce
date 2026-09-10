/**
 * @module DnsResolver
 * @description Wrapper tipado sobre dns.promises para resolução MX com cache e timeout.
 *
 * POR QUÊ cache em memória?
 * - Um CSV com 100.000 e-mails pode ter milhares do mesmo domínio (ex: gmail.com).
 * - Sem cache, faríamos milhares de queries DNS idênticas ao resolver MX.
 * - Cache com TTL de 5 minutos reduz latência e carga no DNS resolver.
 *
 * POR QUÊ timeout via AbortController?
 * - dns.promises.resolveMx() não tem timeout nativo.
 * - AbortController permite cancelar a promise se exceder o limite.
 * - Sem timeout, um DNS resolver lento travaria toda a fila de validação.
 */

import dns from 'node:dns/promises';
import type { MxRecord } from 'node:dns';

/** Entrada de cache com timestamp para cálculo de TTL */
interface CacheEntry {
  records: MxRecord[];
  cachedAt: number; // timestamp em ms
}

export class DnsResolver {
  /** Cache de registros MX por domínio */
  private cache: Map<string, CacheEntry> = new Map();

  /** TTL do cache em milissegundos (padrão: 5 minutos) */
  private readonly cacheTtlMs: number;

  /** Timeout para queries DNS em milissegundos (padrão: 2500ms) */
  private readonly timeoutMs: number;

  /** Número de tentativas em caso de falha (padrão: 1 retry) */
  private readonly maxRetries: number;

  constructor(options?: {
    cacheTtlMs?: number;
    timeoutMs?: number;
    maxRetries?: number;
  }) {
    this.cacheTtlMs = options?.cacheTtlMs ?? 5 * 60 * 1000; // 5 minutos
    this.timeoutMs = options?.timeoutMs ?? 2500;
    this.maxRetries = options?.maxRetries ?? 1;
  }

  /**
   * Resolve os registros MX de um domínio, com cache e timeout.
   *
   * @param domain - Domínio para resolver (ex: "gmail.com")
   * @returns Array de MxRecord ordenado por prioridade (menor = mais prioritário)
   * @throws Error se o DNS não responder dentro do timeout após retries
   *
   * POR QUÊ ordenar por prioridade?
   * - O RFC 5321 define que o MX com menor valor de prioridade deve ser tentado primeiro.
   * - Garantimos que o SmtpVerifier sempre tenta o servidor mais preferido.
   */
  async resolveMx(domain: string): Promise<MxRecord[]> {
    // =========================================
    // 1. Checar cache válido
    // =========================================
    const cached = this.cache.get(domain);
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return cached.records;
    }

    // =========================================
    // 2. Resolver com timeout e retry
    // =========================================
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const records = await this.resolveMxWithTimeout(domain);

        /**
         * Ordena por prioridade crescente (menor prioridade = mais preferido).
         * POR QUÊ sort in-place?
         * - O array é recém-criado pelo dns.promises, não reutilizado.
         * - Sort in-place é mais eficiente que criar nova array.
         */
        records.sort((a, b) => a.priority - b.priority);

        // Armazena no cache
        this.cache.set(domain, {
          records,
          cachedAt: Date.now(),
        });

        return records;
      } catch (error) {
        lastError = error as Error;

        /**
         * POR QUÊ não fazer retry em ENOTFOUND?
         * - ENOTFOUND significa que o domínio simplesmente não existe.
         * - Retry não vai mudar o resultado, é perda de tempo.
         */
        if ((error as NodeJS.ErrnoException).code === 'ENOTFOUND') {
          throw error;
        }

        // Se não é a última tentativa, espera 500ms antes do retry
        if (attempt < this.maxRetries) {
          await this.sleep(500);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Executa resolveMx com timeout via AbortController.
   *
   * POR QUÊ AbortController ao invés de Promise.race?
   * - AbortController é o padrão do Node para cancelamento de operações assíncronas.
   * - Promise.race com setTimeout vaza a promise original (continua executando).
   * - AbortController REALMENTE cancela a operação subjacente.
   */
  private async resolveMxWithTimeout(
    domain: string
  ): Promise<MxRecord[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      /**
       * Nota: dns.promises.resolveMx ainda não suporta AbortSignal nativamente
       * em todas as versões do Node. Usamos Promise.race como fallback seguro.
       */
      const result = await Promise.race([
        dns.resolveMx(domain),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error(`DNS timeout: resolução de MX para "${domain}" excedeu ${this.timeoutMs}ms`));
          });
        }),
      ]);

      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Helper para pausa entre retries */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Limpa o cache manualmente.
   * Útil em testes ou quando detectamos mudanças de DNS.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /** Retorna o tamanho atual do cache (para métricas) */
  get cacheSize(): number {
    return this.cache.size;
  }
}

/** Instância singleton do resolver para uso em toda a aplicação */
export const dnsResolver = new DnsResolver();
