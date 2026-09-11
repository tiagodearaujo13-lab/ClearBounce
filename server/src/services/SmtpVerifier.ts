/**
 * @module SmtpVerifier
 * @description Pipeline de sintaxe, MX, descarte e handshake SMTP seguro.
 */

import net from 'node:net';
import dns from 'node:dns/promises';
import { dnsResolver } from './DnsResolver.js';
import { disposableStore } from './DisposableStore.js';
import { isPrivateIp } from '../middlewares/ssrfProtection.js';
import { VerificationStatus, type EmailVerificationResult } from '../types.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

interface SmtpVerifierOptions {
  heloDomain: string;
  fromEmail: string;
  timeoutMs: number;
}

type SmtpResult = Pick<EmailVerificationResult, 'status' | 'smtpCode' | 'smtpMessage' | 'reason'>;

function isNetworkBlockedError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENETUNREACH' || code === 'EHOSTUNREACH';
}

export class SmtpVerifier {
  private readonly options: SmtpVerifierOptions;

  constructor(options?: Partial<SmtpVerifierOptions>) {
    this.options = {
      heloDomain: options?.heloDomain ?? process.env.SMTP_HELO_DOMAIN ?? 'cleanmail.com.br',
      fromEmail: options?.fromEmail ?? process.env.SMTP_FROM_EMAIL ?? 'verify@cleanmail.com.br',
      timeoutMs: options?.timeoutMs ?? (Number(process.env.SMTP_TIMEOUT_MS) || 7500),
    };
  }

  async verify(email: string): Promise<EmailVerificationResult> {
    const startTime = Date.now();
    const result = (partial: Omit<EmailVerificationResult, 'email' | 'elapsedMs'>): EmailVerificationResult => ({
      email,
      elapsedMs: Date.now() - startTime,
      ...partial,
    });

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
      mxRecords = records.map((record) => record.exchange);
    } catch (error) {
      return result({
        status: VerificationStatus.INVALID,
        stage: 'dns',
        reason: `Falha na resolução DNS do domínio "${domain}": ${(error as Error).message}`,
      });
    }

    if (disposableStore.isDisposable(domain)) {
      return result({
        status: VerificationStatus.DISPOSABLE,
        stage: 'disposable',
        mxRecords,
        reason: `O domínio "${domain}" pertence a um serviço de e-mail temporário/descartável.`,
      });
    }

    try {
      return result({
        ...(await this.checkSmtp(email, mxRecords)),
        stage: 'smtp',
        mxRecords,
      });
    } catch (error) {
      return result({
        status: isNetworkBlockedError(error)
          ? VerificationStatus.UNVERIFIABLE_NETWORK_BLOCKED
          : VerificationStatus.UNKNOWN,
        stage: 'smtp',
        mxRecords,
        reason: isNetworkBlockedError(error)
          ? 'Verificação SMTP indisponível: o ambiente bloqueou conexões TCP na porta 25. Sintaxe, DNS/MX e domínio descartável foram validados.'
          : `Verificação SMTP inconclusiva: ${(error as Error).message}`,
      });
    }
  }

  isValidSyntax(email: string): boolean {
    if (!email || typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH) return false;
    return EMAIL_REGEX.test(email);
  }

  private async checkSmtp(email: string, mxHosts: string[]): Promise<SmtpResult> {
    let networkBlocked = false;

    for (const mxHost of mxHosts.slice(0, 3)) {
      let mxIps: string[];
      try {
        mxIps = await dns.resolve4(mxHost);
      } catch {
        try {
          mxIps = await dns.resolve6(mxHost);
        } catch {
          continue;
        }
      }

      const targetIp = mxIps[0];
      if (!targetIp) continue;
      if (isPrivateIp(targetIp)) {
        return {
            status: VerificationStatus.SECURITY_BLOCK,
          reason: `SSRF bloqueado: o MX "${mxHost}" resolve para IP privado/reservado (${targetIp}).`,
        };
      }

      try {
        return await this.smtpHandshake(targetIp, email);
      } catch (error) {
        if (isNetworkBlockedError(error)) networkBlocked = true;
      }
    }

    if (networkBlocked) {
      return {
        status: VerificationStatus.UNVERIFIABLE_NETWORK_BLOCKED,
        reason: 'Verificação SMTP indisponível: o ambiente bloqueou conexões TCP na porta 25. Sintaxe, DNS/MX e domínio descartável foram validados.',
      };
    }

    return {
      status: VerificationStatus.UNKNOWN,
      reason: 'Verificação SMTP inconclusiva: nenhum servidor MX respondeu dentro do timeout.',
    };
  }

  private smtpHandshake(ip: string, email: string): Promise<SmtpResult> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let step = 0;
      let responseBuffer = '';
      let settled = false;

      const cleanup = (): void => {
        socket.removeAllListeners();
        socket.destroy();
      };
      const finish = (callback: () => void): void => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };

      socket.setTimeout(this.options.timeoutMs);
      socket.on('timeout', () => {
        const error = new Error(`Timeout SMTP: servidor ${ip} não respondeu em ${this.options.timeoutMs}ms`) as NodeJS.ErrnoException;
        error.code = 'ETIMEDOUT';
        finish(() => reject(error));
      });
      socket.on('error', (error: NodeJS.ErrnoException) => {
        finish(() => reject(error));
      });

      socket.on('data', (data: Buffer) => {
        responseBuffer += data.toString();
        if (!responseBuffer.includes('\r\n')) return;

        const code = Number.parseInt(responseBuffer.substring(0, 3), 10);
        const message = responseBuffer.trim();
        responseBuffer = '';

        switch (step) {
          case 0:
            if (code !== 220) {
              finish(() => resolve({ status: VerificationStatus.UNKNOWN, smtpCode: code, smtpMessage: message, reason: `Servidor recusou conexão com código ${code}.` }));
              return;
            }
            step = 1;
            socket.write(`HELO ${this.options.heloDomain}\r\n`);
            return;
          case 1:
            if (code !== 250) {
              finish(() => resolve({ status: VerificationStatus.UNKNOWN, smtpCode: code, smtpMessage: message, reason: `HELO rejeitado com código ${code}.` }));
              return;
            }
            step = 2;
            socket.write(`MAIL FROM:<${this.options.fromEmail}>\r\n`);
            return;
          case 2:
            if (code !== 250) {
              finish(() => resolve({ status: VerificationStatus.UNKNOWN, smtpCode: code, smtpMessage: message, reason: `MAIL FROM rejeitado com código ${code}.` }));
              return;
            }
            step = 3;
            socket.write(`RCPT TO:<${email}>\r\n`);
            return;
          case 3:
            socket.write('QUIT\r\n');
            if (code === 250) {
              finish(() => resolve({ status: VerificationStatus.VALID, smtpCode: code, smtpMessage: message, reason: 'E-mail verificado com sucesso. Servidor SMTP confirmou existência.' }));
            } else if (code === 550 || code === 551 || code === 553) {
              finish(() => resolve({ status: VerificationStatus.INVALID, smtpCode: code, smtpMessage: message, reason: `Servidor SMTP informou que o e-mail não existe (código ${code}).` }));
            } else {
              finish(() => resolve({ status: VerificationStatus.UNKNOWN, smtpCode: code, smtpMessage: message, reason: `Resposta SMTP inconclusiva (código ${code}). O servidor pode usar catch-all.` }));
            }
            return;
          default:
            finish(() => resolve({ status: VerificationStatus.UNKNOWN, reason: 'Handshake SMTP encerrado.' }));
        }
      });

      socket.connect(25, ip);
    });
  }
}

export const smtpVerifier = new SmtpVerifier();
