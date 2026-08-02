/**
 * Unit tests for the AI Financial Health Score module.
 *
 * Verifies the pure functions in:
 *   ./src/components/FinancialHealthScore/healthScore.js
 *
 * Coverage:
 *   1. Weighted score composition (savings rate / income-expense / consistency / cash flow)
 *   2. Status mapping: Excellent / Good / Average / Needs Improvement
 *   3. Data-driven recommendations (3–5 items, personalised to the payload)
 *   4. Edge cases (empty payload, deficit spending)
 */
import {
  computeHealthScore,
  getScoreTone,
  savingsRateScore,
  incomeExpenseScore,
  spendingConsistencyScore,
  cashFlowScore
} from './src/components/FinancialHealthScore/healthScore.js';

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
  if (diff > (tolerance || 0.01)) {
    throw new Error(`${msg || 'Value mismatch'}: expected ${expected}, got ${actual} (diff ${diff})`);
  }
}

// ---------------------------------------------------------------------------
// Sample analytics payloads (shape mirrors GET /api/statements/:id/ai-insights)
// ---------------------------------------------------------------------------

// Healthy: high income, low expenses, stable 2 months, positive cash flow.
const healthyAi = {
  totalIncome: 100000,
  totalExpense: 45000,
  totalSavings: 55000,
  savingsRate: 55,
  averageMonthlySpending: 22500,
  highestExpenseCategory: 'Food',
  highestExpenseAmount: 12000,
  atmExpenseRatio: 5,
  atmWithdrawalTotal: 2000,
  categoryExpenseShares: { Food: 12000, Bills: 8000, Shopping: 10000, EMI: 9000 },
  topExpenseCategories: [
    { category: 'Food', amount: 12000 },
    { category: 'Shopping', amount: 10000 },
    { category: 'EMI', amount: 9000 },
    { category: 'Bills', amount: 8000 }
  ],
  cashFlowSummary: {
    netCashFlow: 55000,
    totalInflow: 100000,
    totalOutflow: 45000
  },
  monthlyBreakdown: [
    { month: '2025-01', income: 50000, expense: 23000, savings: 27000, count: 20 },
    { month: '2025-02', income: 50000, expense: 22000, savings: 28000, count: 18 }
  ]
};

// Unhealthy: deficit spending, low savings rate, heavy ATM usage.
const unhealthyAi = {
  totalIncome: 30000,
  totalExpense: 42000,
  totalSavings: -12000,
  savingsRate: -40,
  averageMonthlySpending: 42000,
  highestExpenseCategory: 'Food',
  highestExpenseAmount: 15000,
  atmExpenseRatio: 45,
  atmWithdrawalTotal: 19000,
  categoryExpenseShares: { Food: 15000, Shopping: 8000, 'ATM / Cash Withdrawal': 19000 },
  topExpenseCategories: [
    { category: 'Food', amount: 15000 },
    { category: 'ATM / Cash Withdrawal', amount: 19000 },
    { category: 'Shopping', amount: 8000 }
  ],
  cashFlowSummary: {
    netCashFlow: -12000,
    totalInflow: 30000,
    totalOutflow: 42000
  },
  monthlyBreakdown: [
    { month: '2025-01', income: 30000, expense: 42000, savings: -12000, count: 35 }
  ]
};

// ---------------------------------------------------------------------------
console.log('\n========== AI Financial Health Score Tests ==========\n');

// --- Factor scorers ---
test('savingsRateScore: healthy rate scores high', () => {
  assert(savingsRateScore({ savingsRate: 55 }) >= 95, `Expected >= 95, got ${savingsRateScore({ savingsRate: 55 })}`);
});

test('savingsRateScore: negative rate scores low', () => {
  assert(savingsRateScore({ savingsRate: -40 }) < 25, `Expected < 25, got ${savingsRateScore({ savingsRate: -40 })}`);
});

test('incomeExpenseScore: no expenses → perfect', () => {
  assert(incomeExpenseScore({ totalIncome: 50000, totalExpense: 0 }) === 100);
});

test('incomeExpenseScore: deficit → low', () => {
  assert(incomeExpenseScore({ totalIncome: 30000, totalExpense: 42000 }) < 40);
});

test('spendingConsistencyScore: stable spending scores high', () => {
  const ai = {
    monthlyBreakdown: [
      { month: '2025-01', expense: 20000 },
      { month: '2025-02', expense: 20500 },
      { month: '2025-03', expense: 19800 }
    ]
  };
  assert(spendingConsistencyScore(ai) >= 70, `Expected >= 70, got ${spendingConsistencyScore(ai)}`);
});

test('spendingConsistencyScore: volatile spending scores low', () => {
  const ai = {
    monthlyBreakdown: [
      { month: '2025-01', expense: 5000 },
      { month: '2025-02', expense: 60000 },
      { month: '2025-03', expense: 8000 }
    ]
  };
  assert(spendingConsistencyScore(ai) < 50, `Expected < 50, got ${spendingConsistencyScore(ai)}`);
});

