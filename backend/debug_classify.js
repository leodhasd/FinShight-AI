const { parseLines } = require('./src/services/statementParser');

// Direct test of classifyByDescription logic
const DEBIT_KEYWORDS = /\b(WITHDRAWAL|WITHDRAWN|DEBIT|DEBITED|PAID|PAYMENT|PURCHASE|SPENT|RECHARGE|BILL|FEE|CHARGES|ATM|SHOPPING|GROCERY|TRANSFER\s+OUT|DEBIT\s+CARD|FUEL|SWIPE|POS|EMI|TAX)\b/i;
const CREDIT_KEYWORDS = /\b(CREDIT|CREDITED|DEPOSIT|DEPOSITED|SALARY|INTEREST|REFUND|CASHBACK|REWARDS|TRANSFER\s+IN|NEFT\s+RECEIVED|RECEIVED|PAYMENT\s+RECEIVED|CREDIT\s+CARD\s+PAYMENT)\b/i;

function classifyByDescription(description, amount) {
  const desc = String(description || '').toUpperCase();
  const num = parseFloat(amount);
  
  console.log(`classifyByDescription: desc="${desc}", amount=${amount}, num=${num}`);
  
  if (num < 0) {
    console.log('  -> negative amount, debit');
    return { debit: Math.abs(num), credit: 0 };
  }
  
  const isDebit = DEBIT_KEYWORDS.test(desc);
  const isCredit = CREDIT_KEYWORDS.test(desc);
  console.log(`  -> isDebit=${isDebit}, isCredit=${isCredit}`);
  
  if (isDebit && !isCredit) {
    console.log('  -> keyword-based debit');
    return { debit: num, credit: 0 };
  }
  if (isCredit && !isDebit) {
    console.log('  -> keyword-based credit');
    return { debit: 0, credit: num };
  }
  
  console.log('  -> default credit');
  return { debit: 0, credit: num };
}

// Test individual cases
const tests = [
  { desc: 'ATM Withdrawal', amount: 2000, exp: { debit: 2000, credit: 0 } },
  { desc: 'Salary Credit', amount: 35000, exp: { debit: 0, credit: 35000 } },
  { desc: 'Grocery Store', amount: 1500, exp: { debit: 1500, credit: 0 } },
  { desc: 'Interest Earned', amount: 500, exp: { debit: 0, credit: 500 } },
];

console.log('=== Direct classifyByDescription tests ===');
tests.forEach(t => {
  const result = classifyByDescription(t.desc, t.amount);
  const ok = result.debit === t.exp.debit && result.credit === t.exp.credit;
  console.log(`${ok ? 'PASS' : 'FAIL'}: "${t.desc}" ${t.amount} => debit=${result.debit} credit=${result.credit} (expected debit=${t.exp.debit} credit=${t.exp.credit})`);
});

console.log('\n=== parseLines test ===');
const lines = [
  '02/07/2026 ATM Withdrawal 2000.00 48000.00',
  '03/07/2026 Salary Credit 35000.00 83000.00'
];
const r = parseLines(lines);
console.log('parseLines result:');
r.transactions.forEach((t, i) => {
  console.log(`[${i}] desc="${t.description}" debit=${t.debit} credit=${t.credit} balance=${t.balance}`);
});

