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

async function migrate(): Promise<void> {
  console.log('🔄 Executando migrations...\n');

  try {
    // =========================================
    // Habilitar extensão uuid-ossp para uuid_generate_v4()
    // =========================================
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
    console.log('✅ 001_create_users');

    // =========================================
    // 002 — Tabela de API Keys
    // =========================================
    /**
     * POR QUÊ key_hash VARCHAR(64)?
     * - SHA-256 gera um hash hexadecimal de exatamente 64 caracteres.
     * - Nunca armazenamos a chave em texto puro.
     */
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

    // Índice para busca rápida por hash (usado no authGuard)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_api_keys_hash
      ON api_keys(key_hash)
      WHERE revoked_at IS NULL
    `.execute(db);
    console.log('✅ 002_create_api_keys');

    // =========================================
    // 003 — Tabela de Créditos
    // =========================================
    /**
     * POR QUÊ tabela separada ao invés de coluna em users?
     * - Separação de concerns: dados de billing ≠ dados de autenticação.
     * - Permite futuras features como histórico de transações de crédito.
     * - Locking mais granular: atualizar créditos não bloqueia a row de users.
     */
    await sql`
      CREATE TABLE IF NOT EXISTS credits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.execute(db);
    console.log('✅ 003_create_credits');

    // =========================================
    // 004 — Tabela de Batch Jobs
    // =========================================
    await sql`
      CREATE TABLE IF NOT EXISTS batch_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'queued'
          CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
        total_emails INTEGER NOT NULL DEFAULT 0,
        processed_emails INTEGER NOT NULL DEFAULT 0,
        file_path TEXT NOT NULL,
        result_path TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ DEFAULT NULL
      )
    `.execute(db);

    // Índice para listar jobs do usuário ordenados por data
    await sql`
      CREATE INDEX IF NOT EXISTS idx_batch_jobs_user
      ON batch_jobs(user_id, created_at DESC)
    `.execute(db);
    console.log('✅ 004_create_batch_jobs');

    // 005 — Eventos Stripe processados; a chave primária impede replay/recrédito.
    await sql`
      CREATE TABLE IF NOT EXISTS stripe_events (
        event_id VARCHAR(255) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.execute(db);
    console.log('✅ 005_create_stripe_events');

    console.log('\n🎉 Todas as migrations executadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

migrate();
