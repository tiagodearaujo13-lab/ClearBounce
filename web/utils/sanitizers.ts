/**
 * @module utils/sanitizers
 * @description Sanitizadores para dados de entrada no frontend.
 *
 * POR QUÊ sanitizar no frontend?
 * - Defense in depth: mesmo que o backend sanitize, o frontend não deve confiar.
 * - Previne XSS em dados exibidos via innerHTML (se usado).
 * - Feedback imediato ao usuário sobre dados inválidos.
 */

/**
 * Remove caracteres potencialmente perigosos de um e-mail.
 * Não substitui a validação do backend — apenas limpeza básica.
 */
export function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    // Remove espaços internos (typo comum)
    .replace(/\s/g, '')
    // Limita a 254 chars (RFC 5321)
    .slice(0, 254);
}

/**
 * Escapa HTML para prevenir XSS quando inserindo texto no DOM.
 *
 * POR QUÊ?
 * - React escapa automaticamente em JSX, mas se usarmos dangerouslySetInnerHTML
 *   (ex: para renderizar e-mail com highlight), precisamos escapar.
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return str.replace(/[&<>"']/g, (char) => map[char] ?? char);
}

/**
 * Valida formato de e-mail no cliente (mesma regex do backend).
 */
export function isValidEmail(email: string): boolean {
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return EMAIL_REGEX.test(email) && email.length <= 254;
}
