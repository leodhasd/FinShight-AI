/**
 * AI Financial Health Score — pure, deterministic scoring module.
 *
 * Computes a 0–100 Financial Health Score from the EXISTING AI Insights
 * payload (`summary.ai` from GET /api/statements/:id/ai-insights). No backend
 * changes, no external AI API, no random values. Every score and every
 * recommendation is derived ONLY from real transaction + analytics data.
 *
 * Weighted factors:
 *   - Savings rate                     → 35%
 *   - Income vs Expense ratio          → 25%
 *   - Monthly spending consistency     → 20%
 *   - Cash flow                        → 20%
 */

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampPct(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function formatINR(value) {
  const n = Math.round(toNum(value));
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(n).toLocaleString('en-IN')}`;
}

function formatMonthLabel(key) {
  if (!key) return null;
  const [y, m] = String(key).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const name = months[Number(m) - 1];
  return name ? `${name} ${String(y).slice(2)}` : key;
}

/**
 * Linear interpolation between two (x, y) points.
 * Used to make factor scores smooth rather than stepwise.
 */
function lerp(x0, y0, x1, y1, x) {
  if (x <= x0) return y0;
  if (x >= x1) return y1;
  const t = (x - x0) / (x1 - x0);
  return y0 + (y1 - y0) * t;
}

function sortedBreakdown(ai) {
  return (Array.isArray(ai.monthlyBreakdown) ? ai.monthlyBreakdown : [])
    .slice()
    .sort((a, b) => (String(a.month) < String(b.month) ? -1 : 1));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) * (v - m), 0) / values.length);
}

// ---------------------------------------------------------------------------
// Factor scorers (each returns 0–100)
// ---------------------------------------------------------------------------

/**
 * Savings rate score.
 * >=30% → 100 · 20% → 80 · 10% → 60 · 0% → 40 · negative → 15
 */
function savingsRateScore(ai) {
  const rate = toNum(ai.savingsRate);
  if (rate >= 30) return lerp(30, 100, 50, 100, rate);
  if (rate >= 20) return lerp(20, 80, 30, 100, rate);
  if (rate >= 10) return lerp(10, 60, 20, 80, rate);
  if (rate >= 0) return lerp(0, 40, 10, 60, rate);
  return Math.max(0, lerp(-20, 15, 0, 40, rate));
}

/**
 * Income vs Expense ratio score.
 * ratio = income / expense. Higher ratio = healthier.
 */
function incomeExpenseScore(ai) {
  const income = toNum(ai.totalIncome);
  const expense = toNum(ai.totalExpense);

  // No activity → neutral.
  if (income <= 0 && expense <= 0) return 70;
  // No expenses → perfect ratio.
  if (expense <= 0) return 100;

  const ratio = income / expense;
  if (ratio >= 2) return lerp(2, 100, 4, 100, ratio);
  if (ratio >= 1.5) return lerp(1.5, 85, 2, 100, ratio);
  if (ratio >= 1.2) return lerp(1.2, 70, 1.5, 85, ratio);
  if (ratio >= 1.0) return lerp(1.0, 55, 1.2, 70, ratio);
  if (ratio >= 0.8) return lerp(0.8, 35, 1.0, 55, ratio);
  return Math.max(0, lerp(0, 15, 0.8, 35, ratio));
}

/**
 * Monthly spending consistency score.
 * Based on the coefficient of variation of monthly expenses.
 * Lower variability → higher score (more predictable cash flow).
 */
function spendingConsistencyScore(ai) {
  const breakdown = sortedBreakdown(ai).filter((m) => toNum(m.expense) > 0);
  if (breakdown.length < 2) {
    // Not enough months to measure consistency → neutral.
    return 70;
  }
  const expenses = breakdown.map((m) => toNum(m.expense));
  const avg = mean(expenses);
  if (avg <= 0) return 70;
  const cv = (stdDev(expenses) / avg) * 100; // coefficient of variation %

  if (cv <= 10) return lerp(10, 100, 15, 90, cv);
  if (cv <= 25) return lerp(15, 90, 25, 70, cv);
  if (cv <= 40) return lerp(25, 70, 40, 45, cv);
  if (cv <= 60) return lerp(40, 45, 60, 25, cv);
  return Math.max(0, lerp(60, 25, 100, 10, cv));
}

/**
 * Cash flow score.
 * Positive net cash flow relative to income → healthier.
 */
function cashFlowScore(ai) {
  const income = toNum(ai.totalIncome);
  const net = toNum(ai.cashFlowSummary?.netCashFlow ?? ai.totalSavings);

  if (income <= 0) {
    return net >= 0 ? 60 : 35;
  }
  const ratio = net / income; // e.g. 0.25 = saved 25% of income

  if (ratio >= 0.2) return lerp(0.2, 100, 0.5, 100, ratio);
  if (ratio >= 0) return lerp(0, 80, 0.2, 100, ratio);
  if (ratio >= -0.2) return lerp(-0.2, 40, 0, 80, ratio);
  return Math.max(0, lerp(-1, 10, -0.2, 40, ratio));
}

// ---------------------------------------------------------------------------
// Status / tone mapping
// ---------------------------------------------------------------------------

/**
 * Map a 0–100 score to a status label and colour palette.
 * Statuses: Excellent / Good / Average / Needs Improvement
 */
function getScoreTone(score) {
  const s = clampPct(score);
  if (s >= 80) {
    return {
      key: 'excellent',
      label: 'Excellent',
      text: 'text-emerald-300',
      bar: 'bg-emerald-500',
      dot: 'bg-emerald-400',
      stroke: '#34d399',
      chip: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    };
  }
  if (s >= 65) {
    return {
      key: 'good',
      label: 'Good',
      text: 'text-sky-300',
      bar: 'bg-sky-500',
      dot: 'bg-sky-400',
      stroke: '#38bdf8',
      chip: 'border-sky-500/30 bg-sky-500/15 text-sky-300'
    };
  }
  if (s >= 50) {
    return {
      key: 'average',
      label: 'Average',
      text: 'text-amber-300',
      bar: 'bg-amber-500',
      dot: 'bg-amber-400',
      stroke: '#f59e0b',
      chip: 'border-amber-500/30 bg-amber-500/15 text-amber-300'
    };
  }
  return {
    key: 'needs-improvement',
    label: 'Needs Improvement',
    text: 'text-rose-300',
    bar: 'bg-rose-500',
    dot: 'bg-rose-400',
    stroke: '#fb7185',
    chip: 'border-rose-500/30 bg-rose-500/15 text-rose-300'
  };
}

// ---------------------------------------------------------------------------
// Main score computation
// ---------------------------------------------------------------------------

const WEIGHTS = {
  savingsRate: 0.35,
  incomeExpense: 0.25,
  consistency: 0.2,
  cashFlow: 0.2
};

/**
 * Compute the full health-score payload from an AI insights object.
 *
 * @param {Object} ai - `summary.ai` from GET /api/statements/:id/ai-insights
 * @returns {Object} { score, status, tone, factors, recommendations }
 */
function computeHealthScore(ai) {
  const data = ai && typeof ai === 'object' ? ai : {};

  const factors = [
    {
      key: 'savingsRate',
      label: 'Savings Rate',
      weight: WEIGHTS.savingsRate,
      value: toNum(data.savingsRate),
      display: `${toNum(data.savingsRate).toFixed(1)}%`,
      score: Math.round(savingsRateScore(data)),
      hint: 'Higher is better · target ≥ 20%'
    },
    {
      key: 'incomeExpense',
      label: 'Income vs Expense',
      weight: WEIGHTS.incomeExpense,
      value: toNum(data.totalIncome),
      display: `${formatINR(toNum(data.totalIncome))} / ${formatINR(toNum(data.totalExpense))}`,
      score: Math.round(incomeExpenseScore(data)),
      hint: 'Earn more than you spend'
    },
    {
      key: 'consistency',
      label: 'Spending Consistency',
      weight: WEIGHTS.consistency,
      value: null,
      display: null,
      score: Math.round(spendingConsistencyScore(data)),
      hint: 'Lower monthly variation is better'
    },
    {
      key: 'cashFlow',
      label: 'Cash Flow',
      weight: WEIGHTS.cashFlow,
      value: toNum(data.cashFlowSummary?.netCashFlow ?? data.totalSavings),
      display: formatINR(toNum(data.cashFlowSummary?.netCashFlow ?? data.totalSavings)),
      score: Math.round(cashFlowScore(data)),
      hint: 'Positive net cash flow'
    }
  ];

  let score = 0;
  for (const f of factors) {
    score += f.score * f.weight;
  }
  score = Math.round(clampPct(score));

  const tone = getScoreTone(score);
  const recommendations = buildRecommendations(data, score, factors, tone);

  return {
    score,
    status: tone.label,
    tone,
    factors,
    recommendations
  };
}

// ---------------------------------------------------------------------------
// Recommendation generation (data-driven, 3–5 items)
// ---------------------------------------------------------------------------

/**
 * Build 3–5 personalised AI recommendations from the analytics payload.
 * Every recommendation references real numbers derived from the statement.
 */
function buildRecommendations(ai, score, factors, tone) {
  const recs = [];
  const push = (text, type = 'info') => recs.push({ text, type });
  const has = (text) => recs.some((r) => r.text === text);

  const totalIncome = toNum(ai.totalIncome);
  const totalExpense = toNum(ai.totalExpense);
  const totalSavings = toNum(ai.totalSavings);
  const savingsRate = toNum(ai.savingsRate);
  const netCashFlow = toNum(ai.cashFlowSummary?.netCashFlow ?? ai.totalSavings);
  const avgMonthlySpending = toNum(ai.averageMonthlySpending);
  const highestExpenseCategory = ai.highestExpenseCategory || null;
  const highestExpenseAmount = toNum(ai.highestExpenseAmount);
  const atmRatio = toNum(ai.atmExpenseRatio);
  const atmTotal = toNum(ai.atmWithdrawalTotal);
  const topCategories = Array.isArray(ai.topExpenseCategories) ? ai.topExpenseCategories : [];
  const categoryShares = ai.categoryExpenseShares || {};

  // Month-over-month trend (requires >= 2 active months)
  const breakdown = sortedBreakdown(ai);
  const latestMonth = breakdown[breakdown.length - 1] || null;
  const prevMonth = breakdown.length >= 2 ? breakdown[breakdown.length - 2] : null;
  const latestLabel = latestMonth ? formatMonthLabel(latestMonth.month) : null;

  const savingsFactor = factors.find((f) => f.key === 'savingsRate') || null;
  const cashFactor = factors.find((f) => f.key === 'cashFlow') || null;

  // --- 1. Savings-rate guidance (always data-driven) ---
  if (totalIncome > 0 && savingsRate < 20) {
    if (!has('increase-savings')) {
      push(
        savingsRate < 0
          ? `You spent more than you earned this period (${formatINR(Math.abs(totalSavings))} deficit). Increase monthly savings by building a strict budget before the next pay cycle.`
          : `Your savings rate is ${savingsRate.toFixed(1)}%. Increase monthly savings to reach the recommended 20% target for a stronger financial cushion.`,
        'action'
      );
    }
  } else if (savingsRate >= 20 && totalIncome > 0) {
    if (!has('good-savings')) {
      push(
        `Your savings rate of ${savingsRate.toFixed(1)}% is healthy. Consider automating a fixed monthly transfer to investments to grow your wealth further.`,
        'positive'
      );
    }
  }

  // --- 2. Highest expense category (e.g. Reduce Food expenses) ---
  if (highestExpenseCategory && highestExpenseCategory !== 'None' && highestExpenseAmount > 0 && totalExpense > 0) {
    const share = ((highestExpenseAmount / totalExpense) * 100).toFixed(1);
    if (highestExpenseCategory === 'Food') {
      if (!has('reduce-food')) {
        push(
          `Reduce Food expenses. "${highestExpenseCategory}" is your top spending category at ${formatINR(highestExpenseAmount)} (${share}% of total expenses) — try meal prepping and limiting restaurant orders to save significantly.`,
          'action'
        );
      }
    } else if (highestExpenseCategory === 'Shopping' || highestExpenseCategory === 'Entertainment') {
      if (!has('reduce-discretionary')) {
        push(
          `Reduce ${highestExpenseCategory} expenses. You spent ${formatINR(highestExpenseAmount)} (${share}% of total expenses) in this category — apply a 24-hour rule before non-essential purchases.`,
          'action'
        );
      }
    } else if (highestExpenseCategory === 'ATM' || highestExpenseCategory === 'ATM / Cash Withdrawal') {
      if (!has('reduce-atm')) {
        push(
          `Switch to digital payments. ATM / cash withdrawals made up ${atmRatio.toFixed(1)}% of your spending (${formatINR(atmTotal)}) — using UPI or cards helps track spending automatically.`,
          'action'
        );
      }
    } else if (highestExpenseCategory === 'Bills') {
      if (!has('reduce-bills')) {
        push(
          `Reduce Bills & Utilities. You spent ${formatINR(highestExpenseAmount)} (${share}% of total expenses) here — compare plans, unplug unused devices, and negotiate with providers to lower costs.`,
          'action'
        );
      }
    } else if (highestExpenseCategory === 'EMI') {
      const emiShare = totalIncome > 0 ? ((categoryShares.EMI || 0) / totalIncome) * 100 : 0;
      if (!has('emi-advice')) {
        push(
          emiShare >= 30
            ? `EMI payments consume ${emiShare.toFixed(1)}% of your income — consider loan restructuring or prepayment to reduce the monthly burden.`
            : `Your largest expense category is "${highestExpenseCategory}" at ${formatINR(highestExpenseAmount)}. Keep an eye on it so it does not cross 30% of your income.`,
          'action'
        );
      }
    } else {
      if (!has('top-category-action')) {
        push(
          `Your highest expense category is "${highestExpenseCategory}" at ${formatINR(highestExpenseAmount)} (${share}% of total expenses). Review these expenses for cost-cutting opportunities.`,
          'action'
        );
      }
    }
  }

  // --- 3. Cash flow / emergency fund ---
  const emergencyTarget = avgMonthlySpending * 3;
  if (totalIncome > 0 && totalSavings > 0 && emergencyTarget > 0 && totalSavings >= emergencyTarget) {
    if (!has('emergency-healthy')) {
      push(
        `Emergency fund is healthy. Your savings (${formatINR(totalSavings)}) cover at least 3 months of average spending (${formatINR(avgMonthlySpending)}/month).`,
        'positive'
      );
    }
  } else if (totalIncome > 0) {
    if (!has('emergency-build')) {
      const monthsCovered = avgMonthlySpending > 0 ? totalSavings / avgMonthlySpending : 0;
      push(
        monthsCovered > 0 && monthsCovered < 1
          ? `Your current savings cover less than one month of expenses. Build an emergency fund of at least 3× your average monthly spending (${formatINR(emergencyTarget)}).`
          : `Build an emergency fund covering at least 3 months of expenses (target ${formatINR(emergencyTarget)}). Start by setting aside a small amount every month.`,
        'action'
      );
    }
  }

  // --- 4. Cash flow warning ---
  if (netCashFlow < 0) {
    if (!has('negative-cashflow')) {
      push(
        `Your net cash flow is negative (${formatINR(Math.abs(netCashFlow))} overspent this period). Trim discretionary expenses to bring spending back below income.`,
        'action'
      );
    }
  }

  // --- 5. Spending trend (improving / worsening) ---
  if (prevMonth && latestMonth) {
    const prevExpense = toNum(prevMonth.expense);
    const latestExpense = toNum(latestMonth.expense);
    if (prevExpense > 0 && latestExpense > 0) {
      const deltaPct = ((latestExpense - prevExpense) / prevExpense) * 100;
      if (deltaPct <= -5) {
        if (!has('trend-improving')) {
          push(
            `Spending trend is improving. Your expenses dropped ${Math.abs(deltaPct).toFixed(1)}% in ${latestLabel} compared to the previous month. Keep this momentum going.`,
            'positive'
          );
        }
      } else if (deltaPct >= 5) {
        if (!has('trend-worsening')) {
          push(
            `Your spending rose ${deltaPct.toFixed(1)}% in ${latestLabel} compared to last month. Identify which category grew the most and set a limit for next month.`,
            'action'
          );
        }
      }
    }
  }

  // --- 6. ATM / cash-heavy behaviour ---
  if (atmRatio >= 30 && atmTotal > 0 && totalExpense > 0) {
    if (!has('atm-digital')) {
      push(
        `ATM withdrawals are ${atmRatio.toFixed(1)}% of your spending (${formatINR(atmTotal)}). Prefer UPI or cards to track cash expenses automatically.`,
        'action'
      );
    }
  }

  // --- 7. Discretionary spending concentration ---
  if (totalExpense > 0) {
    const discretionary = topCategories
      .filter((c) => ['Entertainment', 'Shopping', 'Food'].includes(c.category))
      .reduce((sum, c) => sum + toNum(c.amount), 0);
    const discretionaryPct = (discretionary / totalExpense) * 100;
    if (discretionaryPct >= 30 && !has('reduce-discretionary') && !has('reduce-food')) {
      push(
        `Discretionary spending on Food, Shopping & Entertainment is ${discretionaryPct.toFixed(1)}% of your total expenses. Reducing it can free up meaningful savings each month.`,
        'action'
      );
    }
  }

  // --- 8. High overall score → reinforcing message ---
  if (score >= 80) {
    if (!has('excellent-overall')) {
      push(
        `Excellent financial health! Your score of ${score}/100 reflects strong savings discipline, stable cash flow, and controlled spending. Keep it up.`,
        'positive'
      );
    }
  } else if (score < 50) {
    if (!has('needs-work')) {
      push(
        `Your financial health score of ${score}/100 needs improvement. Focus on the lowest-scoring factors above — small monthly changes compound quickly.`,
        'action'
      );
    }
  }

  // --- 9. Fallbacks to guarantee 3–5 recommendations ---
  if (savingsFactor && savingsFactor.score >= 80 && !recs.some((r) => r.type === 'positive')) {
    push(
      `Your savings rate score is strong (${savingsFactor.score}/100). Continue prioritising automated savings to maintain this discipline.`,
      'positive'
    );
  }
  if (cashFactor && cashFactor.score < 50 && !has('cashflow-monitor')) {
    push(
      `Keep a close watch on your cash flow this month. Track income and expenses weekly to avoid a negative balance.`,
      'action'
    );
  }
  if (totalIncome > 0 && totalExpense > 0 && totalExpense <= totalIncome && !has('budget-positive')) {
    push(
      `You are spending within your means. Set up an automatic transfer to savings right after payday to grow your buffer consistently.`,
      'positive'
    );
  }

  // Trim to a maximum of 5 recommendations (keep the most relevant ones).
  return recs.slice(0, 5);
}

export {
  computeHealthScore,
  getScoreTone,
  savingsRateScore,
  incomeExpenseScore,
  spendingConsistencyScore,
  cashFlowScore,
  formatINR,
  formatMonthLabel,
  WEIGHTS
};

