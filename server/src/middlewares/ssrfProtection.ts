/**
 * @module ssrfProtection
 * @description Proteção contra Server-Side Request Forgery (SSRF).
 *
 * POR QUÊ este módulo existe?
 * - O SmtpVerifier conecta em IPs resolvidos via DNS (registros MX).
 * - Um atacante pode registrar um domínio cujo MX aponta para 127.0.0.1 ou 169.254.169.254.
 * - Sem esta proteção, nosso servidor faria requisições para a rede interna ou AWS metadata.
 * - Este módulo valida o IP ANTES de abrir qualquer socket, bloqueando ranges perigosos.
 *
 * Ranges bloqueados (IANA Reserved):
 * - 127.0.0.0/8     → Loopback (localhost)
 * - 10.0.0.0/8      → Rede privada Classe A
 * - 172.16.0.0/12   → Rede privada Classe B
 * - 192.168.0.0/16  → Rede privada Classe C
 * - 169.254.0.0/16  → Link-local (inclui AWS metadata 169.254.169.254)
 * - 0.0.0.0/8       → Endereço "this network"
 * - ::1             → Loopback IPv6
 * - fe80::/10       → Link-local IPv6
 * - fc00::/7        → Unique local IPv6 (equivalente a redes privadas)
 */

import { createError } from '../utils/errors.js';

/**
 * Converte um endereço IPv4 para um número inteiro de 32 bits.
 * Isso permite comparação eficiente de ranges CIDR com operações bitwise.
 *
 * Exemplo: "192.168.1.1" → 3232235777
 *
 * POR QUÊ não usar regex para cada range?
 * - Regex é lento e propenso a erros em edge cases (ex: "192.168.01.1").
 * - Conversão numérica + operação bitwise é O(1) e matematicamente correta.
 */
function ipv4ToInt(ip: string): number {
  const octets = ip.split('.');
  if (octets.length !== 4) return -1;

  let result = 0;
  for (const octet of octets) {
    const num = parseInt(octet, 10);
    if (isNaN(num) || num < 0 || num > 255) return -1;
    result = (result << 8) | num;
  }

  // Converte para unsigned 32-bit (JavaScript trata bitwise como signed)
  return result >>> 0;
}

/**
 * Verifica se um IPv4 está dentro de um range CIDR.
 *
 * POR QUÊ usar máscara de bits?
 * - CIDR /8 significa que os 8 bits mais significativos definem a rede.
 * - A máscara isola esses bits para comparação direta.
 * - Exemplo: 10.0.0.0/8 → máscara 0xFF000000, qualquer IP 10.x.x.x bate.
 */
function isInCidr(ip: number, network: number, prefix: number): boolean {
  // Cria máscara: ex. prefix=8 → 0xFF000000
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ip & mask) === (network & mask);
}

/**
 * Ranges IPv4 privados/reservados que NUNCA devem ser acessados pelo SmtpVerifier.
 *
 * Formato: [endereço de rede como inteiro, prefixo CIDR]
 */
const BLOCKED_IPV4_RANGES: Array<[number, number]> = [
  [ipv4ToInt('0.0.0.0'), 8],       // "This network" — RFC 1122
  [ipv4ToInt('10.0.0.0'), 8],      // Privado Classe A — RFC 1918
  [ipv4ToInt('127.0.0.0'), 8],     // Loopback — RFC 1122
  [ipv4ToInt('169.254.0.0'), 16],  // Link-local + AWS metadata — RFC 3927
  [ipv4ToInt('172.16.0.0'), 12],   // Privado Classe B — RFC 1918
  [ipv4ToInt('192.168.0.0'), 16],  // Privado Classe C — RFC 1918
];

/**
 * Prefixos IPv6 bloqueados.
 *
 * POR QUÊ comparação por prefixo de string?
 * - IPv6 tem 128 bits, operações bitwise em JS só suportam 32 bits.
 * - Para os ranges que nos importam, comparação de prefixo normalizado é suficiente.
 */
const BLOCKED_IPV6_PREFIXES: string[] = [
  '::1',      // Loopback IPv6
  'fe80:',    // Link-local IPv6 (fe80::/10)
  'fc00:',    // Unique local (fc00::/7) — parte 1
  'fd00:',    // Unique local (fc00::/7) — parte 2
];

/**
 * Verifica se um endereço IP é privado, reservado ou de loopback.
 *
 * @param ip - Endereço IP (v4 ou v6) a ser validado
 * @returns true se o IP é bloqueado (privado/reservado), false se é público
 *
 * @example
 * isPrivateIp('127.0.0.1')       // true — loopback
 * isPrivateIp('10.0.0.5')        // true — rede privada
 * isPrivateIp('169.254.169.254') // true — AWS metadata
 * isPrivateIp('8.8.8.8')         // false — Google DNS (público)
 */
export function isPrivateIp(ip: string): boolean {
  // Normaliza removendo espaços e convertendo para minúsculo
  const normalized = ip.trim().toLowerCase();

  // =========================================
  // Checagem IPv6
  // =========================================
  if (normalized.includes(':')) {
    return BLOCKED_IPV6_PREFIXES.some(
      (prefix) => normalized === prefix || normalized.startsWith(prefix)
    );
  }

  // =========================================
  // Checagem IPv4
  // =========================================
  const ipInt = ipv4ToInt(normalized);
  if (ipInt === -1) {
    /**
     * POR QUÊ bloquear IPs malformados?
     * - Se não conseguimos parsear, não podemos garantir que é seguro.
     * - Princípio da segurança: negar por padrão (deny by default).
     */
    return true;
  }

  return BLOCKED_IPV4_RANGES.some(([network, prefix]) =>
    isInCidr(ipInt, network, prefix)
  );
}

/**
 * Valida um IP e lança erro se for privado/reservado.
 * Usada como guard antes de abrir qualquer conexão TCP.
 *
 * @throws Erro com código SSRF_BLOCKED se o IP for privado
 */
export function assertPublicIp(ip: string): void {
  if (isPrivateIp(ip)) {
    throw createError(
      'SSRF_BLOCKED',
      `Conexão bloqueada: o IP ${ip} pertence a uma rede privada/reservada. ` +
      `Isso pode indicar uma tentativa de SSRF.`,
      403
    );
  }
}
