/**
 * Test suite for AI Financial Insights calculations.
 *
 * Verifies the pure function `computeFinancialMetrics` from
 * `./src/services/aiInsightsService` computes ALL required insights correctly:
 *
 *   1. Total income
 *   2. Total expenses
 *   3. Monthly savings
 *   4. Highest spending category
 *   5. Highest income source
 *   6. Biggest transaction
 *   7. Average daily spending
 *   8. Average monthly spending
 *   9. Cash flow summary
 *   10. Savings percentage
 *
 * Also verifies edge cases (empty list, negative cash flow).
 */
const { computeFinancialMetrics } = require('./src/services/aiInsightsService');

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

function assertNear(actual, expected, tolerance, msg) {
  const diff = Math.abs(actual - expected);
  if (diff > (tolerance || 0.011)) {
    throw new Error(`${msg || 'Value mismatch'}: expected ${expected}, got ${actual} (diff ${diff})`);
  }
}

// ---------------------------------------------------------------------------
// Test data
//
// Dates:
//   Jan 1, 2025  -> Salary credit ₹50,000 (Salary)
//   Jan 5, 2025  -> Swiggy debit ₹500 (Food)
//   Jan 10, 2025 -> Rent debit ₹15,000 (Bills - rent keyword)
//   Jan 15, 2025 -> Interest credit ₹1,000 (Transfer - interest)
//   Jan 20, 2025 -> Zomato debit ₹800 (Food)
//   Jan 25, 2025 -> Amazon debit ₹2,500 (Shopping)
//   Feb 1, 2025  -> Salary credit ₹50,000 (Salary)
//   Feb 3, 2025  -> Flipkart debit ₹3,000 (Shopping)
//   Feb 10, 2025 -> Electricity bill debit ₹1,200 (Bills)
//
// Expected:
//   totalIncome   = 50000 + 1000 + 50000 = ₹101,000
//   totalExpense  = 500 + 15000 + 800 + 2500 + 3000 + 1200 = ₹23,000
//   totalSavings  = 101000 - 23000 = ₹78,000
//   savingsRate   = 78000 / 101000 * 100 = 77.2277... → 77.23
//   highest expense category = Bills (rent 15,000 + electricity 1,200 = ₹16,200)
//                              [Food = 500 + 800 = ₹1,300, Shopping = 2,500 + 3,000 = ₹5,500]
//   highest income source    = Salary (50,000 + 50,000 = ₹100,000, 2 credits)
//   biggest transaction      = Salary credit ₹50,000
//   Unique days: Jan(1,5,10,15,20,25) + Feb(1,3,10) = 9 days
//   averageDailySpending = 23000 / 9 = 2555.555... → 2555.56
//   Distinct months: Jan, Feb = 2
//   averageMonthlySpending = 23000 / 2 = ₹11,500
//   monthlySavings: Jan savings = (50000+1000) - (500+15000+800+2500) = 51000 - 18800 = 32,200
//                  Feb savings = 50000 - (3000+1200) = 50000 - 4200 = 45,800
//                  avg = (32200 + 45800) / 2 = 78000 / 2 = ₹39,000
// ---------------------------------------------------------------------------
const transactions = [
  { date: new Date('2025-01-01'), description: 'SALARY CREDIT JAN 2025', debit: 0, credit: 50000 },
  { date: new Date('2025-01-05'), description: 'SWIGGY ORDER #12345', debit: 500, credit: 0 },
  { date: new Date('2025-01-10'), description: 'RENT PAYMENT', debit: 15000, credit: 0 },
  { date: new Date('2025-01-15'), description: 'INTEREST CREDITED', debit: 0, credit: 1000 },
  { date: new Date('2025-01-20'), description: 'ZOMATO FOOD DELIVERY', debit: 800, credit: 0 },
  { date: new Date('2025-01-25'), description: 'AMAZON PAYMENTS INDIA', debit: 2500, credit: 0 },
  { date: new Date('2025-02-01'), description: 'SALARY CREDIT FEB 2025', debit: 0, credit: 50000 },
  { date: new Date('2025-02-03'), description: 'FLIPKART ONLINE SHOPPING', debit: 3000, credit: 0 },
  { date: new Date('2025-02-10'), description: 'ELECTRICITY BILL PAYMENT', debit: 1200, credit: 0 }
];

console.log('\n========== AI Insights Calculation Tests ==========\n');

// --- 1. Total income ---
test('Total income', () => {
  const m = computeFinancialMetrics(transactions);
  assertNear(m.totalIncome, 101000, 0.01, 'totalIncome');
});

// --- 2. Total expenses ---
test('Total expenses', () => {
  const m = computeFinancialMetrics(transactions);
  assertNear(m.totalExpense, 23000, 0.01, 'totalExpense');
});

// --- 3. Monthly savings ---
test('Monthly savings (average per active month)', () => {
  const m = computeFinancialMetrics(transactions);
  assertNear(m.monthlySavings, 39000, 0.01, 'monthlySavings');
});

test('Monthly savings breakdown has 2 months with correct values', () => {
  const m = computeFinancialMetrics(transactions);
  assert(m.monthlyBreakdown.length === 2, `Expected 2 months, got ${m.monthlyBreakdown.length}`);
  const jan = m.monthlyBreakdown.find((x) => x.month === '2025-01');
  const feb = m.monthlyBreakdown.find((x) => x.month === '2025-02');
  assert(jan, 'January breakdown missing');
  assert(feb, 'February breakdown missing');
  assertNear(jan.savings, 32200, 0.01, 'Jan savings');
  assertNear(feb.savings, 45800, 0.01, 'Feb savings');
});

