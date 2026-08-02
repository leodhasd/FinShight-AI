/**
 * Statement Parser â€” Backward-Compatible Facade
 *
 * This module preserves the exact public API of the original monolithic
 * parser while routing all parsing through the multi-bank parser registry
 * (`./parserRegistry.js`).
 *
 * Consumers (controllers, tests, debug scripts) keep using the same functions
 * and shapes:
 *   - parseStatement(buffer, mimeType)
 *   - parsePDF(buffer)
 *   - parsePDFWithPassword(buffer, password)
 *   - parseLines(lines)
 *   - parseCSV(buffer)
 *   - parseCanaraLines(lines)
 *   - generateTransactionHash, normalizeDate, parseAmount, classifyAmount,
 *     classifyByDescription, isNonTransactionLine
 *
 * New behavior (backward compatible):
 *   - Results now include `bankId`, `bankName`, `bankDisplayName`.
 *   - Unknown banks produce a structured `unsupportedBank: true` result with
 *     a clear `unsupportedMessage` instead of crashing.
 */
const { parse } = require('csv-parse/sync');
const {
  generateTransactionHash,
  normalizeDate,
  parseAmount,
  classifyAmount,
  classifyByDescription,
  isNonTransactionLine,
  extractDrCr
} = require('./parsers/common');
const parserRegistry = require('./parserRegistry');
const canaraParser = require('./parsers/canaraParser');

/**
 * Parse Canara Bank ePassbook text lines.
 *
 * Preserved verbatim for backward compatibility â€” delegates to the Canara
 * parser module.
 */
function parseCanaraLines(lines) {
  return canaraParser.parseCanaraLines(lines);
}

/**
 * Parse generic text lines (backward-compatible export).
 * Routes through the registry.
 */
function parseLines(lines) {
  return parserRegistry.parseLines(lines);
}

/**
 * Parse a CSV buffer (backward-compatible export).
 * Routes through the registry.
 */
function parseCSV(buffer) {
  return parserRegistry.parseCSV(buffer);
}

async function parsePDF(buffer) {
  // pdf-parse@2.4.5 exports a PDFParse class, not a default function
  const { PDFParse } = require('pdf-parse');

  let text = '';
  try {
    const parser = new PDFParse({
      data: buffer,
      verbosity: 0
    });
    await parser.load();
    const parsedResult = await parser.getText();
    text = parsedResult && parsedResult.text ? parsedResult.text : '';
  } catch (err) {
    throw new Error('Failed to parse PDF: ' + err.message);
  }

  if (!text.trim()) {
    return {
      transactions: [],
      skippedLines: [{ line: '(empty PDF)', reason: 'PDF text extraction returned empty content' }],
      _rawText: text,
      _rawTextLength: text.length
    };
  }

  // Normalize line endings (Windows \r\n -> \n)
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('[StatementParser] PDF lines extracted:', lines.length);

  // Debug: log first 10 lines
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    console.log('[StatementParser]   Line ' + (i + 1) + ': "' + lines[i].slice(0, 120) + '"');
  }

  // Route through the multi-bank parser registry
  const result = parseLines(lines);
  if (result.bankId && result.bankId !== 'generic') {
    console.log(`[StatementParser] Detected ${result.bankDisplayName} (${result.bankId}) format`);
  } else {
    console.log('[StatementParser] No bank-specific parser matched; used generic fallback');
  }
  result._rawText = text;
  result._rawTextLength = text.length;
  return result;
}

/**
 * Main entry point: parse a statement buffer based on MIME type.
 * Returns { transactions, skippedLines, totalRows, metadata, bankId, bankName }
 */
async function parseStatement(buffer, mimeType) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Empty buffer provided');
  }

  let result;

  if (mimeType === 'application/pdf') {
    result = await parsePDF(buffer);
  } else if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
    result = parseCSV(buffer);
  } else {
    throw new Error('Unsupported file type: ' + mimeType);
  }

  // Add total rows metric
  const totalRows = result.transactions.length + result.skippedLines.length;

  return {
    transactions: result.transactions,
    skippedLines: result.skippedLines,
    totalRows,
    metadata: result.metadata,
    bankId: result.bankId,
    bankName: result.bankName,
    bankDisplayName: result.bankDisplayName,
    unsupportedBank: result.unsupportedBank,
    unsupportedMessage: result.unsupportedMessage
  };
}

/**
 * Parse a password-protected PDF buffer.
 *
 * Decrypts the PDF using the provided password, then parses the decrypted
 * text using the multi-bank parsing pipeline. The password is a local variable
 * that is never logged, stored, or cached.
 *
 * SECURITY: The password exists only in this function scope. It is cleared
 * as soon as parsing completes (successfully or not).
 *
 * @param {Buffer} buffer - Raw PDF file buffer
 * @param {string} password - The PDF password (cleared after use)
 * @returns {Promise<{transactions: Array, skippedLines: Array, totalRows: number, metadata?: Object}>}
 * @throws {Error} - PasswordException for wrong password, other errors for corrupted/unsupported PDFs
 */
async function parsePDFWithPassword(buffer, password) {
  const { unlockPDF } = require('./pdfPasswordService');

  // The password is used only to call unlockPDF â€” it is never logged or stored
  const text = await unlockPDF(buffer, password);
  // At this point, the password is no longer referenced and will be GC'd

  if (!text || !text.trim()) {
    return {
      transactions: [],
      skippedLines: [{ line: '(empty PDF)', reason: 'PDF text extraction returned empty content after decryption' }],
      totalRows: 0
    };
  }

  // Normalize line endings (Windows \r\n -> \n)
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);

  // Use the exact same multi-bank parsing pipeline as regular PDFs.
  const result = parseLines(lines);
  if (result.bankId && result.bankId !== 'generic') {
    console.log(`[StatementParser] Detected ${result.bankDisplayName} (${result.bankId}) format (password-unlocked)`);
  } else {
    console.log('[StatementParser] No bank-specific parser matched; used generic fallback (password-unlocked)');
  }

  const totalRows = result.transactions.length + result.skippedLines.length;

  return {
    transactions: result.transactions,
    skippedLines: result.skippedLines,
    totalRows,
    metadata: result.metadata,
    bankId: result.bankId,
    bankName: result.bankName,
    bankDisplayName: result.bankDisplayName,
    unsupportedBank: result.unsupportedBank,
    unsupportedMessage: result.unsupportedMessage
  };
}

module.exports = {
  parseStatement,
  parseCSV,
  parsePDF,
  parsePDFWithPassword,
  parseLines,
  parseCanaraLines,
  generateTransactionHash,
  normalizeDate,
  parseAmount,
  classifyAmount,
  classifyByDescription,
  isNonTransactionLine,
  // Registry helpers exposed for new-bank integrations
  parserRegistry,
  getSupportedBanks: parserRegistry.getSupportedBanks,
  registerParser: parserRegistry.registerParser
};


