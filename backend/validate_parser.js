const { parseStatement, parseCSV, parseLines, normalizeDate, parseAmount } = require('./src/services/statementParser');

async function run() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.log(`  [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
  }

  console.log('\n=== normalizeDate Tests ===');
  test('DD/MM/YYYY', () => {
    const d = normalizeDate('05/01/2024');
    assert(d instanceof Date && !isNaN(d.getTime()), 'Invalid date');
    assert(d.getDate() === 5, `Expected day 5, got ${d.getDate()}`);
    assert(d.getMonth() === 0, `Expected month 0 (Jan), got ${d.getMonth()}`);
  });
  test('DD-MM-YYYY', () => {
    const d = normalizeDate('15-03-2024');
    assert(d instanceof Date && d.getDate() === 15 && d.getMonth() === 2);
  });
  test('DD.MM.YYYY', () => {
    const d = normalizeDate('25.12.2024');
    assert(d instanceof Date && d.getDate() === 25 && d.getMonth() === 11);
  });
  test('DD-Mon-YYYY (05-Jan-2024)', () => {
    const d = normalizeDate('05-Jan-2024');
    assert(d instanceof Date && d.getDate() === 5 && d.getMonth() === 0);
  });
  test('DDMonYYYY (05JAN2024)', () => {
    const d = normalizeDate('05JAN2024');
    assert(d instanceof Date && d.getDate() === 5 && d.getMonth() === 0);
  });
  test('Mon DD YYYY (Jan 05 2024)', () => {
    const d = normalizeDate('Jan 05 2024');
    assert(d instanceof Date && d.getDate() === 5 && d.getMonth() === 0);
  });
  test('YYYY-MM-DD ISO', () => {
    const d = normalizeDate('2024-01-05');
    assert(d instanceof Date && d.getDate() === 5 && d.getMonth() === 0);
  });
  test('null/empty returns null', () => {
    assert(normalizeDate(null) === null);
    assert(normalizeDate('') === null);
  });

  console.log('\n=== parseAmount Tests ===');
  test('Simple number', () => assert(parseAmount('49.99') === 49.99));
  test('With commas (standard)', () => assert(parseAmount('1,234.56') === 1234.56));
  test('With Indian commas', () => assert(parseAmount('1,23,456.78') === 123456.78));
  test('Dr suffix', () => assert(parseAmount('1,234.56 Dr') === 1234.56));
  test('Cr suffix', () => assert(parseAmount('500.00 Cr') === 500.00));
  test('Negative number', () => assert(parseAmount('-100.50') === -100.50));
  test('Parentheses negative', () => assert(parseAmount('(100.50)') === -100.50));
  test('Rupee symbol', () => assert(parseAmount('₹1,234.56') === 1234.56));
  test('Zero', () => assert(parseAmount('0') === 0));
  test('Empty', () => assert(parseAmount('') === 0));
  test('Null', () => assert(parseAmount(null) === 0));

  console.log('\n=== CSV Parse Tests ===');
  // Standard 5-col format
  test('Standard CSV (Date,Description,Debit,Credit,Balance)', () => {
    const csv = 'Date,Description,Debit,Credit,Balance\n2024-01-05,Amazon Purchase,49.99,0,950.01\n2024-01-06,Salary,0,2500.00,3450.01';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].description === 'Amazon Purchase');
    assert(r.transactions[0].debit === 49.99);
    assert(r.transactions[0].credit === 0);
    assert(r.transactions[0].balance === 950.01);
  });

  // Indian format 1 (Transaction Date, Narration, Withdrawal, Deposit, Balance)
  test('Indian CSV (Transaction Date,Narration,Withdrawal,Deposit,Balance)', () => {
    const csv = 'Transaction Date,Narration,Withdrawal,Deposit,Balance\n05/01/2024,AMAZON PURCHASE,49.99,0,950.01\n06/01/2024,SALARY DEPOSIT,0,2500.00,3450.01';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].description === 'AMAZON PURCHASE');
    assert(r.transactions[0].debit === 49.99);
    assert(r.skippedLines.length === 0, `Expected 0 skipped, got ${r.skippedLines.length}`);
  });

  // Indian format 2 (Date, Particulars, Debit, Credit, Balance)
  test('Indian CSV (Date,Particulars,Debit,Credit,Balance)', () => {
    const csv = 'Date,Particulars,Debit,Credit,Balance\n05-01-2024,AMAZON PURCHASE,49.99,0,950.01';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 1, `Expected 1, got ${r.transactions.length}`);
    assert(r.transactions[0].description === 'AMAZON PURCHASE');
  });

  // Single amount column with Dr/Cr
  test('CSV with single Amount column (Dr/Cr)', () => {
    const csv = 'Date,Description,Amount,Balance\n05/01/2024,Amazon Purchase,49.99 Dr,950.01';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 1, `Expected 1, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 49.99, `Expected debit 49.99, got ${r.transactions[0].debit}`);
    assert(r.transactions[0].credit === 0);
  });

  // Skip header row
  test('CSV skips header/summary rows', () => {
    const csv = 'Date,Description,Debit,Credit,Balance\nOPENING BALANCE,,\n2024-01-05,Amazon Purchase,49.99,0,950.01\nCLOSING BALANCE,,\n';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 1, `Expected 1, got ${r.transactions.length}`);
  });

  console.log('\n=== Text/PDF Line Parse Tests ===');
  // 5-col text
  test('5-col text (Date Desc Debit Credit Balance)', () => {
    const lines = ['05/01/2024 AMAZON PURCHASE 49.99 0 950.01', '06/01/2024 SALARY DEPOSIT 0 2500.00 3450.01'];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 49.99);
    assert(r.transactions[1].credit === 2500.00);
  });

  // 4-col with Dr/Cr
  test('4-col with Dr/Cr notation', () => {
    const lines = ['05/01/2024 AMAZON PURCHASE 49.99 Dr 950.01', '06/01/2024 SALARY CREDIT 2500.00 Cr 3450.01'];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 49.99, `Expected debit 49.99, got ${r.transactions[0].debit}`);
    assert(r.transactions[1].credit === 2500.00, `Expected credit 2500, got ${r.transactions[1].credit}`);
  });

  // 4-col plain
  test('4-col plain (Date Desc Amount Balance)', () => {
    const lines = ['05/01/2024 AMAZON PURCHASE 49.99 950.01', '06/01/2024 SALARY 2500.00 3450.01'];
    const r = parseLines(lines);
    assert(r.transactions.length === 2);
  });

  // 3-col
  test('3-col (Date Desc Amount)', () => {
    const lines = ['05/01/2024 AMAZON PURCHASE 49.99', '06/01/2024 SALARY 2500.00'];
    const r = parseLines(lines);
    assert(r.transactions.length === 2);
  });

  // Multi-line description
  test('Multi-line description aggregation', () => {
    const lines = [
      '05/01/2024 AMAZON PURCHASE',
      'ONLINE PAYMENT - REF 12345',
      '49.99 0 950.01',
      '06/01/2024 SALARY DEPOSIT 0 2500.00 3450.01'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    // First txn should have aggregated description
    assert(r.transactions[0].description.includes('AMAZON PURCHASE'), `Expected description to contain AMAZON, got: ${r.transactions[0].description}`);
  });

  // Skip headers
  test('Skip page headers and footers', () => {
    const lines = [
      'PAGE 1 OF 5',
      'ACCOUNT STATEMENT - SAVINGS',
      'ACCOUNT NO: 123456789',
      '05/01/2024 AMAZON PURCHASE 49.99 0 950.01',
      '06/01/2024 SALARY DEPOSIT 0 2500.00 3450.01'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
  });

  console.log('\n=== parseStatement (main entry) Tests ===');
  test('parseStatement with CSV buffer', async () => {
    const buf = Buffer.from('Date,Description,Debit,Credit,Balance\n2024-01-05,Amazon Purchase,49.99,0,950.01');
    const r = await parseStatement(buf, 'text/csv');
    assert(r.transactions.length === 1, `Expected 1, got ${r.transactions.length}`);
    assert(r.totalRows === 1);
  });

  test('parseStatement with empty buffer throws', async () => {
    try {
      await parseStatement(Buffer.alloc(0), 'text/csv');
      assert(false, 'Should have thrown');
    } catch (e) {
      assert(e.message.includes('Empty buffer'));
    }
  });

  test('parseStatement with unsupported type throws', async () => {
    try {
      await parseStatement(Buffer.from('test'), 'text/plain');
      assert(false, 'Should have thrown');
    } catch (e) {
      assert(e.message.includes('Unsupported file type'));
    }
  });

  // Test the test_ph3_statement.csv
  test('Sample test_ph3_statement.csv from uploads', () => {
    const csv = 'Date,Description,Debit,Credit,Balance\n2024-01-05,Amazon Purchase,49.99,0,950.01\n2024-01-06,Salary Deposit,0,2500.00,3450.01\n2024-01-07,Netflix Subscription,15.99,0,3434.02\n2024-01-08,Grocery Store,120.50,0,3313.52\n2024-01-09,Refund from Store,0,25.00,3338.52\n2024-01-10,Electric Bill,85.00,0,3253.52\n2024-01-11,Freelance Payment,0,500.00,3753.52\n2024-01-12,Restaurant Dinner,65.00,0,3688.52';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 8, `Expected 8, got ${r.transactions.length}`);
    assert(r.skippedLines.length === 0, `Expected 0 skipped, got ${r.skippedLines.length}`);
    // Check hash generation
    assert(r.transactions[0].transactionHash, 'Missing transactionHash');
    assert(r.transactions[0].transactionHash.length === 64, 'Invalid hash length');
    // Verify order preserved
    assert(r.transactions[0].description === 'Amazon Purchase');
    assert(r.transactions[7].description === 'Restaurant Dinner');
  });

  console.log(`\n========================================`);
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });

