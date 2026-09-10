/**
 * @module ssrfProtection.test
 * @description Testes de segurança para proteção SSRF.
 *
 * POR QUÊ testar SSRF extensivamente?
 * - SSRF é uma vulnerabilidade CRÍTICA (OWASP Top 10 A10:2021).
 * - Um bypass permitiria acesso à rede interna e AWS metadata.
 * - Cada range de IP precisa de cobertura — um esquecimento é uma brecha.
 */

import { describe, it, expect } from 'vitest';
import { isPrivateIp, assertPublicIp } from '../src/middlewares/ssrfProtection.js';

describe('Proteção SSRF — isPrivateIp', () => {
  // =========================================
  // IPs que DEVEM ser bloqueados
  // =========================================
  describe('IPs Privados/Reservados (DEVEM ser bloqueados)', () => {
    // Loopback (127.0.0.0/8)
    it('deve bloquear 127.0.0.1 (loopback)', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
    });

    it('deve bloquear 127.255.255.255 (fim do range loopback)', () => {
      expect(isPrivateIp('127.255.255.255')).toBe(true);
    });

    // Rede Privada Classe A (10.0.0.0/8)
    it('deve bloquear 10.0.0.1 (rede privada classe A)', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
    });

    it('deve bloquear 10.255.255.255 (fim do range classe A)', () => {
      expect(isPrivateIp('10.255.255.255')).toBe(true);
    });

    // Rede Privada Classe B (172.16.0.0/12)
    it('deve bloquear 172.16.0.1 (rede privada classe B)', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
    });

    it('deve bloquear 172.31.255.255 (fim do range classe B)', () => {
      expect(isPrivateIp('172.31.255.255')).toBe(true);
    });

    it('NÃO deve bloquear 172.32.0.1 (fora do range /12)', () => {
      expect(isPrivateIp('172.32.0.1')).toBe(false);
    });

    // Rede Privada Classe C (192.168.0.0/16)
    it('deve bloquear 192.168.0.1 (rede privada classe C)', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true);
    });

    it('deve bloquear 192.168.255.255 (fim do range classe C)', () => {
      expect(isPrivateIp('192.168.255.255')).toBe(true);
    });

    // AWS Metadata / Link-Local (169.254.0.0/16)
    it('deve bloquear 169.254.169.254 (AWS metadata endpoint)', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
    });

    it('deve bloquear 169.254.0.1 (link-local)', () => {
      expect(isPrivateIp('169.254.0.1')).toBe(true);
    });

    // This Network (0.0.0.0/8)
    it('deve bloquear 0.0.0.0 (this network)', () => {
      expect(isPrivateIp('0.0.0.0')).toBe(true);
    });

    // IPv6
    it('deve bloquear ::1 (loopback IPv6)', () => {
      expect(isPrivateIp('::1')).toBe(true);
    });

    it('deve bloquear fe80::1 (link-local IPv6)', () => {
      expect(isPrivateIp('fe80::1')).toBe(true);
    });

    it('deve bloquear fc00::1 (unique local IPv6)', () => {
      expect(isPrivateIp('fc00::1')).toBe(true);
    });

    it('deve bloquear fd00::1 (unique local IPv6)', () => {
      expect(isPrivateIp('fd00::1')).toBe(true);
    });
  });

  // =========================================
  // IPs que NÃO devem ser bloqueados (públicos)
  // =========================================
  describe('IPs Públicos (NÃO devem ser bloqueados)', () => {
    it('deve permitir 8.8.8.8 (Google DNS)', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
    });

    it('deve permitir 1.1.1.1 (Cloudflare DNS)', () => {
      expect(isPrivateIp('1.1.1.1')).toBe(false);
    });

    it('deve permitir 93.184.216.34 (example.com)', () => {
      expect(isPrivateIp('93.184.216.34')).toBe(false);
    });

    it('deve permitir 200.160.2.3 (registro.br)', () => {
      expect(isPrivateIp('200.160.2.3')).toBe(false);
    });

    it('deve permitir 172.15.255.255 (abaixo do range /12)', () => {
      expect(isPrivateIp('172.15.255.255')).toBe(false);
    });

    it('deve permitir 192.167.255.255 (abaixo do range /16)', () => {
      expect(isPrivateIp('192.167.255.255')).toBe(false);
    });
  });

  // =========================================
  // Edge Cases
  // =========================================
  describe('Edge Cases', () => {
    it('deve bloquear IPs malformados (deny by default)', () => {
      expect(isPrivateIp('not-an-ip')).toBe(true);
      expect(isPrivateIp('')).toBe(true);
      expect(isPrivateIp('999.999.999.999')).toBe(true);
    });

    it('deve tratar espaços e case insensitive', () => {
      expect(isPrivateIp(' 127.0.0.1 ')).toBe(true);
      expect(isPrivateIp('FE80::1')).toBe(true);
    });
  });
});

describe('Proteção SSRF — assertPublicIp', () => {
  it('deve lançar erro para IP privado', () => {
    expect(() => assertPublicIp('127.0.0.1')).toThrow('SSRF');
  });

  it('deve NÃO lançar erro para IP público', () => {
    expect(() => assertPublicIp('8.8.8.8')).not.toThrow();
  });
});
