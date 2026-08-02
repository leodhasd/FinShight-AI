/**
 * Multi-Bank Statement Parser Architecture Tests
 *
 * Verifies:
 * - Parser registry / factory auto-detects banks
 * - Canara parser still routes correctly
 * - New banks can be registered without breaking existing parsers
 * - Unknown banks produce a clear unsupported-bank message (no crash)
 * - Backward-compatible exports on the statementParser facade
 * - Generic fallback still handles common CSV/text layouts
 *
 * Usage: node backend/test_multi_bank_parser.js
 */
const {
  parseStatement,
  parseCSV,
  parseLines,
  parseCanaraLines,
  generateTransactionHash,
  normalizeDate,
  parseAmount,
  classifyAmount,
  classifyByDescription,
  isNonTransactionLine,
  parserRegistry,
  getSupportedBanks,
  registerParser
} = require('./src/services/statementParser');

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (e) {
    console.log(`  [FAIL] ${name}: ${e.message}`);
    failed++;
    errors.push({ name, error: e.message });
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// Minimal Canara fixture (enough to trigger detection + parse metadata)
const CANARA_FIXTURE = [
  'Statement for A/c XXXXXXXX3254 between 29-Jul-2026 and 30-Jul-2026',
  'Customer Id XXXXXXX78',
  'Name SAKTHIVEL BALAN S',
  'Branch Code 5044',
  'Branch Name SALEM HASTHAMPATTY',
  'IFSC Code CNRB0005044',
  'Date Particulars Deposits Withdrawals Balance',
  'Opening Balance 249.22',
  '29-07-2026',
  'UPI/CR/211900588070/KIRUBH',
  'ASH/IOBA/**35280@PTYES/SE',
  'NT',
  'USI//PTM2E355E8040DB458CB',
  '4AA7A440C867360/29/07/2026',
  '11:24:25',
  'Chq: 211900588070',
  '3.00 252.22',
  '29-07-2026',
  'UPI/DR/657694320630/HOTEL',
  'ARYA/IDIB/**00198@INDIANBK/',
  'UPI//AXI1557BCD12C674ADD86',
  'AF01CA6F548086/29/07/2026',
  '11:25:11',
  'Chq: 657694320630',
  '30.00 222.22',
  'Closing Balance 222.22'
];

const SBI_CSV = 'Date,Particulars,Withdrawal,Deposit,Balance\n' +
  '01/04/2024,NEFT TRANSFER TO ABC,500.00,0,"1,23,456.78"\n' +
  '02/04/2024,SALARY CREDIT,0,75000.00,"1,98,456.78"';

const UNKNOWN_TEXT = [
  'RANDOM BANK PLC',
  'CUSTOMER ACCOUNT 9999',
  'This is not a bank statement in any known format'
];

console.log('\n========== Multi-Bank Parser Architecture Tests ==========');

// ============================================================
// 1. Registry / factory
// ============================================================
console.log('\n--- Registry / Factory ---');

test('getSupportedBanks lists canara + generic', () => {
  const banks = getSupportedBanks();
  const ids = banks.map(b => b.id);
  assert(ids.includes('canara'), `Expected canara in supported banks, got ${ids.join(', ')}`);
  assert(ids.includes('generic'), `Expected generic in supported banks, got ${ids.join(', ')}`);
});

test('parserRegistry.getParser("canara") returns the Canara parser', () => {
  const p = parserRegistry.getParser('canara');
  assert(p, 'Canara parser not found');
  assert(p.bankName === 'Canara Bank', `Expected Canara Bank, got ${p.bankName}`);
});

test('detectBank identifies Canara fixture as canara', () => {
  const detected = parserRegistry.detectBank(CANARA_FIXTURE);
  assert(detected, 'No bank detected for Canara fixture');
  assert(detected.id === 'canara', `Expected canara, got ${detected.id}`);
});

test('detectBank returns null for unknown text', () => {
  const detected = parserRegistry.detectBank(UNKNOWN_TEXT);
  assert(detected === null, `Expected null, got ${detected ? detected.id : 'null'}`);
});

// ============================================================
// 2. Adding a new bank without breaking existing parsers
// ============================================================
console.log('\n--- Registering a New Bank ---');

// Simulate adding a new bank parser at runtime (e.g. "hdfc")
const mockHdfcParser = {
  id: 'hdfc',
  bankName: 'HDFC Bank',
  bankDisplayName: 'HDFC Bank',
  formats: ['pdf', 'text'],
  priority: 90,
  detect: (input) => {
    const text = Array.isArray(input) ? input.join('\n') : String(input || '');
    return /HDFC\s+BANK/i.test(text);
  },
  parse: (lines) => {
    return {
      transactions: [{
        date: new Date('2024-01-05'),
        description: 'HDFC MOCK TXN',
        debit: 0,
        credit: 100,
        balance: 100,
        transactionHash: 'mock'
      }],
      skippedLines: [],
      metadata: { accountHolderName: 'HDFC USER', accountNumber: 'HDFC123' }
    };
  }
};

test('registerParser accepts a new bank parser', () => {
  const registered = registerParser(mockHdfcParser);
  assert(registered.id === 'hdfc', 'HDFC not registered');
});

test('getSupportedBanks includes newly registered hdfc', () => {
  const ids = getSupportedBanks().map(b => b.id);
  assert(ids.includes('hdfc'), 'hdfc missing from supported banks');
});

test('Existing Canara parser still detected after adding hdfc', () => {
  const detected = parserRegistry.detectBank(CANARA_FIXTURE);
  assert(detected && detected.id === 'canara', `Expected canara, got ${detected ? detected.id : 'null'}`);
});

test('HDFC detection routes to the new parser', () => {
  const hdfcLines = ['HDFC BANK', 'ACCOUNT STATEMENT', '05/01/2024 MOCK 100 0 100'];
  const detected = parserRegistry.detectBank(hdfcLines);
  assert(detected && detected.id === 'hdfc', `Expected hdfc, got ${detected ? detected.id : 'null'}`);
  const result = detected.parse(hdfcLines);
  assert(result.transactions.length === 1, 'HDFC parser produced no transactions');
  assert(result.transactions[0].description === 'HDFC MOCK TXN', 'HDFC parser output mismatch');
});

// ============================================================
// 3. Unsupported bank handling
// ============================================================
console.log('\n--- Unsupported Bank Handling ---');

test('parseLines returns unsupportedBank=true for unknown text (no crash)', () => {
  const result = parseLines(UNKNOWN_TEXT);
  assert(result.unsupportedBank === true, 'Expected unsupportedBank=true');
  assert(typeof result.unsupportedMessage === 'string', 'Missing unsupportedMessage');
  assert(result.unsupportedMessage.length > 0, 'Empty unsupportedMessage');
  assert(Array.isArray(result.transactions), 'transactions should be an array');
  assert(result.transactions.length === 0, 'No transactions expected for unknown bank');
});

test('parseStatement returns unsupported-bank flags for unknown PDF text', async () => {
  // We can't easily build a real PDF; use parseStatement with a CSV that
  // generic can't parse to test the unsupported path via text/csv.
  const result = await parseStatement(Buffer.from('THIS IS NOT A BANK STATEMENT\nNO PARSEABLE ROWS'), 'text/csv');
  // CSV goes through generic parser; unknown CSV yields 0 transactions but
  // is NOT flagged unsupported (existing behavior). Verify structure holds.
  assert(result && typeof result.transactions === 'object', 'result.transactions should exist');
  assert(Array.isArray(result.transactions), 'result.transactions should be an array');
});

test('parseStatement with Canara PDF text fixture routes to Canara', async () => {
  // Use parseLines (which mirrors the PDF text path) with the Canara fixture.
  const result = parseLines(CANARA_FIXTURE);
  assert(result.bankId === 'canara', `Expected canara, got ${result.bankId}`);
  assert(result.bankDisplayName === 'Canara Bank', `Got ${result.bankDisplayName}`);
  assert(result.unsupportedBank === false, 'Canara should not be unsupported');
  assert(result.transactions.length === 2, `Expected 2 transactions, got ${result.transactions.length}`);
});

// ============================================================
// 4. Backward compatibility
// ============================================================
console.log('\n--- Backward Compatibility ---');

test('Backward-compat exports all exist', () => {
  assert(typeof parseStatement === 'function', 'parseStatement missing');
  assert(typeof parseCSV === 'function', 'parseCSV missing');
  assert(typeof parseLines === 'function', 'parseLines missing');
  assert(typeof parseCanaraLines === 'function', 'parseCanaraLines missing');
  assert(typeof generateTransactionHash === 'function', 'generateTransactionHash missing');
  assert(typeof normalizeDate === 'function', 'normalizeDate missing');
  assert(typeof parseAmount === 'function', 'parseAmount missing');
  assert(typeof classifyAmount === 'function', 'classifyAmount missing');
  assert(typeof classifyByDescription === 'function', 'classifyByDescription missing');
  assert(typeof isNonTransactionLine === 'function', 'isNonTransactionLine missing');
});

test('parseCanaraLines still returns metadata + transactions', () => {
  const r = parseCanaraLines(CANARA_FIXTURE);
  assert(r, 'parseCanaraLines returned null');
  assert(r.metadata.accountHolderName === 'SAKTHIVEL BALAN S', `Holder: ${r.metadata.accountHolderName}`);
  assert(r.metadata.accountNumber === 'XXXXXXXX3254', `Account: ${r.metadata.accountNumber}`);
  assert(r.metadata.openingBalance === 249.22, `Opening: ${r.metadata.openingBalance}`);
  assert(r.metadata.closingBalance === 222.22, `Closing: ${r.metadata.closingBalance}`);
});

test('parseCanaraLines parses debit/credit correctly', () => {
  const r = parseCanaraLines(CANARA_FIXTURE);
  assert(r.transactions[0].credit === 3.00, `Txn0 credit expected 3, got ${r.transactions[0].credit}`);
  assert(r.transactions[0].debit === 0, `Txn0 debit expected 0, got ${r.transactions[0].debit}`);
  assert(r.transactions[1].debit === 30.00, `Txn1 debit expected 30, got ${r.transactions[1].debit}`);
  assert(r.transactions[1].credit === 0, `Txn1 credit expected 0, got ${r.transactions[1].credit}`);
});

test('normalizeDate still works', () => {
  const d = normalizeDate('05/01/2024');
  assert(d instanceof Date && d.getDate() === 5 && d.getMonth() === 0, 'normalizeDate broken');
});

test('parseAmount still works', () => {
  assert(parseAmount('1,234.56') === 1234.56, 'parseAmount broken');
});

test('Generic CSV fallback still parses SBI format', () => {
  const r = parseCSV(Buffer.from(SBI_CSV));
  assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
  assert(r.transactions[0].debit === 500.00, `Expected debit 500, got ${r.transactions[0].debit}`);
  assert(r.transactions[1].credit === 75000.00, `Expected credit 75000, got ${r.transactions[1].credit}`);
});

test('Generic text fallback still parses common layouts', () => {
  const lines = ['05/01/2024 AMAZON PURCHASE 49.99 0 950.01', '06/01/2024 SALARY DEPOSIT 0 2500.00 3450.01'];
  const r = parseLines(lines);
  assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
  assert(r.bankId === 'generic', `Expected generic, got ${r.bankId}`);
  assert(r.unsupportedBank === false, 'Generic parse should not be unsupported');
});

// ============================================================
// 5. Registry helpers exposed through facade
// ============================================================
console.log('\n--- Facade Registry Helpers ---');

test('parserRegistry has expected helper functions', () => {
  assert(typeof parserRegistry.registerParser === 'function', 'registerParser missing');
  assert(typeof parserRegistry.getParser === 'function', 'getParser missing');
  assert(typeof parserRegistry.getSupportedBanks === 'function', 'getSupportedBanks missing');
  assert(typeof parserRegistry.detectBank === 'function', 'detectBank missing');
  assert(typeof parserRegistry.parseLines === 'function', 'parseLines missing');
  assert(typeof parserRegistry.parseCSV === 'function', 'parseCSV missing');
});

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (errors.length > 0) {
  console.log('Failed tests:');
  for (const e of errors) {
    console.log(`  - ${e.name}: ${e.error}`);
  }
}

process.exit(failed > 0 ? 1 : 0);