test('cashFlowScore: positive cash flow scores high', () => {
  assert(cashFlowScore({ totalIncome: 100000, cashFlowSummary: { netCashFlow: 55000 } }) >= 95);
});

test('cashFlowScore: negative cash flow scores low', () => {
  assert(cashFlowScore({ totalIncome: 30000, cashFlowSummary: { netCashFlow: -12000 } }) < 60);
});

// --- Status mapping ---
test('getScoreTone: Excellent at >= 80', () => {
  assert(getScoreTone(90).label === 'Excellent');
});

test('getScoreTone: Good at 65–79', () => {
  assert(getScoreTone(72).label === 'Good');
});

test('getScoreTone: Average at 50–64', () => {
  assert(getScoreTone(58).label === 'Average');
});

test('getScoreTone: Needs Improvement below 50', () => {
  assert(getScoreTone(30).label === 'Needs Improvement');
});

// --- Full score computation ---
test('Healthy payload scores Excellent (>= 80)', () => {
  const result = computeHealthScore(healthyAi);
  assert(result.score >= 80, `Expected >= 80, got ${result.score}`);
  assert(result.status === 'Excellent', `Expected Excellent, got ${result.status}`);
});

test('Unhealthy payload scores Needs Improvement (< 50)', () => {
  const result = computeHealthScore(unhealthyAi);
  assert(result.score < 50, `Expected < 50, got ${result.score}`);
  assert(result.status === 'Needs Improvement', `Expected Needs Improvement, got ${result.status}`);
});

test('Score is clamped to 0–100', () => {
  const result = computeHealthScore({ ...healthyAi, savingsRate: 999 });
  assert(result.score <= 100, `Expected <= 100, got ${result.score}`);
  assert(result.score >= 0, `Expected >= 0, got ${result.score}`);
});

test('computeHealthScore returns 4 weighted factors', () => {
  const result = computeHealthScore(healthyAi);
  assert(result.factors.length === 4, `Expected 4 factors, got ${result.factors.length}`);
  const weightSum = result.factors.reduce((s, f) => s + f.weight, 0);
  assertNear(weightSum, 1, 0.001, 'weights should sum to 1');
});

test('Each factor returns score in 0–100', () => {
  const result = computeHealthScore(healthyAi);
  for (const f of result.factors) {
    assert(f.score >= 0 && f.score <= 100, `Factor ${f.key} out of range: ${f.score}`);
  }
});

// --- Recommendations ---
test('Healthy payload yields 3–5 recommendations', () => {
  const result = computeHealthScore(healthyAi);
  assert(result.recommendations.length >= 3, `Expected >= 3, got ${result.recommendations.length}`);
  assert(result.recommendations.length <= 5, `Expected <= 5, got ${result.recommendations.length}`);
});

test('Healthy payload mentions good savings / emergency fund', () => {
  const result = computeHealthScore(healthyAi);
  const joined = result.recommendations.map((r) => r.text).join(' ');
  assert(/savings rate of 55\.0% is healthy|Emergency fund is healthy/.test(joined) || /emergency fund/i.test(joined),
    `Expected a savings/emergency-fund rec, got: ${result.recommendations.map((r) => r.text).join(' | ')}`);
});

test('Healthy payload recommends money-forward actions', () => {
  const result = computeHealthScore(healthyAi);
  const joined = result.recommendations.map((r) => r.text).join(' ');
  assert(/Reduce Food expenses|automated|investments|transfer/i.test(joined),
    `Expected an actionable/positive rec, got: ${result.recommendations.map((r) => r.text).join(' | ')}`);
});

test('Unhealthy payload warns about deficit', () => {
  const result = computeHealthScore(unhealthyAi);
  const joined = result.recommendations.map((r) => r.text).join(' ');
  assert(/more than you earned|deficit|net cash flow is negative|overspent/i.test(joined),
    `Expected a deficit warning, got: ${result.recommendations.map((r) => r.text).join(' | ')}`);
});

test('Unhealthy payload recommends savings + digital payments', () => {
  const result = computeHealthScore(unhealthyAi);
  const joined = result.recommendations.map((r) => r.text).join(' ');
  assert(/Increase monthly savings|savings rate/.test(joined), `Expected savings rec, got: ${joined}`);
  assert(/UPI|digital payments|ATM|cash withdrawals/i.test(joined), `Expected ATM/digital rec, got: ${joined}`);
});

// --- Edge cases ---
test('Empty payload does not crash and returns a valid 0–100 score', () => {
  const result = computeHealthScore({});
  assert(result.score >= 0 && result.score <= 100, `Score out of range: ${result.score}`);
  assert(Array.isArray(result.recommendations), 'recommendations should be an array');
});

test('Null payload does not crash', () => {
  const result = computeHealthScore(null);
  assert(result.score >= 0 && result.score <= 100, `Score out of range: ${result.score}`);
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

