/**
 * @module smtpVerifier.test
 * @description Testes unitários do motor de validação SMTP.
 *
 * POR QUÊ mockar net.Socket?
 * - Testes unitários NÃO devem fazer requests de rede reais.
 * - Mock do socket simula respostas SMTP controladas (250, 550, timeout).
 * - Garante testes determinísticos e rápidos (~1ms por teste ao invés de ~5s).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import net from 'node:net';
import { SmtpVerifier } from '../src/services/SmtpVerifier.js';
import { VerificationStatus } from '../src/types.js';

// =========================================
// Mock do DnsResolver
// =========================================
vi.mock('../src/services/DnsResolver.js', () => ({
  dnsResolver: {
    resolveMx: vi.fn().mockResolvedValue([
      { exchange: 'mx1.example.com', priority: 10 },
    ]),
    clearCache: vi.fn(),
  },
}));

// =========================================
// Mock do DisposableStore
// =========================================
vi.mock('../src/services/DisposableStore.js', () => ({
  disposableStore: {
    isDisposable: vi.fn().mockReturnValue(false),
    load: vi.fn(),
    size: 0,
  },
}));

// =========================================
// Mock do DNS nativo (para resolução de IP do MX)
// =========================================
vi.mock('node:dns/promises', () => ({
  default: {
    resolve4: vi.fn().mockResolvedValue(['93.184.216.34']), // IP público fictício
    resolve6: vi.fn().mockResolvedValue(['2606:2800:220:1:248:1893:25c8:1946']),
    resolveMx: vi.fn().mockResolvedValue([
      { exchange: 'mx1.example.com', priority: 10 },
    ]),
  },
}));

describe('SmtpVerifier', () => {
  let verifier: SmtpVerifier;

  beforeEach(async () => {
    verifier = new SmtpVerifier({
      heloDomain: 'test.cleanmail.com',
      fromEmail: 'verify@test.cleanmail.com',
      timeoutMs: 3000,
    });
    vi.clearAllMocks();
    const { disposableStore } = await import('../src/services/DisposableStore.js');
    vi.mocked(disposableStore.isDisposable).mockReturnValue(false);
  });

  // =========================================
  // ETAPA 1: Validação de Sintaxe
  // =========================================
  describe('Validação de Sintaxe', () => {
    it('deve rejeitar e-mail vazio', async () => {
      const result = await verifier.verify('');
      expect(result.status).toBe(VerificationStatus.INVALID);
      expect(result.stage).toBe('syntax');
    });

    it('deve rejeitar e-mail sem @', async () => {
      const result = await verifier.verify('invalido.com');
      expect(result.status).toBe(VerificationStatus.INVALID);
      expect(result.stage).toBe('syntax');
    });

    it('deve rejeitar e-mail sem domínio', async () => {
      const result = await verifier.verify('user@');
      expect(result.status).toBe(VerificationStatus.INVALID);
      expect(result.stage).toBe('syntax');
    });

    it('deve rejeitar e-mail com mais de 254 caracteres', async () => {
      const longEmail = 'a'.repeat(246) + '@test.com'; // 246 + 9 = 255 chars (> 254)
      const result = await verifier.verify(longEmail);
      expect(result.status).toBe(VerificationStatus.INVALID);
      expect(result.stage).toBe('syntax');
      expect(result.reason).toContain('254');
    });

    it('deve aceitar e-mail válido na etapa de sintaxe', () => {
      expect(verifier.isValidSyntax('user@example.com')).toBe(true);
      expect(verifier.isValidSyntax('user.name+tag@domain.co')).toBe(true);
      expect(verifier.isValidSyntax('user_name@sub.domain.com')).toBe(true);
    });

    it('deve rejeitar sintaxe inválida', () => {
      expect(verifier.isValidSyntax('user@')).toBe(false);
      expect(verifier.isValidSyntax('@domain.com')).toBe(false);
      expect(verifier.isValidSyntax('user@.com')).toBe(false);
      expect(verifier.isValidSyntax('user@domain')).toBe(false);
      expect(verifier.isValidSyntax('')).toBe(false);
    });
  });

  // =========================================
  // ETAPA 3: Domínios Descartáveis
  // =========================================
  describe('Domínios Descartáveis', () => {
    it('deve marcar domínio descartável como DISPOSABLE', async () => {
      const { disposableStore } = await import(
        '../src/services/DisposableStore.js'
      );
      vi.mocked(disposableStore.isDisposable).mockReturnValue(true);

      const result = await verifier.verify('user@guerrillamail.com');
      expect(result.status).toBe(VerificationStatus.DISPOSABLE);
      expect(result.stage).toBe('disposable');
    });
  });

  // =========================================
  // ETAPA 4: Verificação SMTP
  // =========================================
  describe('Verificação SMTP', () => {
    /**
     * Helper para criar um mock de net.Socket que simula um servidor SMTP.
     *
     * POR QUÊ mock manual ao invés de library?
     * - Controle total sobre a sequência de respostas SMTP.
     * - Permite simular cenários específicos (timeout, erro no RCPT TO).
     * - Libraries de mock SMTP (como smtp-server) são overhead para unit tests.
     */
    function createMockSocket(responses: string[]): void {
      let responseIndex = 0;

      vi.spyOn(net, 'Socket').mockImplementation((): any => {
        const handlers: Record<string, Function[]> = {};

        const mockSocket = {
          setTimeout: vi.fn(),
          connect: vi.fn((_port: number, _host: string) => {
            // Simula banner do servidor (220) após conexão
            setTimeout(() => {
              const dataHandlers = handlers['data'] ?? [];
              if (dataHandlers.length > 0 && responses[responseIndex]) {
                dataHandlers.forEach((h) =>
                  h(Buffer.from(responses[responseIndex]! + '\r\n'))
                );
                responseIndex++;
              }
            }, 10);
          }),
          write: vi.fn((_data: string) => {
            // Simula resposta do servidor após cada comando
            setTimeout(() => {
              const dataHandlers = handlers['data'] ?? [];
              if (dataHandlers.length > 0 && responses[responseIndex]) {
                dataHandlers.forEach((h) =>
                  h(Buffer.from(responses[responseIndex]! + '\r\n'))
                );
                responseIndex++;
              }
            }, 10);
          }),
          on: vi.fn((event: string, handler: Function) => {
            handlers[event] = handlers[event] ?? [];
            handlers[event]!.push(handler);
            return mockSocket;
          }),
          removeAllListeners: vi.fn(),
          destroy: vi.fn(),
        };

        return mockSocket;
      });
    }

    it('deve retornar VALID quando RCPT TO responde 250', async () => {
      createMockSocket([
        '220 mx.example.com ESMTP',  // Banner
        '250 OK',                      // HELO
        '250 OK',                      // MAIL FROM
        '250 OK',                      // RCPT TO → e-mail existe!
        '221 Bye',                     // QUIT
      ]);

      const result = await verifier.verify('valid@example.com');
      expect(result.status).toBe(VerificationStatus.VALID);
      expect(result.smtpCode).toBe(250);
    });

    it('deve retornar INVALID quando RCPT TO responde 550', async () => {
      createMockSocket([
        '220 mx.example.com ESMTP',
        '250 OK',
        '250 OK',
        '550 User not found',          // RCPT TO → e-mail NÃO existe!
        '221 Bye',
      ]);

      const result = await verifier.verify('nonexistent@example.com');
      expect(result.status).toBe(VerificationStatus.INVALID);
      expect(result.smtpCode).toBe(550);
    });

    it('deve retornar UNKNOWN quando RCPT TO responde 451 (temporário)', async () => {
      createMockSocket([
        '220 mx.example.com ESMTP',
        '250 OK',
        '250 OK',
        '451 Try again later',         // Erro temporário
        '221 Bye',
      ]);

      const result = await verifier.verify('temp@example.com');
      expect(result.status).toBe(VerificationStatus.UNKNOWN);
      expect(result.smtpCode).toBe(451);
    });

    it('deve retornar UNKNOWN quando conexão SMTP dá timeout', async () => {
      // Mock de socket que nunca responde (simula timeout)
      vi.spyOn(net, 'Socket').mockImplementation((): any => {
        const handlers: Record<string, Function[]> = {};
        const mockSocket = {
          setTimeout: vi.fn((_ms: number) => {
            // Dispara timeout imediatamente
            setTimeout(() => {
              (handlers['timeout'] ?? []).forEach((h) => h());
            }, 50);
          }),
          connect: vi.fn(),
          write: vi.fn(),
          on: vi.fn((event: string, handler: Function) => {
            handlers[event] = handlers[event] ?? [];
            handlers[event]!.push(handler);
            return mockSocket;
          }),
          removeAllListeners: vi.fn(),
          destroy: vi.fn(),
        };
        return mockSocket;
      });

      const result = await verifier.verify('timeout@example.com');
      expect(result.status).toBe(VerificationStatus.UNKNOWN);
      expect(result.reason).toContain('inconclusiva');
    });
  });

  // =========================================
  // Performance
  // =========================================
  describe('Performance', () => {
    it('deve incluir tempo de execução no resultado', async () => {
      const result = await verifier.verify('invalid-syntax');
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.elapsedMs).toBe('number');
    });
  });
});
