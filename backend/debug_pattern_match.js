const m = require('./src/services/statementParser');

const testLine = '02/07/2026 ATM Withdrawal 2000.00 48000.00';

console.log('Testing pattern matching on:', testLine);

// Check if classifyByDescription is exported
console.log('classifyByDescription exported:', typeof m.classifyByDescription);

// Check the internal patterns
// Access patterns via parseLines logic
console.log('\nRegex tests:');
console.log('5-col-explicit:', /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([A-Za-z0-9].*?)\s+([\d,.\-]+)\s+([\d,.\-]+)\s+([\d,.\-]+)$/.test(testLine));
console.log('4-col-plain:', /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+(-?[\d,.\-]+)\s+(-?[\d,.\-]+)$/.test(testLine));

// Parse the line directly with what parseLines would do
const lines = [testLine];
const result = m.parseLines(lines);
console.log('\nparseLines result:');
console.log(JSON.stringify(result.transactions, null, 2));
console.log('Skipped:', result.skippedLines.length);