// --- 4. Highest spending category ---
test('Highest spending category', () => {
  const m = computeFinancialMetrics(transactions);
  assert(m.highestExpenseCategory === 'Bills', `Expected Bills, got ${m.highestExpenseCategory}`);
  assertNear(m.highestExpenseAmount, 16200, 0.01, 'highestExpenseAmount');
});

// --- 5. Highest income source ---
test('Highest income source', () => {
  const m = computeFinancialMetrics(transactions);
  assert(m.highestIncomeSource === 'Salary', `Expected Salary, got ${m.highestIncomeSource}`);
  assertNear(m.highestIncomeAmount, 100000, 0.01, 'highestIncomeAmount');
  assert(m.highestIncomeCount === 2, `Expected 2 credits, got ${m.highestIncomeCount}`);
});

// --- 6. Biggest transaction ---
test('Biggest transaction', () => {
  const m = computeFinancialMetrics(transactions);
  assert(m.biggestTransaction.amount === 50000, `Expected 50000, got ${m.biggestTransaction.amount}`);
  assert(m.biggestTransaction.type === 'credit', `Expected credit, got ${m.biggestTransaction.type}`);
  assert(m.biggestTransaction.description.includes('SALARY'), `Expected salary description, got ${m.biggestTransaction.description}`);
});

// --- 7. Average daily spending ---
test('Average daily spending', () => {
  const m = computeFinancialMetrics(transactions);
  assertNear(m.averageDailySpending, 2555.56, 0.01, 'averageDailySpending');
});

// --- 8. Average monthly spending ---
test('Average monthly spending', () => {
  const m = computeFinancialMetrics(transactions);
  assertNear(m.averageMonthlySpending, 11500, 0.01, 'averageMonthlySpending');
});

// --- 9. Cash flow summary ---
test('Cash flow summary (positive)', () => {
  const m = computeFinancialMetrics(transactions);
  const cf = m.cashFlowSummary;
  assert(cf, 'cashFlowSummary missing');
  assertNear(cf.totalInflow, 101000, 0.01, 'totalInflow');
  assertNear(cf.totalOutflow, 23000, 0.01, 'totalOutflow');
  assertNear(cf.netCashFlow, 78000, 0.01, 'netCashFlow');
  assert(cf.daysSpan === 41, `Expected 41-day span, got ${cf.daysSpan}`);
  assert(cf.monthsSpan === 2, `Expected 2 months, got ${cf.monthsSpan}`);
  assert(typeof cf.text === 'string' && cf.text.length > 0, 'cash flow text should be a non-empty string');
});

// --- 10. Savings percentage ---
test('Savings percentage', () => {
  const m = computeFinancialMetrics(transactions);
  assertNear(m.savingsRate, 77.23, 0.01, 'savingsRate');
});

// --- Derived values consistency ---
test('Total savings = income - expense', () => {
  const m = computeFinancialMetrics(transactions);
  assertNear(m.totalSavings, m.totalIncome - m.totalExpense, 0.01, 'totalSavings consistency');
});

test('Transaction count', () => {
  const m = computeFinancialMetrics(transactions);
  assert(m.transactionCount === 9, `Expected 9, got ${m.transactionCount}`);
  assert(m.creditCount === 3, `Expected 3 credits, got ${m.creditCount}`);
  assert(m.debitCount === 6, `Expected 6 debits, got ${m.debitCount}`);
});

// --- Edge cases ---
test('Empty list returns zeroed metrics', () => {
  const m = computeFinancialMetrics([]);
  assert(m.totalIncome === 0, 'totalIncome should be 0');
  assert(m.totalExpense === 0, 'totalExpense should be 0');
  assert(m.totalSavings === 0, 'totalSavings should be 0');
  assert(m.savingsRate === 0, 'savingsRate should be 0');
  assert(m.monthlySavings === 0, 'monthlySavings should be 0');
  assert(m.averageDailySpending === 0, 'averageDailySpending should be 0');
  assert(m.averageMonthlySpending === 0, 'averageMonthlySpending should be 0');
  assert(m.highestExpenseCategory === 'None', 'highestExpenseCategory should be None');
  assert(m.highestIncomeSource === 'N/A', 'highestIncomeSource should be N/A');
  assert(m.biggestTransaction.amount === 0, 'biggestTransaction.amount should be 0');
  assert(m.monthlyBreakdown.length === 0, 'monthlyBreakdown should be empty');
  assert(m.cashFlowSummary.netCashFlow === 0, 'cash flow net should be 0');
});

test('Negative cash flow (expenses > income)', () => {
  const negTxns = [
    { date: new Date('2025-03-01'), description: 'SHOPPING SPREE', debit: 20000, credit: 0 },
    { date: new Date('2025-03-02'), description: 'FREELANCE PAYMENT', debit: 0, credit: 5000 }
  ];
  const m = computeFinancialMetrics(negTxns);
  assertNear(m.totalSavings, -15000, 0.01, 'negative totalSavings');
  assertNear(m.cashFlowSummary.netCashFlow, -15000, 0.01, 'negative netCashFlow');
  assert(m.cashFlowSummary.text.includes('negative'), 'cash flow text should mention negative');
});

test('Missing dates do not crash and skip day/month aggregation', () => {
  const noDateTxns = [
    { description: 'NO DATE TXN', debit: 100, credit: 0 },
    { description: 'ANOTHER', debit: 0, credit: 50 }
  ];
  const m = computeFinancialMetrics(noDateTxns);
  assertNear(m.totalExpense, 100, 0.01, 'totalExpense');
  assertNear(m.totalIncome, 50, 0.01, 'totalIncome');
  assert(m.monthlyBreakdown.length === 0, 'monthlyBreakdown should be empty for missing dates');
  assert(m.averageDailySpending === 0, 'avg daily spending should be 0');
  assert(m.averageMonthlySpending === 0, 'avg monthly spending should be 0');
});

// --- Summary ---
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

