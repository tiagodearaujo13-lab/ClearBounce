/**
 * @module DisposableStore
 * @description Armazém O(1) de domínios de e-mail descartáveis (temporários).
 *
 * POR QUÊ bloquear e-mails descartáveis?
 * - Serviços como Guerrilla Mail, TempMail geram endereços temporários que expiram em minutos.
 * - Usuários que usam esses endereços provavelmente estão evitando validação real.
 * - Para um SaaS B2B, esses e-mails poluem listas e geram bounces futuros.
 *
 * POR QUÊ Set ao invés de Array?
 * - Set.has() é O(1) — perfeito para checagem de existência.
 * - Array.includes() é O(n) — com 4500+ domínios, ficaria lento em escala.
 * - Um batch de 100.000 e-mails faria 100.000 lookups. O(1) vs O(n) importa aqui.
 *
 * POR QUÊ carregar no boot e não lazy?
 * - O arquivo tem ~4500 domínios (~50KB). Cabe tranquilo em memória.
 * - Carregar no boot evita I/O durante o processamento de requests.
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * POR QUÊ __dirname manual?
 * - Em ESM (type: "module"), __dirname não existe nativamente.
 * - Reconstruímos a partir de import.meta.url para manter compatibilidade.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DisposableStore {
  /** Set de domínios descartáveis para lookup O(1) */
  private domains: Set<string> = new Set();

  /**
   * Carrega a lista de domínios do arquivo disposable-domains.txt.
   *
   * POR QUÊ arquivo .txt ao invés de JSON ou banco?
   * - .txt é legível, editável e fácil de atualizar manualmente.
   * - Não precisa de parsing complexo (uma linha = um domínio).
   * - Pode ser versionado no Git para rastrear mudanças.
   */
  async load(): Promise<void> {
    const filePath = join(__dirname, '..', 'data', 'disposable-domains.txt');

    try {
      const content = await readFile(filePath, 'utf-8');

      this.domains = new Set(
        content
          .split('\n')
          .map((line) => line.trim().toLowerCase())
          // Filtra linhas vazias e comentários (começam com #)
          .filter((line) => line.length > 0 && !line.startsWith('#'))
      );
    } catch (error) {
      /**
       * POR QUÊ não lançar erro fatal?
       * - O servidor deve funcionar mesmo sem a lista de descartáveis.
       * - Logging de warning é suficiente — a validação SMTP ainda funciona.
       * - Em produção, um alerta de monitoramento capturaria esse warning.
       */
      console.warn(
        '⚠️  Arquivo disposable-domains.txt não encontrado. ' +
        'Validação de descartáveis desabilitada.',
        error
      );
    }
  }

  /**
   * Verifica se um domínio é descartável.
   *
   * @param domain - Domínio a verificar (ex: "guerrillamail.com")
   * @returns true se o domínio está na lista de descartáveis
   *
   * POR QUÊ toLowerCase?
   * - DNS é case-insensitive por RFC, mas nosso Set é case-sensitive.
   * - Normalizamos para minúsculo na carga E na consulta para garantir match.
   */
  isDisposable(domain: string): boolean {
    return this.domains.has(domain.toLowerCase().trim());
  }

  /** Quantidade de domínios carregados (para logs/métricas) */
  get size(): number {
    return this.domains.size;
  }
}

/** Instância singleton para uso em toda a aplicação */
export const disposableStore = new DisposableStore();
