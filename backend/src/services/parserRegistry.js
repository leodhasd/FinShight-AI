/**
 * Parser Registry / Factory
 *
 * Routes an uploaded bank statement to the correct per-bank parser.
 *
 * Architecture:
 *   - Each bank has its own parser module (see `./parsers/`).
 *   - Each parser implements the same contract:
 *       {
 *         id, bankName, bankDisplayName, formats, priority,
 *         detect(input) -> boolean,
 *         parse(input, options) -> { transactions, skippedLines, metadata? }
 *       }
 *   - The registry tries parsers in priority order. The first parser whose
 *     `detect()` returns true handles the file. If no bank-specific parser
 *     matches, the generic fallback is used.
 *   - If even the generic parser cannot extract transactions, the registry
 *     returns a structured `unsupportedBank` result with a clear message â€”
 *     it never throws, so the app never crashes on an unknown bank.
 *
 * Adding a new bank:
 *   1. Create `parsers/<bank>Parser.js` implementing the contract above.
 *   2. Add it to `parsers/index.js` (BUILT_IN_PARSERS).
 *   3. Done â€” the registry automatically detects and routes to it.
 */
const { BUILT_IN_PARSERS } = require('./parsers');

const UNSUPPORTED_BANK_MESSAGE =
  'Unsupported bank statement format. The uploaded file does not match any ' +
  'supported bank statement layout. Supported banks: Canara Bank. Please ' +
  'upload a statement from a supported bank or contact support.';

// Internal registry map (id -> parser)
const registry = new Map();

function normalizeParser(parser) {
  if (!parser || typeof parser.parse !== 'function') {
    throw new Error('Parser must expose a parse() function');
  }
  const id = parser.id || 'unknown';
  return {
    id,
    bankName: parser.bankName || id,
    bankDisplayName: parser.bankDisplayName || parser.bankName || id,
    formats: Array.isArray(parser.formats) ? parser.formats : ['pdf', 'text', 'csv'],
    priority: typeof parser.priority === 'number' ? parser.priority : 0,
    detect: typeof parser.detect === 'function' ? parser.detect : () => true,
    parse: parser.parse,
    raw: parser
  };
}

function registerParser(parser) {
  const normalized = normalizeParser(parser);
  registry.set(normalized.id, normalized);
  return normalized;
}

function getParser(id) {
  return registry.get(id) || null;
}

function getSupportedBanks() {
  return Array.from(registry.values())
    .map((p) => ({
      id: p.id,
      bankName: p.bankName,
      bankDisplayName: p.bankDisplayName,
      formats: p.formats
    }));
}

/**
 * Detect the most likely bank parser for the given input.
 * Returns the normalized parser definition, or null if none matches.
 */
function detectBank(input) {
  const candidates = Array.from(registry.values()).sort((a, b) => b.priority - a.priority);
  for (const parser of candidates) {
    try {
      if (parser.id === 'generic') continue; // generic is the fallback, not a detector
      if (parser.detect(input)) {
        return parser;
      }
    } catch (e) {
      // A misbehaving detector should never break routing
      console.error(`[ParserRegistry] detect() threw for ${parser.id}: ${e.message}`);
    }
  }
  return null;
}

/**
 * Parse text lines through the registry.
 *
 * @param {string[]} lines - Normalized text lines from a PDF or text file
 * @param {object} [options] - { format: 'pdf'|'text' }
 * @returns {object} result with bankId/bankName + unsupportedBank flags
 */
function parseLines(lines) {
  const detected = detectBank(lines);
  if (detected) {
    const result = detected.parse(lines, { format: 'text' });
    if (result) {
      return {
        ...result,
        bankId: detected.id,
        bankName: detected.bankName,
        bankDisplayName: detected.bankDisplayName,
        unsupportedBank: false
      };
    }
  }

  // Fallback to the generic parser
  const generic = getParser('generic');
  if (generic) {
    const result = generic.parse(lines, { format: 'text' });
    if (result && result.transactions && result.transactions.length > 0) {
      return {
        ...result,
        bankId: 'generic',
        bankName: 'Generic',
        bankDisplayName: 'Generic / Unknown Bank',
        unsupportedBank: false
      };
    }
  }

  // Nothing matched and generic produced no transactions â€” unsupported bank
  return {
    transactions: [],
    skippedLines: [{ line: '(unknown format)', reason: 'Unsupported bank statement format' }],
    bankId: null,
    bankName: null,
    bankDisplayName: null,
    unsupportedBank: true,
    unsupportedMessage: UNSUPPORTED_BANK_MESSAGE
  };
}

/**
 * Parse a CSV buffer through the registry.
 *
 * @param {Buffer} buffer - CSV file buffer
 * @returns {object} result with bankId/bankName + unsupportedBank flags
 */
function parseCSV(buffer) {
  const generic = getParser('generic');
  if (generic) {
    const result = generic.parse(buffer, { format: 'csv' });
    if (result && result.transactions && result.transactions.length > 0) {
      return {
        ...result,
        bankId: 'generic',
        bankName: 'Generic',
        bankDisplayName: 'Generic / Unknown Bank',
        unsupportedBank: false
      };
    }
    // CSV that parsed but yielded no transactions is still a "parsed" format;
    // preserve existing behavior (return empty result, not unsupported).
    return {
      ...result,
      bankId: 'generic',
      bankName: 'Generic',
      bankDisplayName: 'Generic / Unknown Bank',
      unsupportedBank: false
    };
  }

  return {
    transactions: [],
    skippedLines: [{ line: '(unknown CSV)', reason: 'Unsupported bank statement format' }],
    bankId: null,
    bankName: null,
    bankDisplayName: null,
    unsupportedBank: true,
    unsupportedMessage: UNSUPPORTED_BANK_MESSAGE
  };
}

// Register all built-in parsers at module load
for (const parser of BUILT_IN_PARSERS) {
  registerParser(parser);
}

module.exports = {
  registerParser,
  getParser,
  getSupportedBanks,
  detectBank,
  parseLines,
  parseCSV,
  UNSUPPORTED_BANK_MESSAGE
};


