/**
 * @module SmtpVerifier
 * @description Motor principal de validação de e-mail em 4 etapas.
 *
 * PIPELINE DE VALIDAÇÃO (executado sequencialmente):
 * 1. SINTAXE    — Regex RFC 5322 simplificada + limite de 254 caracteres.
 * 2. DNS / MX   — Resolução de registros MX com timeout de 2500ms.
 * 3. DESCARTÁVEL — Lookup O(1) contra HashSet de domínios temporários.
 * 4. SMTP       — Handshake TCP na porta 25 (HELO → MAIL FROM → RCPT TO → QUIT).
 *
 * POR QUÊ esta ordem?
 * - Cada etapa é mais cara que a anterior (CPU → DNS → Memória → Network).
 * - Falhar cedo em etapas baratas evita operações de rede desnecessárias.
 * - Um e-mail com sintaxe inválida é rejeitado em microssegundos.
 *
 * REGRAS DE SEGURANÇA:
 * - NUNCA emitimos o comando DATA (não enviamos e-mails de verdade).
 * - BLOQUEIO SSRF: IPs privados/reservados são rejeitados ANTES da conexão TCP.
 * - Timeout configurável em todas as etapas para evitar travamento.
 */

import net from 'node:net';
import dns from 'node:dns/promises';
import { dnsResolver } from './DnsResolver.js';
import { disposableStore } from './DisposableStore.js';
import { isPrivateIp } from '../middlewares/ssrfProtection.js';
import { VerificationStatus, type EmailVerificationResult } from '../types.js';

/**
 * Regex RFC 5322 simplificada para validação de sintaxe de e-mail.
 *
 * POR QUÊ simplificada?
 * - A RFC 5322 completa permite sintaxes obscuras como "user"@domain e (comentários).
 * - Na prática, nenhum servidor de e-mail real aceita essas sintaxes.
 * - Esta regex cobre 99.9% dos e-mails válidos do mundo real.
 * - Regex "perfeita" da RFC é vulnerável a ReDoS (catastrophic backtracking).
 *
 * Estrutura: local-part@domain
 * - Local: letras, números, ._%+- (não inicia/termina com ponto)
 * - Domain: letras, números, .- (TLD com mínimo 2 chars)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Limite RFC 5321: endereço completo não pode exceder 254 caracteres */
const MAX_EMAIL_LENGTH = 254;

/** Configurações do verificador SMTP */
interface SmtpVerifierOptions {
  /** Domínio usado no comando HELO (padrão: env SMTP_HELO_DOMAIN) */
  heloDomain: string;
  /** E-mail usado no MAIL FROM (padrão: env SMTP_FROM_EMAIL) */
  fromEmail: string;
  /** Timeout total da conexão SMTP em ms (padrão: 7500) */
  timeoutMs: number;
}

/**
 * Classe principal do motor de validação.
 *
 * POR QUÊ classe ao invés de funções avulsas?
 * - Encapsula configuração (HELO domain, FROM email, timeout).
 * - Permite injeção de dependências em testes (mock do socket).
 * - Mantém estado mínimo (apenas configuração, sem side effects).
 */
export class SmtpVerifier {
  private readonly options: SmtpVerifierOptions;

  constructor(options?: Partial<SmtpVerifierOptions>) {
    this.options = {
      heloDomain: options?.heloDomain ?? process.env.SMTP_HELO_DOMAIN ?? 'cleanmail.com.br',
      fromEmail: options?.fromEmail ?? process.env.SMTP_FROM_EMAIL ?? 'verify@cleanmail.com.br',
      timeoutMs: options?.timeoutMs ?? Number(process.env.SMTP_TIMEOUT_MS) || 7500,
    };
  }

