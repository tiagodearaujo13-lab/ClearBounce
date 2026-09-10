/**
 * @module types
 * @description Interfaces de domínio e DTOs tipados do CleanMail.
 *
 * POR QUÊ centralizar tipos aqui?
 * - Garante contrato único entre rotas, serviços e banco.
 * - Evita duplicação de interfaces espalhadas pelo projeto.
 * - Facilita refatoração: mudar o tipo aqui propaga erros em compile-time.
 */

// =========================================
// Enums de Domínio
// =========================================

/**
 * Status possíveis de uma verificação de e-mail.
 * Cada etapa do pipeline pode produzir um destes resultados.
 */
export enum VerificationStatus {
  /** E-mail válido — passou em todas as etapas */
  VALID = 'valid',
  /** E-mail inválido — falhou na sintaxe ou RCPT TO retornou 550 */
  INVALID = 'invalid',
  /** Domínio descartável — serviço temporário de e-mail */
  DISPOSABLE = 'disposable',
  /** Resultado inconclusivo — timeout ou catch-all detectado */
  UNKNOWN = 'unknown',
  /** Erro de segurança — IP privado detectado (SSRF bloqueado) */
  SECURITY_BLOCK = 'security_block',
}

/**
 * Status de um job de processamento em lote (batch).
 */
export enum BatchStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// =========================================
// Interfaces de Domínio
// =========================================

/** Resultado detalhado da verificação de um único e-mail */
export interface EmailVerificationResult {
  /** E-mail que foi verificado */
  email: string;
  /** Status final da verificação */
  status: VerificationStatus;
  /** Etapa onde a verificação parou (syntax, dns, disposable, smtp) */
  stage: 'syntax' | 'dns' | 'disposable' | 'smtp';
  /** Registros MX encontrados (se chegou na etapa DNS) */
  mxRecords?: string[];
  /** Código de resposta SMTP (se chegou na etapa SMTP) */
  smtpCode?: number;
  /** Mensagem de resposta SMTP */
  smtpMessage?: string;
  /** Tempo total de verificação em milissegundos */
  elapsedMs: number;
  /** Motivo legível do resultado */
  reason: string;
}

/** Usuário do sistema */
export interface User {
  id: string;
  email: string;
  /** Hash bcrypt da senha — NUNCA expor ao cliente */
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/** API Key do usuário (somente hash é persistido) */
export interface ApiKey {
  id: string;
  userId: string;
  /** SHA-256 da chave original — texto puro NUNCA é armazenado */
  keyHash: string;
  /** Nome descritivo dado pelo usuário */
  name: string;
  createdAt: Date;
  /** Se preenchido, a chave foi revogada nesta data */
  revokedAt: Date | null;
}

/** Saldo de créditos do usuário */
export interface CreditBalance {
  userId: string;
  /** Quantidade de verificações restantes */
  balance: number;
  updatedAt: Date;
}

/** Job de processamento batch de CSV */
export interface BatchJob {
  id: string;
  userId: string;
  status: BatchStatus;
  /** Total de e-mails no arquivo */
  totalEmails: number;
  /** Quantos já foram processados */
  processedEmails: number;
  /** Caminho do arquivo CSV original (no servidor) */
  filePath: string;
  /** Caminho do arquivo CSV com resultados */
  resultPath: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

// =========================================
// DTOs de Request (entrada da API)
// =========================================

/** Body de POST /v1/auth/register */
export interface RegisterRequestDto {
  email: string;
  password: string;
}

/** Body de POST /v1/auth/login */
export interface LoginRequestDto {
  email: string;
  password: string;
}

/** Body de POST /v1/auth/api-keys */
export interface CreateApiKeyRequestDto {
  name: string;
}

/** Body de POST /v1/verify/single */
export interface VerifySingleRequestDto {
  email: string;
}

/** Body de POST /v1/billing/checkout */
export interface CheckoutRequestDto {
  /** Quantidade de créditos a comprar */
  credits: number;
  /** ID do plano de preços no Stripe */
  priceId: string;
}

// =========================================
// DTOs de Response (saída da API)
// =========================================

/** Resposta de POST /v1/auth/login */
export interface LoginResponseDto {
  token: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
  };
}

/** Resposta de POST /v1/auth/api-keys (só retorna a chave uma vez!) */
export interface CreateApiKeyResponseDto {
  id: string;
  name: string;
  /** Texto puro da chave — exibido UMA ÚNICA VEZ ao usuário */
  key: string;
  createdAt: Date;
}

/** Resposta de GET /v1/verify/batch/:jobId */
export interface BatchStatusResponseDto {
  id: string;
  status: BatchStatus;
  totalEmails: number;
  processedEmails: number;
  /** Percentual de progresso (0-100) */
  progress: number;
  createdAt: Date;
  completedAt: Date | null;
}

// =========================================
// Tipos de Infraestrutura
// =========================================

/**
 * Payload decodificado do JWT.
 * POR QUÊ tipar explicitamente?
 * - Evita `any` no middleware de auth.
 * - Garante que rotas protegidas acessam campos tipados.
 */
export interface JwtPayload {
  sub: string; // user.id
  email: string;
  iat: number;
  exp: number;
}

/**
 * Extensão do request Fastify para injetar dados de autenticação.
 * Usado pelo authGuard para disponibilizar o usuário autenticado
 * em qualquer rota protegida via `request.user`.
 */
export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}
