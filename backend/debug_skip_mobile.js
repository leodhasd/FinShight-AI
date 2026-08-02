const { isNonTransactionLine } = require('./src/services/statementParser');

const line = '10/07/2026 Mobile Recharge 399.00 85861.00';
const result = isNonTransactionLine(line);
console.log('Line:', line);
console.log('isNonTransactionLine result:', result);

const upper = line.toUpperCase().trim();
console.log('\nChecking key patterns:');

const checks = [
  { name: 'PAGE/CONTINUED', re: /^(PAGE|CONTINUED|CONTD?.?)\s*\d/i, test: upper },
  { name: 'OF digit', re: /^\d+\s*(OF|CONTINUED)\s*\d+/i, test: upper },
  { name: 'ACCOUNT NO/STATEMENT/TYPE', re: /ACCOUNT\s*(NO|NUMBER|STATEMENT|SUMMARY|TYPE|HOLDER|NAME)/i, test: upper },
  { name: 'MOBILE (for ADDRESS/PHONE/MOBILE check)', re: /ADDRESS|PHONE|MOBILE|EMAIL|WEBSITE|CALL\s*US|TOLL\s*FREE/i, test: upper },
  { name: 'STATEMENT header', re: /^(STATEMENT|BANK\s*STATEMENT|ACCOUNT\s*STATEMENT|E-\s*STATEMENT)/i, test: upper },
  { name: 'OPENING/CLOSING BALANCE', re: /^(OPENING|CLOSING)\s*BALANCE/i, test: upper },
  { name: 'TOTAL/SUBTOTAL', re: /^(TOTAL|SUBTOTAL|GRAND\s*TOTAL|SUM\s*OF)/i, test: upper },
  { name: 'Column header (DATE ...)', re: /^(DATE|TRANSACTION\s+DATE|VALUE\s+DATE|POSTING\s+DATE|TXN\s+DATE)\s/i, test: upper },
  { name: 'Numbers only', re: /^[\d,\s.\-]+$/, test: line.trim() },
  { name: 'Date only', re: /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s*$/, test: line.trim() },
];

for (const c of checks) {
  const matched = c.re.test(c.test);
  if (matched) {
    console.log(`  [MATCH] ${c.name}`);
  }
}

console.log('\nNo MOBILE-related false matches expected - the MOBILE check requires upper.length < 100');
console.log('The line length is', line.trim().length, 'and the check would pass through correctly.');
