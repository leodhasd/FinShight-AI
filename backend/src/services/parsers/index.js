/**
 * Built-in bank parser modules.
 *
 * Each module exports a registry-compatible parser definition:
 *   {
 *     id: string,              // unique bank id (e.g. 'canara', 'generic')
 *     bankName: string,        // short name
 *     bankDisplayName: string, // human-friendly display name
 *     formats: string[],       // supported formats: 'pdf' | 'text' | 'csv'
 *     priority: number,        // higher runs first during detection
 *     detect(input),           // boolean â€” does this input look like this bank?
 *     parse(input, options),   // returns { transactions, skippedLines, metadata? }
 *   }
 *
 * To add a new bank:
 *   1. Create a new file in this directory implementing the above contract.
 *   2. Import it below and add it to the BUILT_IN_PARSERS array.
 * The registry auto-routes uploads to the matching parser; no other code
 * changes are required.
 */
const canaraParser = require('./canaraParser');
const genericParser = require('./genericParser');

/**
 * Ordered list of built-in parsers. Detection runs in array order, so
 * specific bank parsers must come before the generic catch-all.
 */
const BUILT_IN_PARSERS = [
  canaraParser,
  genericParser
];

module.exports = {
  BUILT_IN_PARSERS
};


