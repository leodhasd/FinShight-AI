/**
 * Test suite for AI Recommendations generation.
 *
 * Verifies `generateAiRecommendations` (and the metrics it needs) from
 * `./src/services/aiInsightsService` produces ONLY data-driven recommendations
 * based on actual transaction data.
 */
const {
  computeFinancialMetrics,
  generateAiRecommendations
} = require('./src/services/aiInsightsService');

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

function assertContains(list, substr, msg) {
  assert(
    Array.isArray(list) && list.some((s) => s.includes(substr)),
    msg || `Expected a recommendation containing "${substr}", got: ${JSON.stringify(list)}`
  );
}

// ---------------------------------------------------------------------------
// Dataset 1: Two months with rising expenses, rising UPI spend, low savings,
// and EMI consuming a large share of income.
// ---------------------------------------------------------------------------
const txnsRising = [
  // Month 1 (Jan 2025)
  { date: new Date('2025-01-01'), description: 'SALARY CREDIT JAN 2025', debit: 0, credit: 60000 },
  { date: new Date('2025-01-05'), description: 'UPI/DR/2025.../SWIGGY ORDER', debit: 4000, credit: 0 },
  { date: new Date('2025-01-06'), description: 'UPI/DR/2025.../ZOMATO', debit: 3000, credit: 0 },
  { date: new Date('2025-01-10'), description: 'HOME LOAN EMI PAYMENT', debit: 18000, credit: 0 },
  { date: new Date('2025-01-12'), description: 'UPI/DR/2025.../AMAZON', debit: 5000, credit: 0 },
  { date: new Date('2025-01-15'), description: 'UPI/DR/2025.../BIG BAZAAR GROCERY', debit: 5000, credit: 0 },

  // Month 2 (Feb 2025)
  { date: new Date('2025-02-01'), description: 'SALARY CREDIT FEB 2025', debit: 0, credit: 65000 },
  { date: new Date('2025-02-05'), description: 'UPI/DR/2025.../SWIGGY ORDER', debit: 5000, credit: 0 },
  { date: new Date('2025-02-06'), description: 'UPI/DR/2025.../ZOMATO', debit: 5000, credit: 0 },
  { date: new Date('2025-02-10'), description: 'HOME LOAN EMI PAYMENT', debit: 18000, credit: 0 },
  { date: new Date('2025-02-12'), description: 'UPI/DR/2025.../AMAZON', debit: 8000, credit: 0 },
  { date: new Date('2025-02-15'), description: 'UPI/DR/2025.../BIG BAZAAR GROCERY', debit: 7000, credit: 0 },
  { date: new Date('2025-02-18'), description: 'UPI/DR/2025.../PVR CINEMAS', debit: 1500, credit: 0 }
];

// ---------------------------------------------------------------------------
// Dataset 2: Single month with heavy ATM cash withdrawals.
// ---------------------------------------------------------------------------
const txnsAtm = [
  { date: new Date('2025-03-01'), description: 'SALARY CREDIT', debit: 0, credit: 40000 },
  { date: new Date('2025-03-02'), description: 'ATM CASH WITHDRAWAL', debit: 15000, credit: 0 },
  { date: new Date('2025-03-03'), description: 'ATM CASH WITHDRAWAL', debit: 10000, credit: 0 },
  { date: new Date('2025-03-04'), description: 'UPI/DR GROCERY', debit: 3000, credit: 0 }
];

// ---------------------------------------------------------------------------
// Dataset 3: Empty list (edge case)
// ---------------------------------------------------------------------------

console.log('\n========== AI Recommendations Tests ==========\n');

// --- Dataset 1: Rising trend ---
test('Dataset 1: metrics compute with category shares & top categories', () => {
  const m = computeFinancialMetrics(txnsRising);
  assert(m.categoryExpenseShares && typeof m.categoryExpenseShares === 'object', 'categoryExpenseShares missing');
  assert(Array.isArray(m.topExpenseCategories) && m.topExpenseCategories.length > 0, 'topExpenseCategories missing');
  assert(m.transactionCount === 13, `Expected 13 transactions, got ${m.transactionCount}`);
});

test('Dataset 1: recommendation mentions category share', () => {
  const m = computeFinancialMetrics(txnsRising);
  const recs = generateAiRecommendations(m, txnsRising);
  assert(recs.some((r) => r.includes('% of your total expenses')), `Expected a share recommendation, got ${JSON.stringify(recs)}`);
});

test('Dataset 1: recommendation mentions worsening spending trend', () => {
  const m = computeFinancialMetrics(txnsRising);
  const recs = generateAiRecommendations(m, txnsRising);
  assertContains(recs, 'spending trend is worsening', 'worsening trend');
});

test('Dataset 1: recommendation mentions increased UPI spending', () => {
  const m = computeFinancialMetrics(txnsRising);
  const recs = generateAiRecommendations(m, txnsRising);
  assertContains(recs, 'UPI spending increased', 'UPI increased');
});

test('Dataset 1: recommendation mentions income increased', () => {
  const m = computeFinancialMetrics(txnsRising);
  const recs = generateAiRecommendations(m, txnsRising);
  assertContains(recs, 'income increased', 'income increased');
});

test('Dataset 1: recommendation mentions EMI consuming high % of income', () => {
  const m = computeFinancialMetrics(txnsRising);
  const recs = generateAiRecommendations(m, txnsRising);
  assertContains(recs, 'EMI payments consume', 'EMI share');
});

test('Dataset 1: no random/generic advice (every rec uses actual data)', () => {
  const m = computeFinancialMetrics(txnsRising);
  const recs = generateAiRecommendations(m, txnsRising);
  for (const r of recs) {
    assert(
      /\d/.test(r) || r.includes('stable') || r.includes('same') || r.includes('last month'),
      `Recommendation appears generic: "${r}"`
    );
  }
});

// --- Dataset 2: ATM-heavy ---
test('Dataset 2: ATM withdrawal recommendation', () => {
  const m = computeFinancialMetrics(txnsAtm);
  const recs = generateAiRecommendations(m, txnsAtm);
  assertContains(recs, 'ATM', 'ATM');
});

test('Dataset 2: ATM share >= 30% triggers digital payment advice', () => {
  const m = computeFinancialMetrics(txnsAtm);
  const recs = generateAiRecommendations(m, txnsAtm);
  assert(
    recs.some((r) => r.includes('ATM') && r.includes('Switch to UPI or cards')),
    `Expected ATM > 30% advice, got: ${JSON.stringify(recs)}`
  );
});

// --- Dataset 3: Empty ---
test('Dataset 3: empty transactions produce no recommendations', () => {
  const m = computeFinancialMetrics([]);
  const recs = generateAiRecommendations(m, []);
  assert(recs.length === 0, `Expected 0 recommendations, got ${recs.length}`);
});

// --- Dataset 1: Savings decreased month-over-month ---
test('Dataset 1: savings trend mentioned', () => {
  const m = computeFinancialMetrics(txnsRising);
  const recs = generateAiRecommendations(m, txnsRising);
  const savingsRec = recs.find((r) => r.includes('savings') && r.includes('compared to last month'));
  assert(savingsRec, `Expected a savings trend recommendation, got: ${JSON.stringify(recs)}`);
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

