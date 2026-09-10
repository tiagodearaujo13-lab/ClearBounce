/**
 * @module types/index
 * @description Tipagens TypeScript compartilhadas no frontend.
 */

/** Status de verificação de e-mail (espelho do backend) */
export type VerificationStatus =
  | 'valid'
  | 'invalid'
  | 'disposable'
  | 'unknown'
  | 'security_block';

/** Etapa do pipeline de verificação */
export type VerificationStage = 'syntax' | 'dns' | 'disposable' | 'smtp';

/** Resultado de verificação retornado pela API */
export interface EmailVerificationResult {
  email: string;
  status: VerificationStatus;
  stage: VerificationStage;
  mxRecords?: string[];
  smtpCode?: number;
  smtpMessage?: string;
  elapsedMs: number;
  reason: string;
}

/** Resposta da API de verificação avulsa */
export interface VerifySingleResponse {
  result: EmailVerificationResult;
  creditsRemaining: number;
}

/** Status de um batch job */
export type BatchStatus = 'queued' | 'processing' | 'completed' | 'failed';

/** Resposta da API de status do batch */
export interface BatchStatusResponse {
  id: string;
  status: BatchStatus;
  totalEmails: number;
  processedEmails: number;
  progress: number;
  createdAt: string;
  completedAt: string | null;
}

/** Dados do usuário autenticado */
export interface User {
  id: string;
  email: string;
}

/** Resposta de login */
export interface LoginResponse {
  token: string;
  expiresIn: string;
  user: User;
}

/** API Key (sem o valor da chave — só retornada na criação) */
export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
}
