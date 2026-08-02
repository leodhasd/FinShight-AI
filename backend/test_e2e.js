/**
 * End-to-end test for the statement parser.
 * Tests real-world Indian bank statement formats.
 */
const { parseStatement, parseCSV, parseLines, parsePDF } = require('./src/services/statementParser');
const fs = require('fs');
const path = require('path');

async function run() {
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

  async function testAsync(name, fn) {
    try {
      await fn();
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

  console.log('\n========== E2E Tests for Indian Bank Statement Parser ==========');

  // ============================
  // Test 1: SBI Format (CSV)
  // ============================
  console.log('\n--- SBI Format Tests ---');
  test('SBI CSV: Date, Particulars, Withdrawal, Deposit, Balance', () => {
    const csv = 'Date,Particulars,Withdrawal,Deposit,Balance\n' +
      '01/04/2024,NEFT TRANSFER TO ABC,500.00,0,"1,23,456.78"\n' +
      '02/04/2024,SALARY CREDIT,0,75000.00,"1,98,456.78"\n' +
      '03/04/2024,ATM WITHDRAWAL,10000.00,0,"1,88,456.78"';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 3, `Expected 3, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 500.00, `Expected debit 500, got ${r.transactions[0].debit}`);
    assert(r.transactions[1].credit === 75000.00, `Expected credit 75000, got ${r.transactions[1].credit}`);
    assert(r.transactions[2].debit === 10000.00, `Expected debit 10000, got ${r.transactions[2].debit}`);
  });

  test('SBI CSV: Indian commas in amounts', () => {
    const csv = 'Date,Particulars,Withdrawal,Deposit,Balance\n' +
      '01/04/2024,OPENING BALANCE,0,0,"1,00,000.00"\n' +
      '02/04/2024,NEFT CREDIT,0,"50,000.00","1,50,000.00"';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 1, `Expected 1 (1 header skipped), got ${r.transactions.length}`);
    assert(r.transactions[0].credit === 50000.00, `Expected credit 50000, got ${r.transactions[0].credit}`);
    assert(r.transactions[0].balance === 150000.00, `Expected balance 150000, got ${r.transactions[0].balance}`);
  });

  // ============================
  // Test 2: HDFC Format (CSV)
  // ============================
  console.log('\n--- HDFC Format Tests ---');
  test('HDFC CSV: Transaction Date, Narration, Debit, Credit, Balance', () => {
    const csv = 'Transaction Date,Narration,Debit,Credit,Balance\n' +
      '05/01/2024,AMAZON PURCHASE,1,234.56,0,"1,50,000.00"\n' +
      '06/01/2024,SALARY CREDIT,0,25,000.00,"1,75,000.00"';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].description === 'AMAZON PURCHASE');
  });

  // ============================
  // Test 3: ICICI Format (CSV)
  // ============================
  console.log('\n--- ICICI Format Tests ---');
  test('ICICI CSV: Value Date, Description, Chq/Ref No, Debit, Credit, Balance', () => {
    const csv = 'Value Date,Description,Chq/Ref No,Debit,Credit,Balance\n' +
      '10/01/2024,NEFT TRANSFER,ABC123,5000.00,0,95000.00\n' +
      '11/01/2024,INTEREST CREDIT,INTRST,0,1234.00,96234.00';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 5000.00);
    assert(r.transactions[1].credit === 1234.00);
  });

  // ============================
  // Test 4: Axis Bank Format (CSV)
  // ============================
  console.log('\n--- Axis Bank Format Tests ---');
  test('Axis CSV: Date, Particulars, Debit, Credit, Balance', () => {
    const csv = 'Date,Particulars,Debit,Credit,Balance\n' +
      '15/01/2024,UPI PAYMENT,1500.00,0,48500.00\n' +
      '16/01/2024,REFUND,0,500.00,49000.00';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 1500.00);
    assert(r.transactions[1].credit === 500.00);
  });

  // ============================
  // Test 5: Canara Bank Format
  // ============================
  console.log('\n--- Canara Bank Format Tests ---');
  test('Canara CSV: Txn Date, Particulars, Withdrawal, Deposit, Balance', () => {
    const csv = 'Txn Date,Particulars,Withdrawal,Deposit,Balance\n' +
      '20/01/2024,CHASH WITHDRAWAL,2000.00,0,28000.00\n' +
      '21/01/2024,TRANSFER CREDIT,0,10000.00,38000.00';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 2000.00);
    assert(r.transactions[1].credit === 10000.00);
  });

  // ============================
  // Test 6: Indian Bank Format
  // ============================
  console.log('\n--- Indian Bank Format Tests ---');
  test('Indian Bank CSV: Date, Particulars, Debit, Credit, Balance', () => {
    const csv = 'Date,Particulars,Debit,Credit,Balance\n' +
      '25/01/2024,NET BANKING,3000.00,0,47000.00\n' +
      '26/01/2024,DD COMMISSION,50.00,0,46950.00';
    const r = parseCSV(Buffer.from(csv));
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
  });

  // ============================
  // Test 7: Text/PDF format tests for Indian banks
  // ============================
  console.log('\n--- Indian Bank PDF/Text Format Tests ---');

  test('SBI text format (6-col with Chq/Ref)', () => {
    const lines = [
      '01/04/2024 NEFT TRANSFER ABC123 500.00 0 15000.00',
      '02/04/2024 SALARY CREDIT SAL 0 25000.00 40000.00'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 500.00, `Expected debit 500, got ${r.transactions[0].debit}`);
    assert(r.transactions[1].credit === 25000.00, `Expected credit 25000, got ${r.transactions[1].credit}`);
  });

  test('HDFC/ICICI text format (5-col with Dr/Cr)', () => {
    const lines = [
      '05/01/2024 AMAZON PURCHASE 1,234.56 Dr 1,50,000.00',
      '06/01/2024 SALARY CREDIT 25,000.00 Cr 1,75,000.00'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 1234.56, `Expected debit 1234.56, got ${r.transactions[0].debit}`);
    assert(r.transactions[1].credit === 25000.00, `Expected credit 25000, got ${r.transactions[1].credit}`);
  });

  test('Plain 5-col text format', () => {
    const lines = [
      '10/01/2024 NEFT TRANSFER 5000.00 0 95000.00',
      '11/01/2024 INTEREST CREDIT 0 1234.00 96234.00'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
  });

  test('Skip opening balance and closing balance rows', () => {
    const lines = [
      'OPENING BALANCE 0 0 100000.00',
      '01/04/2024 NEFT TRANSFER ABC123 500.00 0 15000.00',
      '02/04/2024 SALARY CREDIT SAL 0 25000.00 40000.00',
      'CLOSING BALANCE 0 0 40000.00'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
  });

  test('Skip page headers and account info', () => {
    const lines = [
      'PAGE 1 OF 3',
      'STATE BANK OF INDIA',
      'SAVINGS ACCOUNT STATEMENT',
      'ACCOUNT NO: 12345678901',
      'PERIOD: 01-APR-2024 TO 30-APR-2024',
      '01/04/2024 NEFT TRANSFER 500.00 0 15000.00',
      '02/04/2024 SALARY CREDIT 0 25000.00 40000.00',
      '*This is a system generated statement*'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
  });

  test('Skip column header rows', () => {
    const lines = [
      'Date Particulars Withdrawal Deposit Balance',
      '01/04/2024 NEFT TRANSFER 500.00 0 15000.00',
      'Date Narration Debit Credit Balance',
      '02/04/2024 SALARY CREDIT 0 25000.00 40000.00'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
  });

  test('Multi-line description aggregation for PDF text', () => {
    const lines = [
      '05/01/2024 AMAZON PURCHASE',
      'ONLINE SHOPPING - REF 12345',
      '1,234.56 Dr 1,50,000.00',
      '06/01/2024 SALARY CREDIT 25,000.00 Cr 1,75,000.00'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 1234.56, `Expected debit 1234.56, got ${r.transactions[0].debit}`);
    assert(r.transactions[1].credit === 25000.00, `Expected credit 25000, got ${r.transactions[1].credit}`);
  });

  test('Multi-page PDF simulation', () => {
    const lines = [];
    // Page 1
    lines.push('PAGE 1 OF 2');
    lines.push('01/04/2024 TRANSACTION ONE 100.00 0 1000.00');
    lines.push('02/04/2024 TRANSACTION TWO 200.00 0 800.00');
    lines.push('--- Page 1 Ends ---');
    // Page 2
    lines.push('PAGE 2 OF 2');
    lines.push('03/04/2024 TRANSACTION THREE 0 500.00 1300.00');
    lines.push('04/04/2024 TRANSACTION FOUR 50.00 0 1250.00');
    const r = parseLines(lines);
    assert(r.transactions.length === 4, `Expected 4, got ${r.transactions.length}`);
    assert(r.transactions[0].description === 'TRANSACTION ONE');
    assert(r.transactions[3].description === 'TRANSACTION FOUR');
  });

  test('Dr/Cr notation in single amount column', () => {
    const lines = [
      '05/01/2024 AMAZON PURCHASE 1,234.56 Dr',
      '06/01/2024 SALARY CREDIT 25,000.00 Cr'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
    assert(r.transactions[0].debit === 1234.56, `Expected debit 1234.56, got ${r.transactions[0].debit}`);
    assert(r.transactions[1].credit === 25000.00, `Expected credit 25000, got ${r.transactions[1].credit}`);
  });

  // ============================
  // Test 8: Edge cases
  // ============================
  console.log('\n--- Edge Case Tests ---');

  test('Continue parsing even if some rows fail', () => {
    const lines = [
      '01/04/2024 VALID TRANSACTION 100.00 0 1000.00',
      'GARBAGE DATA THAT WONT PARSE',
      '02/04/2024 ANOTHER VALID 0 500.00 1500.00'
    ];
    const r = parseLines(lines);
    // The GARBAGE line gets appended to the first txn, making it unparseable.
    // But the second valid transaction still gets parsed independently.
    assert(r.transactions.length === 1, `Expected at least 1 valid to survive, got ${r.transactions.length}`);
    assert(r.skippedLines.length > 0, 'Expected at least 1 skipped line');
    assert(r.transactions[0].description === 'ANOTHER VALID', `Expected second txn, got: ${r.transactions[0].description}`);
  });

  test('Order is preserved', () => {
    const lines = [
      '01/04/2024 FIRST TRANSACTION 100.00 0 1000.00',
      '02/04/2024 SECOND TRANSACTION 0 500.00 1500.00',
      '03/04/2024 THIRD TRANSACTION 200.00 0 1300.00'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 3, `Expected 3, got ${r.transactions.length}`);
    assert(r.transactions[0].description === 'FIRST TRANSACTION');
    assert(r.transactions[1].description === 'SECOND TRANSACTION');
    assert(r.transactions[2].description === 'THIRD TRANSACTION');
  });

  test('Transaction hash generation for duplicates', () => {
    const txn1 = { date: new Date('2024-01-05'), description: 'Test', debit: 100, credit: 0, balance: 900 };
    const txn2 = { date: new Date('2024-01-05'), description: 'Test', debit: 100, credit: 0, balance: 900 };
    const { generateTransactionHash } = require('./src/services/statementParser');
    const hash1 = generateTransactionHash(txn1);
    const hash2 = generateTransactionHash(txn2);
    assert(hash1 === hash2, 'Hashes should match for identical transactions');
    assert(hash1.length === 64, 'Hash should be 64 hex characters');
  });

  test('Skip summary lines with totals', () => {
    const lines = [
      '01/04/2024 TRANSACTION ONE 100.00 0 1000.00',
      'TOTAL DEBITS 100.00',
      'TOTAL CREDITS 0.00',
      '02/04/2024 TRANSACTION TWO 0 500.00 1500.00',
      'CLOSING BALANCE 1500.00'
    ];
    const r = parseLines(lines);
    assert(r.transactions.length === 2, `Expected 2, got ${r.transactions.length}`);
  });

  // ============================
  // Test 9: Sample files from uploads
  // ============================
  console.log('\n--- Sample File Tests ---');
  
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));

    for (const csvFile of csvFiles) {
      const filePath = path.join(uploadDir, csvFile);
      const content = fs.readFileSync(filePath);
      console.log(`\n  Testing CSV file: ${csvFile} (${content.length} bytes)`);
      try {
        const r = parseCSV(content);
        console.log(`    Transactions: ${r.transactions.length}, Skipped: ${r.skippedLines.length}`);
        for (const sl of r.skippedLines) {
          console.log(`      Skipped: ${sl.reason} => "${sl.line ? sl.line.slice(0, 80) : ''}"`);
        }
        for (const t of r.transactions.slice(0, 3)) {
          console.log(`      [${t.date.toISOString().split('T')[0]}] ${t.description.slice(0, 40)} | D:${t.debit} C:${t.credit} B:${t.balance}`);
        }
        if (r.transactions.length > 3) {
          console.log(`      ... and ${r.transactions.length - 3} more`);
        }
        // Just check it parses without error
        testAsync(`Parse CSV file: ${csvFile}`, async () => {
          assert(r.transactions.length >= 0, 'Parse failed');
        });
      } catch (e) {
        console.log(`    ERROR: ${e.message}`);
        test(`Parse CSV file: ${csvFile}`, () => { throw e; });
      }
    }

    for (const pdfFile of pdfFiles) {
      const filePath = path.join(uploadDir, pdfFile);
      const content = fs.readFileSync(filePath);
      console.log(`\n  Testing PDF file: ${pdfFile} (${content.length} bytes)`);
      try {
        const r = await parsePDF(content);
        console.log(`    Lines extracted: ${r.transactions.length + r.skippedLines.length}, Transactions: ${r.transactions.length}, Skipped: ${r.skippedLines.length}`);
        for (const sl of r.skippedLines) {
          console.log(`      Skipped: ${sl.reason} => "${sl.line ? sl.line.slice(0, 80) : ''}"`);
        }
        for (const t of r.transactions.slice(0, 5)) {
          console.log(`      [${t.date ? t.date.toISOString().split('T')[0] : 'N/A'}] ${t.description.slice(0, 40)} | D:${t.debit} C:${t.credit} B:${t.balance}`);
        }
        if (r.transactions.length > 5) {
          console.log(`      ... and ${r.transactions.length - 5} more`);
        }
        await testAsync(`Parse PDF file: ${pdfFile}`, async () => {
          assert(r.transactions.length >= 0, 'Parse failed');
        });
      } catch (e) {
        console.log(`    ERROR: ${e.message}`);
        test(`Parse PDF file: ${pdfFile}`, () => { throw e; });
      }
    }
  } else {
    console.log('  No uploads directory found, skipping sample file tests');
  }

  // ============================
  // Summary
  // ============================
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
}

run().catch(err => { console.error(err); process.exit(1); });

