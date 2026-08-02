/**
 * Canara Bank ePassbook PDF parser tests.
 *
 * Verifies:
 * - Account holder name, account number, opening balance, closing balance
 * - Every transaction is parsed with date, description, debit/credit, balance
 * - Multi-line UPI descriptions are merged into a single transaction
 * - Footer / disclaimer / page-number lines are ignored
 *
 * Uses a synthetic text fixture (mirroring the exact Canara ePassbook layout)
 * plus the real uploaded Canara PDF for end-to-end verification.
 */
const path = require('path');
const fs = require('fs');
const { parseStatement, parsePDF, parseCanaraLines } = require('./src/services/statementParser');

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

function assertDate(txn, expectedISO) {
  const iso = txn.date.toISOString().split('T')[0];
  assert(iso === expectedISO, `Expected date ${expectedISO}, got ${iso} (desc: ${txn.description.slice(0, 40)})`);
}

/**
 * Synthetic fixture replicating the exact Canara ePassbook line layout.
 * Note: the UPI narration wraps across many lines, and only the populated
 * amount column plus balance is rendered on the amount line.
 */
const CANARA_FIXTURE = [
  'Statement for A/c XXXXXXXX3254 between 29-Jul-2026 and 30-Jul-2026',
  'Customer Id XXXXXXX78',
  'Name SAKTHIVEL BALAN S',
  'Phone +919342743348',
  'Address 10 6 SRI PALANIMURUG',
  'CHINNATHIRUPATHI CHINNATIRUPATHY SALE',
  'SALEM TAMIL NADU',
  'Branch Code 5044',
  'Branch Name SALEM HASTHAMPATTY',
  'IFSC Code CNRB0005044',
  'Address #42/5, Govindasamy Street, Itteri',
  'Road, Hasthampatty, SALEM TAMIL NADU',
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
  '29-07-2026',
  'UPI/CR/657664348409/GEETHA',
  'S/CNRB/**END77@OKAXIS/UPI',
  '//AXI1FB56E5A47884BFFA31A3',
  '7A69C2FECAA/29/07/2026',
  '13:21:44',
  'Chq: 657664348409',
  '50.00 272.22',
  '29-07-2026',
  'UPI/DR/657619538288/HOTEL',
  'ARYA/IDIB/**00198@INDIANBK/',
  'UPI//AXI00644D03199345DB966',
  '0CE8E135263F2/29/07/2026',
  '13:22:14',
  'Chq: 657619538288',
  '60.00 212.22',
  'page 1',
  '-- 1 of 3 --',
  'DISCLAIMER',
  'UNLESS THE CONSTITUENT BRINGS TO THE NOTICE OF THE BANK ANY DISCREPANCY',
  '/ERRORS /OMMISSION /UNAUTHORISED DEBITS IMMEDIATELY, THE ENTRIES IN SUCH',
  'PASS SHEET SHALL BE DEEMED AS CORRECT AND SHALL BIND THE CONSTITUENT FOR',
  'Date Particulars Deposits Withdrawals Balance',
  '29-07-2026',
  'UPI/CR/657653865800/DHARSH',
  'AN',
  '/SBIN/**72606@OKAXIS/UPI//A',
  'XI612F5CE26B68479CB5F95CE',
  'A6992A862/29/07/2026 14:24:12',
  'Chq: 657653865800',
  '20.00 232.22',
  '29-07-2026',
  'UPI/DR/657647164589/HOTEL',
  'ARYA/IDIB/**00198@INDIANBK/',
  'UPI//ICI1C91CF9A0E934CB7B0',
  '96A4ECAAC8807D/29/07/2026',
  '14:25:00',
  'Chq: 657647164589',
  '20.00 212.22',
  '29-07-2026',
  'UPI/DR/657620057514/S',
  'GANAPAT/YESB/**23530@YBL/',
  'UPI//AXI7EF3CA4CBE054DDFA',
  '0C2339DE6DD2DC1/29/07/2026',
  '14:46:41',
  'Chq: 657620057514',
  '36.00 176.22',
  '29-07-2026',
  'UPI/CR/657697769795/GEETHA',
  'S/CNRB/**END77@OKAXIS/UPI',
  '//AXICF334A3DDCA240C4B4C0',
  '9D6FDA8D7536/29/07/2026',
  '18:30:04',
  'Chq: 657697769795',
  '150.00 326.22',
  '30-07-2026',
  'UPI/DR/621127437992/HOTEL',
  'ARYA/IDIB/**00198@INDIANBK/',
  'UPI//AXI2D9B2AE4B4A9477CB5',
  'AABE83BBFBDCE4/30/07/2026',
  '13:41:03',
  'Chq: 621127437992',
  '15.00 311.22',
  '30-07-2026',
  'UPI/DR/621160774277/MURUG',
  'AN',
  'T/YESB/**YEJUP@PTYS/UPI//A',
  'XI6CEB223FC5F24BC6BF1C86',
  '3D06439DB4/30/07/2026',
  '18:27:33',
  'Chq: 621160774277',
  '170.00 141.22',
  'Closing Balance 141.22',
  'page 2',
  '-- 2 of 3 --',
  'ALL PURPOSES AND INTENTS',
  'BEWARE OF PHISHING ATTACKS THROUGH EMAILS OR FAKE WEBSITE',
  'IMB USERS ARE REQUESTED TO NOTE THAT CANARA BANK DOES NOT SEEK',
  'ANYINFORMATION THROUGH EMAIL.DO NOT CLICK ON ANY LINK WHICH HAS',
  'COMETHROUGH EMAIL FROM UNEXPECTED SOURCES.IT MAY CONTAIN MALICIOUS',
  'CODE OR COULD BE AN ATTEMPT TO "PHISH".ALWAYSLOGIN THROUGH',
  'www.canarabank.com PLEASEBEWARE OF PHISHING',
  'CHANGE IN THE ADDRESS OF ACCOUNT HOLDER/PA HOLDER, IF ANY,MAY PLEASE BE',
  'INFORMED TO THE BRANCH ALONG WITH ADDRESS',
  'DO NOT SHARE ATM PIN NUMBER, ACCOUNT DETAILS, OTP TO OUTSIDERS,',
  'EMAILS ETC',
  'Details of Ombudsman:',
  'The Banking Ombudsman C/o. RBI,',
  '10/3/8 Nrupatunga Road',
  'Bangalore-560001',
  'E-mail: bobangalore@rbi.org.in',
  'ARE YOU A MERCHANT / TRADER / RETAILER / SMALL VENDOR. USE DIGITAL PAYMENT',
  'CHANNEL TO RECEIVE PAYMENT FROM YOUR CUSTOMERS.CONTACT BRANCH',
  'COMPUTER OUTPUT- DOES NOT REQUIRE SIGNATURE',
  '------------------------------ END OF STATEMENT ---------------------------------',
  'page 3',
  '-- 3 of 3 --'
];

