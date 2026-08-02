const { parseLines } = require('./src/services/statementParser');

const lines = [
  '02/07/2026 ATM Withdrawal 2000.00 48000.00',
  '03/07/2026 Salary Credit 35000.00 83000.00',
  '04/07/2026 Grocery Store 1500.00 81500.00',
  '05/07/2026 Interest Earned 500.00 82000.00'
];

const r = parseLines(lines);
console.log('Transactions found:', r.transactions.length);
console.log('Skipped:', r.skippedLines.length);

r.transactions.forEach((t, i) => {
  console.log(`[${i}] ${t.description} | Debit: ${t.debit} | Credit: ${t.credit} | Balance: ${t.balance}`);
});

// Check expected results
let allOk = true;
const expected = [
  { desc: 'ATM Withdrawal', debit: 2000, credit: 0 },
  { desc: 'Salary Credit', debit: 0, credit: 35000 },
  { desc: 'Grocery Store', debit: 1500, credit: 0 },
  { desc: 'Interest Earned', debit: 0, credit: 500 }
];

expected.forEach((exp, i) => {
  const t = r.transactions[i];
  if (!t) { console.log(`FAIL: Missing transaction ${i}`); allOk = false; return; }
  if (!t.description.includes(exp.desc)) {
    console.log(`FAIL[${i}]: Expected desc containing "${exp.desc}", got "${t.description}"`);
    allOk = false;
  }
  if (t.debit !== exp.debit) {
    console.log(`FAIL[${i}]: Expected debit ${exp.debit}, got ${t.debit}`);
    allOk = false;
  }
  if (t.credit !== exp.credit) {
    console.log(`FAIL[${i}]: Expected credit ${exp.credit}, got ${t.credit}`);
    allOk = false;
  }
});

if (allOk) {
  console.log('\nALL CLASSIFICATION TESTS PASSED!');
} else {
  console.log('\nSOME TESTS FAILED');
  process.exit(1);
}

