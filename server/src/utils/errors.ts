/**
 * @module errors
 * @description Utilitário centralizado para criação de erros tipados.
 *
 * POR QUÊ erros customizados?
 * - Permite incluir código de erro legível (ex: SSRF_BLOCKED, INVALID_CREDENTIALS)
 * - Facilita tratamento no error handler global do Fastify
 * - Nunca expõe stack trace ao cliente (segurança)
 */

/**
 * Erro tipado da aplicação com código de erro e status HTTP.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * Factory function para criar erros tipados.
 * Preferimos factory function ao invés de `new AppError()` para consistência.
 */
export function createError(
  code: string,
  message: string,
  statusCode: number = 400
): AppError {
  return new AppError(code, message, statusCode);
}