async function run() {
  console.log('\n========== Canara Bank ePassbook Parser Tests ==========');

  // ============================================================
  // Synthetic fixture tests
  // ============================================================
  console.log('\n--- Synthetic Fixture Tests ---');

  test('Detect Canara format and parse metadata', () => {
    const r = parseCanaraLines(CANARA_FIXTURE);
    assert(r, 'parseCanaraLines returned null');
    assert(r.metadata.accountHolderName === 'SAKTHIVEL BALAN S', `Got holder: ${r.metadata.accountHolderName}`);
    assert(r.metadata.accountNumber === 'XXXXXXXX3254', `Got account: ${r.metadata.accountNumber}`);
    assert(r.metadata.openingBalance === 249.22, `Got opening: ${r.metadata.openingBalance}`);
    assert(r.metadata.closingBalance === 141.22, `Got closing: ${r.metadata.closingBalance}`);
  });

  test('Parses all 10 transactions', () => {
    const r = parseCanaraLines(CANARA_FIXTURE);
    assert(r.transactions.length === 10, `Expected 10, got ${r.transactions.length}`);
  });

  test('Merges wrapped UPI descriptions into single description', () => {
    const r = parseCanaraLines(CANARA_FIXTURE);
    const t0 = r.transactions[0];
    assert(t0.description.includes('UPI/CR/211900588070/KIRUBH'), `Desc missing UPI/CR header: ${t0.description}`);
    assert(t0.description.includes('ASH/IOBA/**35280@PTYES/SE'), `Desc missing wrapped line: ${t0.description}`);
    assert(t0.description.includes('Chq: 211900588070'), `Desc missing Chq ref: ${t0.description}`);
    assert(!/page\s+\d|DISCLAIMER|--\s*\d+\s+of\s+\d+\s*--/i.test(t0.description), 'Footer leaked into description');
  });

  test('Correct dates for all transactions', () => {
    const r = parseCanaraLines(CANARA_FIXTURE);
    const expectedDates = [
      '2026-07-29','2026-07-29','2026-07-29','2026-07-29',
      '2026-07-29','2026-07-29','2026-07-29','2026-07-29',
      '2026-07-30','2026-07-30'
    ];
    r.transactions.forEach((t, i) => assertDate(t, expectedDates[i]));
  });

  test('Credit transactions classified correctly (UPI/CR)', () => {
    const r = parseCanaraLines(CANARA_FIXTURE);
    // txn 0: UPI/CR 3.00 -> balance 252.22 (credit)
    assert(r.transactions[0].credit === 3.00, `Expected credit 3, got credit=${r.transactions[0].credit} debit=${r.transactions[0].debit}`);
    assert(r.transactions[0].debit === 0, `Expected debit 0, got ${r.transactions[0].debit}`);
    assert(r.transactions[0].balance === 252.22, `Expected balance 252.22, got ${r.transactions[0].balance}`);

    // txn 2: UPI/CR 50.00 -> balance 272.22 (credit)
    assert(r.transactions[2].credit === 50.00, `Expected credit 50, got credit=${r.transactions[2].credit} debit=${r.transactions[2].debit}`);
    assert(r.transactions[2].balance === 272.22, `Expected balance 272.22, got ${r.transactions[2].balance}`);
  });

  test('Debit transactions classified correctly (UPI/DR)', () => {
    const r = parseCanaraLines(CANARA_FIXTURE);
    // txn 1: UPI/DR 30.00 -> balance 222.22 (debit)
    assert(r.transactions[1].debit === 30.00, `Expected debit 30, got debit=${r.transactions[1].debit} credit=${r.transactions[1].credit}`);
    assert(r.transactions[1].credit === 0, `Expected credit 0, got ${r.transactions[1].credit}`);
    assert(r.transactions[1].balance === 222.22, `Expected balance 222.22, got ${r.transactions[1].balance}`);

    // txn 3: UPI/DR 60.00 -> balance 212.22 (debit)
    assert(r.transactions[3].debit === 60.00, `Expected debit 60, got debit=${r.transactions[3].debit}`);
    assert(r.transactions[3].balance === 212.22, `Expected balance 212.22, got ${r.transactions[3].balance}`);
  });

  test('Last transaction balance equals closing balance', () => {
    const r = parseCanaraLines(CANARA_FIXTURE);
    const last = r.transactions[9];
    assert(last.balance === 141.22, `Expected 141.22, got ${last.balance}`);
    assert(last.debit === 170.00, `Expected debit 170, got debit=${last.debit} credit=${last.credit}`);
  });

  test('Footer/disclaimer/page lines are ignored', () => {
    const r = parseCanaraLines(CANARA_FIXTURE);
    const allText = r.transactions.map(t => t.description).join(' ');
    assert(!/DISCLAIMER|Ombudsman|PHISHING|END OF STATEMENT/i.test(allText), 'Footer/disclaimer leaked into transactions');
    assert(!r.transactions.some(t => /^\s*page\s+\d+\s*$/i.test(t.description)), 'Page footer leaked');
  });

  test('Transaction hashes are generated', () => {
    const r = parseCanaraLines(CANARA_FIXTURE);
    r.transactions.forEach((t, i) => {
      assert(t.transactionHash && t.transactionHash.length === 64, `Missing hash for txn ${i}`);
    });
  });

  // ============================================================
  // Real uploaded PDF end-to-end tests
  // ============================================================
  console.log('\n--- Real Uploaded Canara PDF Tests ---');

  const uploadDir = path.join(__dirname, 'uploads');
  let canaraFile = null;
  if (fs.existsSync(uploadDir)) {
    canaraFile = fs.readdirSync(uploadDir).find(f => /canara/i.test(f));
  }

  testAsync('Uploaded Canara PDF exists', async () => {
    assert(canaraFile, 'No Canara PDF found in backend/uploads');
  });

  if (canaraFile) {
    const filePath = path.join(uploadDir, canaraFile);
    const buffer = fs.readFileSync(filePath);

    testAsync('parsePDF extracts all 10 transactions with metadata', async () => {
      const r = await parsePDF(buffer);
      assert(r.transactions.length === 10, `Expected 10 transactions, got ${r.transactions.length}`);
      assert(r.metadata, 'metadata missing');
      assert(r.metadata.accountHolderName === 'SAKTHIVEL BALAN S', `Got holder: ${r.metadata.accountHolderName}`);
      assert(r.metadata.accountNumber === 'XXXXXXXX3254', `Got account: ${r.metadata.accountNumber}`);
      assert(r.metadata.openingBalance === 249.22, `Got opening: ${r.metadata.openingBalance}`);
      assert(r.metadata.closingBalance === 141.22, `Got closing: ${r.metadata.closingBalance}`);
    });

    testAsync('parseStatement end-to-end (mimics controller)', async () => {
      const r = await parseStatement(buffer, 'application/pdf');
      assert(r.transactions.length === 10, `Expected 10 transactions, got ${r.transactions.length}`);
      assert(r.totalRows >= 10, `Expected totalRows >= 10, got ${r.totalRows}`);
      assert(r.metadata && r.metadata.accountHolderName === 'SAKTHIVEL BALAN S', 'metadata not propagated through parseStatement');

      // Validate debit/credit per transaction against the PDF
      const expectations = [
        { date: '2026-07-29', credit: 3.00, debit: 0, balance: 252.22 },
        { date: '2026-07-29', credit: 0, debit: 30.00, balance: 222.22 },
        { date: '2026-07-29', credit: 50.00, debit: 0, balance: 272.22 },
        { date: '2026-07-29', credit: 0, debit: 60.00, balance: 212.22 },
        { date: '2026-07-29', credit: 20.00, debit: 0, balance: 232.22 },
        { date: '2026-07-29', credit: 0, debit: 20.00, balance: 212.22 },
        { date: '2026-07-29', credit: 0, debit: 36.00, balance: 176.22 },
        { date: '2026-07-29', credit: 150.00, debit: 0, balance: 326.22 },
        { date: '2026-07-30', credit: 0, debit: 15.00, balance: 311.22 },
        { date: '2026-07-30', credit: 0, debit: 170.00, balance: 141.22 }
      ];
      r.transactions.forEach((t, i) => {
        const e = expectations[i];
        assertDate(t, e.date);
        assert(Math.abs(t.credit - e.credit) < 0.001, `Txn ${i}: expected credit ${e.credit}, got ${t.credit}`);
        assert(Math.abs(t.debit - e.debit) < 0.001, `Txn ${i}: expected debit ${e.debit}, got ${t.debit}`);
        assert(Math.abs(t.balance - e.balance) < 0.001, `Txn ${i}: expected balance ${e.balance}, got ${t.balance}`);
      });

      // Ensure no footer/disclaimer leakage
      const allText = r.transactions.map(t => t.description).join(' ');
      assert(!/DISCLAIMER|Ombudsman|END OF STATEMENT/i.test(allText), 'Footer/disclaimer leaked');
    });
  } else {
    console.log('  [SKIP] No Canara PDF found in backend/uploads - skipping real-file tests');
  }

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
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

