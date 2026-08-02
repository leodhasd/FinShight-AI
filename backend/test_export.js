/**
 * Test suite for the Transaction Export System helpers.
 *
 * Verifies:
 *  - `buildTransactionFilter` produces the correct MongoDB filter for all
 *    supported query params (date range, month, year, category, type,
 *    credit/debit ranges, search).
 *  - `buildCsvExport` produces a well-formed CSV with correct date formatting,
 *    quoting/escaping, and the expected header.
 *
 * These helpers are extracted from statementController.js and are shared by the
 * transactions list view and the export endpoint so exported data always
 * matches what the user sees on screen.
 */
const {
  buildTransactionFilter,
  buildCsvExport
} = require('./src/controllers/statementController');

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

// ---------------------------------------------------------------------------
// buildTransactionFilter tests
// ---------------------------------------------------------------------------
console.log('\n========== Transaction Export Tests ==========\n');

test('filter: base filter includes owner + statement ids', () => {
  const f = buildTransactionFilter({}, 'user1', 'stmt1');
  assert(f.ownerUserId === 'user1', 'ownerUserId not set');
  assert(f.statementId === 'stmt1', 'statementId not set');
});

test('filter: date range adds $gte/$lte on date', () => {
  const f = buildTransactionFilter({ startDate: '2025-01-01', endDate: '2025-01-31' }, 'u', 's');
  assert(f.date.$gte instanceof Date, '$gte missing');
  assert(f.date.$lte instanceof Date, '$lte missing');
});

test('filter: month without year uses $expr', () => {
  const f = buildTransactionFilter({ month: '2' }, 'u', 's');
  assert(f.$expr && f.$expr.$eq && f.$expr.$eq[1] === 2, `Expected $expr month filter, got ${JSON.stringify(f)}`);
});

test('filter: month with year narrows date range', () => {
  const f = buildTransactionFilter({ month: '2', year: '2025' }, 'u', 's');
  assert(f.date && f.date.$gte instanceof Date, 'date.$gte missing');
  const gte = f.date.$gte;
  assert(gte.getFullYear() === 2025 && gte.getMonth() === 1, `Expected Feb 2025 start, got ${gte}`);
});

test('filter: category is exact match', () => {
  const f = buildTransactionFilter({ category: 'Food' }, 'u', 's');
  assert(f.category === 'Food', `Expected category Food, got ${f.category}`);
});

test('filter: type=credit adds credit $gt 0', () => {
  const f = buildTransactionFilter({ type: 'credit' }, 'u', 's');
  assert(f.credit && f.credit.$gt === 0, `Expected credit $gt 0, got ${JSON.stringify(f.credit)}`);
});

test('filter: type=debit adds debit $gt 0', () => {
  const f = buildTransactionFilter({ type: 'debit' }, 'u', 's');
  assert(f.debit && f.debit.$gt === 0, `Expected debit $gt 0, got ${JSON.stringify(f.debit)}`);
});

test('filter: minCredit/maxCredit add credit range', () => {
  const f = buildTransactionFilter({ minCredit: '100', maxCredit: '1000' }, 'u', 's');
  assert(f.credit.$gte === 100, 'credit $gte missing');
  assert(f.credit.$lte === 1000, 'credit $lte missing');
});

test('filter: minDebit/maxDebit add debit range', () => {
  const f = buildTransactionFilter({ minDebit: '50', maxDebit: '500' }, 'u', 's');
  assert(f.debit.$gte === 50, 'debit $gte missing');
  assert(f.debit.$lte === 500, 'debit $lte missing');
});

test('filter: search builds case-insensitive regex', () => {
  const f = buildTransactionFilter({ search: 'UPI' }, 'u', 's');
  assert(f.description && f.description.$regex, 'search regex missing');
  assert(f.description.$options === 'i', 'search not case-insensitive');
});

test('filter: blank/empty values are ignored', () => {
  const f = buildTransactionFilter({
    startDate: '', endDate: '', month: '', year: '',
    category: '', type: '', minCredit: '', maxCredit: '',
    minDebit: '', maxDebit: '', search: ''
  }, 'u', 's');
  assert(!f.date && !f.category && !f.type && !f.credit && !f.debit && !f.description && !f.$expr,
    `Expected no extra filters, got ${JSON.stringify(f)}`);
});

// ---------------------------------------------------------------------------
// buildCsvExport tests
// ---------------------------------------------------------------------------
test('csv: header present with all 6 columns', () => {
  const csv = buildCsvExport([]);
  assert(csv.includes('Date,Description,Debit,Credit,Balance,Category'), 'Header missing/wrong');
});

test('csv: empty list yields just the header', () => {
  const csv = buildCsvExport([]);
  assert(csv.trim() === 'Date,Description,Debit,Credit,Balance,Category', `Unexpected empty CSV: ${JSON.stringify(csv)}`);
});

test('csv: row has correct date formatting DD-MM-YYYY', () => {
  const csv = buildCsvExport([{ date: new Date('2025-03-15T10:00:00Z'), description: 'Test', debit: 100, credit: 0, balance: 500, category: 'Food' }]);
  const lines = csv.split('\n').filter(Boolean);
  assert(lines.length === 2, `Expected 2 lines, got ${lines.length}`);
  assert(lines[1].startsWith('15-03-2025,'), `Expected date prefix, got ${lines[1]}`);
});

test('csv: description with commas and quotes is escaped', () => {
  const csv = buildCsvExport([{ date: new Date('2025-01-01'), description: 'He said "hi", bye', debit: 0, credit: 0, balance: 0, category: 'Others' }]);
  const lines = csv.split('\n').filter(Boolean);
  assert(lines[1].includes('"He said ""hi"", bye"'), `Expected escaped description, got ${lines[1]}`);
});

test('csv: amounts default to 0 when missing', () => {
  const csv = buildCsvExport([{ date: new Date('2025-01-01'), description: 'x', category: 'Bills' }]);
  const lines = csv.split('\n').filter(Boolean);
  assert(lines[1].endsWith(',0,0,0,Bills'), `Expected defaulted amounts, got ${lines[1]}`);
});

test('csv: multiple rows produce multiple lines', () => {
  const csv = buildCsvExport([
    { date: new Date('2025-01-01'), description: 'a', debit: 1, credit: 0, balance: 0, category: 'Others' },
    { date: new Date('2025-01-02'), description: 'b', debit: 0, credit: 2, balance: 0, category: 'Others' }
  ]);
  const lines = csv.split('\n').filter(Boolean);
  assert(lines.length === 3, `Expected header + 2 rows, got ${lines.length} lines`);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (errors.length > 0) {
  console.log('Failed tests:');
  for (const e of errors) {
    console.log(`  - ${e.name}: ${e.error}`);
  }
}

process.exit(failed > 0 ? 1 : 0);

