/**
 * @module CsvSanitizer
 * @description Sanitização de CSV contra CSV Injection e geração de resultados.
 *
 * POR QUÊ sanitizar CSV?
 * - CSV Injection (também chamado Formula Injection) é um ataque onde um campo malicioso
 *   começa com =, +, -, @ ou TAB, fazendo o Excel/Google Sheets executar fórmulas.
 * - Exemplo: Um e-mail "=CMD('calc')" abriria a calculadora quando o CSV fosse aberto.
 * - Nosso sistema recebe CSVs de usuários (potencialmente maliciosos) e gera CSVs de resultado.
 * - AMBOS os caminhos (entrada e saída) precisam de sanitização.
 *
 * MITIGAÇÃO:
 * - Prefixar campos perigosos com apóstrofo (') → Excel trata como texto puro.
 * - Ref: OWASP CSV Injection Prevention Cheat Sheet
 */

import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import { Readable } from 'node:stream';

/** Caracteres que indicam possível fórmula em planilhas */
const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitiza um campo individual contra CSV Injection.
 *
 * @param field - Valor do campo a sanitizar
 * @returns Campo sanitizado (prefixado com ' se perigoso)
 *
 * POR QUÊ apóstrofo?
 * - O apóstrofo (') é o caractere padrão que o Excel usa para forçar "texto puro".
 * - É universalmente suportado (Excel, Google Sheets, LibreOffice).
 * - Não altera visualmente o conteúdo de forma significativa.
 *
 * @example
 * sanitizeField("=1+1")    // "'=1+1"
 * sanitizeField("+cmd")    // "'+cmd"
 * sanitizeField("normal")  // "normal" (sem alteração)
 */
export function sanitizeField(field: string): string {
  if (typeof field !== 'string') return String(field);

  /**
   * POR QUÊ verificar antes e depois do trim?
   * - Se o campo inicia diretamente com TAB (\t) ou outro prefixo perigoso,
   *   mantém o campo original prefixado com apóstrofo: '\t=cmd...
   * - Se contém espaços antes da fórmula (ex: "  =1+1"), faz o trim e sanitiza: '=1+1
   */
  if (DANGEROUS_PREFIXES.some((prefix) => field.startsWith(prefix))) {
    return `'${field}`;
  }

  const trimmed = field.trim();
  if (DANGEROUS_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return `'${trimmed}`;
  }

  return field;
}

/**
 * Sanitiza uma linha inteira de CSV (array de campos).
 */
export function sanitizeRow(row: string[]): string[] {
  return row.map(sanitizeField);
}

/**
 * Faz parsing de um CSV a partir de um Buffer ou string.
 *
 * @param input - Conteúdo do CSV (Buffer de upload ou string)
 * @returns Array de linhas, cada uma sendo um array de campos
 *
 * POR QUÊ stream-based parsing?
 * - CSVs grandes (100k+ linhas) não cabem confortavelmente em memória de uma vez.
 * - O parser stream processa linha por linha, mantendo uso de memória constante.
 * - Para arquivos menores (<10MB), a diferença é negligível mas o código é o mesmo.
 */
export async function parseCsv(
  input: Buffer | string
): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const records: string[][] = [];

    const stream =
      input instanceof Buffer
        ? Readable.from(input)
        : Readable.from([input]);

    stream
      .pipe(
        parse({
          /**
           * POR QUÊ relaxed_column_count?
           * - CSVs do mundo real frequentemente têm linhas com número diferente de colunas.
           * - Sem isso, o parser rejeitaria o arquivo inteiro por uma linha malformada.
           */
          relaxColumnCount: true,
          /**
           * POR QUÊ skip_empty_lines?
           * - Editores de texto frequentemente adicionam linha vazia no final.
           * - Evita gerar um resultado "vazio" espúrio.
           */
          skipEmptyLines: true,
          trim: true,
        })
      )
      .on('data', (row: string[]) => {
        records.push(row);
      })
      .on('end', () => resolve(records))
      .on('error', (error: Error) => reject(error));
  });
}

/**
 * Gera um CSV sanitizado a partir de uma matriz de dados.
 *
 * @param headers - Cabeçalhos das colunas
 * @param rows - Linhas de dados (cada linha é um array de strings)
 * @returns String do CSV completo, pronto para download
 *
 * POR QUÊ sanitizar na SAÍDA?
 * - Mesmo que o input original fosse seguro, os resultados podem conter dados
 *   do servidor SMTP (ex: mensagens de erro que iniciam com '-').
 * - Defense in depth: sanitizamos em TODAS as fronteiras.
 */
export function generateSanitizedCsv(
  headers: string[],
  rows: string[][]
): string {
  const sanitizedRows = rows.map(sanitizeRow);
  const sanitizedHeaders = sanitizeRow(headers);

  return stringify([sanitizedHeaders, ...sanitizedRows], {
    /**
     * POR QUÊ quoted: true?
     * - Aspas em volta de todos os campos previnem quebras em campos com vírgulas.
     * - Camada adicional de proteção contra injection (conteúdo dentro de aspas
     *   é tratado como texto literal na maioria dos parsers).
     */
    quoted: true,
  });
}

/**
 * Encontra a coluna de e-mail no header do CSV.
 *
 * POR QUÊ busca heurística?
 * - Cada cliente nomeia a coluna de e-mail diferente: "email", "Email", "E-mail",
 *   "endereco_email", "correo", etc.
 * - Buscamos por padrões comuns. Se não encontrar, assumimos a primeira coluna.
 *
 * @param headers - Array de cabeçalhos do CSV
 * @returns Índice da coluna que contém os e-mails
 */
export function findEmailColumnIndex(headers: string[]): number {
  const emailPatterns = [
    /^e[-_]?mail$/i,
    /^email[-_]?address$/i,
    /^endereco[-_]?email$/i,
    /^correo$/i,
    /^address$/i,
  ];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]!.trim();
    if (emailPatterns.some((pattern) => pattern.test(header))) {
      return i;
    }
  }

  /**
   * POR QUÊ default para coluna 0?
   * - Se nenhum header bate, é provável que o CSV tenha apenas e-mails (sem header).
   * - Assumir coluna 0 é o comportamento mais intuitivo para o usuário.
   */
  return 0;
}
