/**
 * @module migrate
 * @description Executador de migrations do banco de dados.
 *
 * POR QUÊ migrations manuais ao invés de auto-sync?
 * - Migrations são versionadas, reversíveis e auditáveis.
 * - Em produção, nunca queremos que o ORM altere tabelas automaticamente.
 * - Cada migration é um arquivo TypeScript que pode ser revisado em PR.
 *
 * Uso: npm run migrate (ou tsx src/data/migrate.ts)
 */

import 'dotenv/config';
import { db } from './database.js';
import { sql } from 'kysely';

export async function migrateDatabase(): Promise<void> {
  console.log('🔄 Executando migrations...');

  // A extensão é idempotente e usada pelos defaults UUID do schema.
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.execute(db);

  // =========================================
  // 001 — Tabela de Usuários
  // =========================================
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(254) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ DEFAULT NULL
    )
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash
    ON api_keys(key_hash)
    WHERE revoked_at IS NULL
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS credits (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS batch_jobs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'unverifiable_network_blocked')),
      total_emails INTEGER NOT NULL DEFAULT 0,
      processed_emails INTEGER NOT NULL DEFAULT 0,
      file_path TEXT NOT NULL,
      result_path TEXT DEFAULT NULL,
      result_data TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ DEFAULT NULL
    )
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS idx_batch_jobs_user
    ON batch_jobs(user_id, created_at DESC)
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS stripe_events (
      event_id VARCHAR(255) PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    ALTER TABLE batch_jobs ALTER COLUMN status TYPE VARCHAR(40)
  `.execute(db);
  await sql`
    ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS result_data TEXT DEFAULT NULL
  `.execute(db);
  await sql`
    ALTER TABLE batch_jobs DROP CONSTRAINT IF EXISTS batch_jobs_status_check
  `.execute(db);
  await sql`
    ALTER TABLE batch_jobs ADD CONSTRAINT batch_jobs_status_check
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'unverifiable_network_blocked'))
  `.execute(db);

  console.log('🎉 Migrations concluídas.');
}

async function migrate(): Promise<void> {
  try {
    await migrateDatabase();
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  void migrate();
}

