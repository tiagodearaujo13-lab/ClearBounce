/**
 * @module database
 * @description Configuração do pool de conexão PostgreSQL via Kysely.
 *
 * POR QUÊ Kysely ao invés de Prisma?
 * - Kysely é um query builder type-safe (não ORM) — dá controle total sobre SQL.
 * - Não gera camada de abstração pesada (Prisma Client) que aumenta cold start.
 * - Perfeito para APIs de alta performance onde controle sobre queries é essencial.
 * - Migrations são TypeScript puro, versionadas no Git.
 *
 * POR QUÊ pool de conexão?
 * - Cada request precisa de uma conexão ao banco.
 * - Criar/destruir conexão a cada request é lento (~20ms de handshake TCP/SSL).
 * - Pool mantém conexões abertas e reutiliza — latência quase zero por query.
 */

import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

const { Pool } = pg;

// =========================================
// TIPOS DAS TABELAS (Schema do Banco)
// =========================================

/**
 * POR QUÊ definir interfaces aqui e não em types.ts?
 * - Estas interfaces representam o SCHEMA DO BANCO, não domínio da aplicação.
 * - A interface User em types.ts pode ter campos calculados que não existem no banco.
 * - Manter schemas de banco separados evita acoplamento entre camadas.
 */

export interface UsersTable {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKeysTable {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  created_at: Date;
  revoked_at: Date | null;
}

export interface CreditsTable {
  id: string;
  user_id: string;
  balance: number;
  updated_at: Date;
}

export interface BatchJobsTable {
  id: string;
  user_id: string;
  status: string;
  total_emails: number;
  processed_emails: number;
  file_path: string;
  result_path: string | null;
  created_at: Date;
  completed_at: Date | null;
}

/** Interface raiz que mapeia nomes de tabelas para seus tipos */
export interface Database {
  users: UsersTable;
  api_keys: ApiKeysTable;
  credits: CreditsTable;
  batch_jobs: BatchJobsTable;
}

// =========================================
// INSTÂNCIA DO KYSELY
// =========================================

/**
 * POR QUÊ validar DATABASE_URL aqui?
 * - Se a variável não estiver configurada, o pool tenta conectar em localhost
 *   com credenciais padrão — potencial brecha de segurança.
 * - Falhar rápido com mensagem clara é melhor que erro críptico de conexão.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    '❌ DATABASE_URL não configurada. ' +
    'Copie server/.env.example para server/.env e preencha a connection string.'
  );
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString,
      /**
       * POR QUÊ max: 10?
       * - Para um servidor Render com 512MB RAM, 10 conexões é um bom equilíbrio.
       * - Cada conexão PostgreSQL consome ~5-10MB de RAM no servidor de banco.
       * - Em escala, ajustar via env var ou usar PgBouncer como connection pooler.
       */
      max: 10,
      /**
       * POR QUÊ ssl em produção?
       * - Conexões sem SSL transmitem dados (incluindo credenciais) em texto puro.
       * - Em produção, o banco está em outro servidor — tráfego atravessa a rede.
       * - rejectUnauthorized: false permite certificados self-signed (comum em Render).
       */
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
    }),
  }),
});