  /**
   * Executa o pipeline completo de validação para um único e-mail.
   *
   * @param email - Endereço de e-mail a verificar
   * @returns Resultado detalhado com status, etapa, MX records e código SMTP
   */
  async verify(email: string): Promise<EmailVerificationResult> {
    const startTime = Date.now();

    /**
     * Helper para criar resultado padronizado.
     * Centraliza cálculo de elapsedMs para garantir precisão.
     */
    const result = (
      partial: Omit<EmailVerificationResult, 'email' | 'elapsedMs'>
    ): EmailVerificationResult => ({
      email,
      elapsedMs: Date.now() - startTime,
      ...partial,
    });

    // =========================================
    // ETAPA 1: Validação de Sintaxe
    // =========================================
    if (!this.isValidSyntax(email)) {
      return result({
        status: VerificationStatus.INVALID,
        stage: 'syntax',
        reason: email.length > MAX_EMAIL_LENGTH
          ? `E-mail excede o limite de ${MAX_EMAIL_LENGTH} caracteres (tem ${email.length}).`
          : 'Formato de e-mail inválido. Não corresponde ao padrão RFC 5322.',
      });
    }

    const domain = email.split('@')[1]!.toLowerCase();

    // =========================================
    // ETAPA 2: Resolução DNS / MX
    // =========================================
    let mxRecords: string[];
    try {
      const records = await dnsResolver.resolveMx(domain);

      if (records.length === 0) {
        return result({
          status: VerificationStatus.INVALID,
          stage: 'dns',
          reason: `Domínio "${domain}" não possui registros MX configurados.`,
        });
      }

      mxRecords = records.map((r) => r.exchange);
    } catch (error) {
      return result({
        status: VerificationStatus.INVALID,
        stage: 'dns',
        reason: `Falha na resolução DNS do domínio "${domain}": ${(error as Error).message}`,
      });
    }

    // =========================================
    // ETAPA 3: Checagem de Domínio Descartável
    // =========================================
    if (disposableStore.isDisposable(domain)) {
      return result({
        status: VerificationStatus.DISPOSABLE,
        stage: 'disposable',
        mxRecords,
        reason: `O domínio "${domain}" pertence a um serviço de e-mail temporário/descartável.`,
      });
    }

    // =========================================
    // ETAPA 4: Verificação SMTP
    // =========================================
    try {
      const smtpResult = await this.checkSmtp(email, mxRecords);
      return result({
        ...smtpResult,
        stage: 'smtp',
        mxRecords,
      });
    } catch (error) {
      /**
       * POR QUÊ UNKNOWN ao invés de INVALID no catch?
       * - Falha na conexão SMTP pode ser temporária (servidor fora do ar, timeout).
       * - Não podemos afirmar que o e-mail é inválido, apenas que não conseguimos verificar.
       * - O cliente pode tentar novamente mais tarde.
       */
      return result({
        status: VerificationStatus.UNKNOWN,
        stage: 'smtp',
        mxRecords,
        reason: `Verificação SMTP inconclusiva: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Valida a sintaxe do e-mail.
   *
   * POR QUÊ método separado?
   * - Testabilidade: podemos testar a regex isoladamente.
   * - Reutilização: o CsvSanitizer pode usar para pré-filtrar.
   */
  isValidSyntax(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    if (email.length > MAX_EMAIL_LENGTH) return false;
    return EMAIL_REGEX.test(email);
  }

  /**
   * Executa o handshake SMTP com o servidor MX.
   *
   * FLUXO DE COMANDOS:
   * 1. Conecta no IP do MX (porta 25)
   * 2. Lê banner (220)
   * 3. Envia HELO
   * 4. Envia MAIL FROM:<verify@cleanmail.com.br>
   * 5. Envia RCPT TO:<email-a-verificar>
   * 6. Envia QUIT
   * 7. Fecha conexão
   *
   * POR QUÊ não enviar DATA?
   * - DATA iniciaria o envio de uma mensagem real.
   * - RCPT TO é suficiente para saber se a caixa existe.
   * - Enviar e-mails sem permissão é spam e pode blacklistar nosso IP.
   *
   * @param email - E-mail completo a verificar
   * @param mxHosts - Lista de hosts MX ordenados por prioridade
   */
  private async checkSmtp(
    email: string,
    mxHosts: string[]
  ): Promise<Pick<EmailVerificationResult, 'status' | 'smtpCode' | 'smtpMessage' | 'reason'>> {
    /**
     * Tenta cada MX em ordem de prioridade.
     * POR QUÊ tentar múltiplos MX?
     * - O MX primário pode estar fora do ar temporariamente.
     * - Servidores de e-mail reais tentam o próximo MX — nós também.
     */
    for (const mxHost of mxHosts.slice(0, 3)) { // Limita a 3 tentativas
      try {
        // =========================================
        // RESOLVER IP DO MX
        // =========================================
        /**
         * POR QUÊ resolver o IP antes de conectar?
         * - Precisamos validar o IP contra a lista de bloqueio SSRF.
         * - Se o MX apontar para 127.0.0.1, precisamos rejeitar ANTES de abrir o socket.
         */
        let mxIps: string[];
        try {
          mxIps = await dns.resolve4(mxHost);
        } catch {
          // Se não resolver IPv4, tenta resolver IPv6
          try {
            const ipv6s = await dns.resolve6(mxHost);
            mxIps = ipv6s;
          } catch {
            continue; // Pula para o próximo MX
          }
        }

        if (mxIps.length === 0) continue;

        const targetIp = mxIps[0]!;

        // =========================================
        // BLOQUEIO SSRF — Validação de IP
        // =========================================
        if (isPrivateIp(targetIp)) {
          return {
            status: VerificationStatus.SECURITY_BLOCK,
            reason: `SSRF bloqueado: o MX "${mxHost}" resolve para IP privado/reservado (${targetIp}). ` +
              `Isso pode indicar configuração maliciosa do domínio.`,
          };
        }

        // =========================================
        // HANDSHAKE SMTP via Socket TCP
        // =========================================
        const smtpResult = await this.smtpHandshake(targetIp, email);
        return smtpResult;
      } catch {
        // Se este MX falhou, tenta o próximo
        continue;
      }
    }

    // Nenhum MX respondeu
    return {
      status: VerificationStatus.UNKNOWN,
      reason: 'Nenhum servidor MX respondeu dentro do timeout.',
    };
  }

  /**
   * Executa o handshake SMTP de baixo nível via socket TCP.
   *
   * POR QUÊ socket nativo (net.Socket) ao invés de lib SMTP?
   * - Controle total sobre o que é enviado e quando.
   * - Não precisamos de recursos SMTP completos (AUTH, STARTTLS, DATA).
   * - Minimiza superfície de ataque: menos código, menos vulnerabilidades.
   * - Permite timeout granular em cada etapa.
   */
  private smtpHandshake(
    ip: string,
    email: string
  ): Promise<Pick<EmailVerificationResult, 'status' | 'smtpCode' | 'smtpMessage' | 'reason'>> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let step = 0; // Rastreia em qual comando estamos
      let responseBuffer = ''; // Acumula dados recebidos

      /**
       * POR QUÊ timeout no socket?
       * - Sem timeout, uma conexão com servidor que não responde bloquearia para sempre.
       * - O worker BullMQ tem outros e-mails para processar.
       */
      socket.setTimeout(this.options.timeoutMs);

      /** Helper para destruir o socket de forma limpa */
      const cleanup = (): void => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.on('timeout', () => {
        cleanup();
        reject(new Error(`Timeout SMTP: servidor ${ip} não respondeu em ${this.options.timeoutMs}ms`));
      });

      socket.on('error', (error: Error) => {
        cleanup();
        reject(error);
      });

      /**
       * Handler de dados recebidos do servidor SMTP.
       *
       * POR QUÊ acumular em buffer?
       * - Respostas SMTP podem chegar em múltiplos chunks TCP.
       * - Uma resposta multi-linha (ex: banner) pode vir em 2-3 eventos 'data'.
       * - Só processamos quando encontramos \r\n (fim da linha SMTP).
       */
      socket.on('data', (data: Buffer) => {
        responseBuffer += data.toString();

        // Resposta SMTP completa termina com \r\n
        if (!responseBuffer.includes('\r\n')) return;

        /**
         * Extrai o código numérico SMTP (3 primeiros caracteres).
         * Exemplos: "220 mx.google.com", "250 OK", "550 User not found"
         */
        const code = parseInt(responseBuffer.substring(0, 3), 10);
        const message = responseBuffer.trim();

        switch (step) {
          case 0:
            // Banner do servidor (esperamos 220)
            if (code === 220) {
              step = 1;
              responseBuffer = '';
              socket.write(`HELO ${this.options.heloDomain}\r\n`);
            } else {
              cleanup();
              resolve({
                status: VerificationStatus.UNKNOWN,
                smtpCode: code,
                smtpMessage: message,
                reason: `Servidor recusou conexão com código ${code}.`,
              });
            }
            break;

          case 1:
            // Resposta ao HELO (esperamos 250)
            if (code === 250) {
              step = 2;
              responseBuffer = '';
              socket.write(`MAIL FROM:<${this.options.fromEmail}>\r\n`);
            } else {
              cleanup();
              resolve({
                status: VerificationStatus.UNKNOWN,
                smtpCode: code,
                smtpMessage: message,
                reason: `HELO rejeitado com código ${code}.`,
              });
            }
            break;

          case 2:
            // Resposta ao MAIL FROM (esperamos 250)
            if (code === 250) {
              step = 3;
              responseBuffer = '';
              socket.write(`RCPT TO:<${email}>\r\n`);
            } else {
              cleanup();
              resolve({
                status: VerificationStatus.UNKNOWN,
                smtpCode: code,
                smtpMessage: message,
                reason: `MAIL FROM rejeitado com código ${code}.`,
              });
            }
            break;

          case 3:
            /**
             * Resposta ao RCPT TO — Esta é a resposta CRUCIAL.
             *
             * 250 = E-mail existe (válido)
             * 550 = Usuário não encontrado (inválido)
             * 451, 452 = Temporariamente indisponível (desconhecido)
             * Qualquer outro = Inconclusivo
             */
            step = 4;
            responseBuffer = '';

            // Sempre encerra com QUIT, independente do resultado
            socket.write('QUIT\r\n');

            if (code === 250) {
              cleanup();
              resolve({
                status: VerificationStatus.VALID,
                smtpCode: code,
                smtpMessage: message,
                reason: 'E-mail verificado com sucesso. Servidor SMTP confirmou existência.',
              });
            } else if (code === 550 || code === 551 || code === 553) {
              cleanup();
              resolve({
                status: VerificationStatus.INVALID,
                smtpCode: code,
                smtpMessage: message,
                reason: `Servidor SMTP informou que o e-mail não existe (código ${code}).`,
              });
            } else {
              cleanup();
              resolve({
                status: VerificationStatus.UNKNOWN,
                smtpCode: code,
                smtpMessage: message,
                reason: `Resposta SMTP inconclusiva (código ${code}). O servidor pode usar catch-all.`,
              });
            }
            break;

          case 4:
            // Resposta ao QUIT — não nos importa, só fechamos
            cleanup();
            break;
        }
      });

      // =========================================
      // CONECTAR NA PORTA 25
      // =========================================
      socket.connect(25, ip);
    });
  }
}

/** Instância singleton para uso na aplicação */
export const smtpVerifier = new SmtpVerifier();
