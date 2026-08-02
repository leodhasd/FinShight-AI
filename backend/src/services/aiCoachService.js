const mongoose = require('mongoose');
const { Transaction } = require('../models/Transaction');
const { categorizeTransaction } = require('./categoryService');
const { getAiInsights } = require('./aiInsightsService');

/**
 * AI Financial Coach Service
 * --------------------------
 * Answers personalized financial questions using ONLY the analytics data
 * already computed by the existing AI Insights service (aiInsightsService.js)
 * plus the raw transactions for a statement.
 *
 * Every answer is generated DYNAMICALLY from live data. There are no
 * hardcoded figures. This service does NOT duplicate analytics logic — it
 * consumes getAiInsights() as the single source of truth, and only adds the
 * coach-specific natural-language "answer" layer on top.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatINR(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(n).toLocaleString('en-IN')}`;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(key) {
  if (!key) return key;
  const [y, m] = String(key).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const name = months[Number(m) - 1];
  return name ? `${name} ${String(y).slice(2)}` : key;
}

function safeMax(arr, getter) {
  let best = null;
  for (const item of arr) {
    const v = getter(item);
    if (v === null || v === undefined) continue;
    if (best === null || v > best.value) best = { value: v, item };
  }
  return best;
}

function sentenceCase(str) {
  const s = String(str || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

/**
 * Detect the user's intent from a free-text question.
 * Returns { intent, params } where params may carry e.g. a savings target.
 */
function detectIntent(rawQuestion) {
  const q = String(rawQuestion || '').toLowerCase().trim();

  // --- Compare this month with last month ---
  if (
    /compare|comparison|vs|versus|difference/.test(q) &&
    /month/.test(q)
  ) {
    return { intent: 'compare-months', params: {} };
  }

  // --- Why did I spend more this month / why expenses increased ---
  if (
    /why/.test(q) &&
    /spend|spending|expense|expenses|increased|increase|more|up/.test(q)
  ) {
    return { intent: 'why-spend-more', params: {} };
  }

  // --- Which category has the highest expense / top category ---
  if (
    /which|what|highest|top|biggest|main|most/.test(q) &&
    /categor|spend|expense|money/.test(q)
  ) {
    return { intent: 'highest-category', params: {} };
  }

  // --- How can I save ₹X next month ---
  if (/save|saving|savings/.test(q)) {
    const moneyMatches = q.match(/₹\s?([\d,]+(?:\.\d+)?)|\b(\d{3,}(?:,\d{3})*|\d{4,})\b/g) || [];
    let amount = 0;
    for (const raw of moneyMatches) {
      const cleaned = raw.replace(/[₹\s,]/g, '');
      const val = Number(cleaned);
      if (Number.isFinite(val) && val > 0 && (val >= 500 || /next month|save/i.test(q))) {
        amount = val;
        break;
      }
    }
    // If the number doesn't look like a real target, leave amount as 0 so the
    // coach answers generically with the computed savings-rate guidance.
    return { intent: 'how-to-save', params: { target: amount } };
  }

  // --- Where is most of my money going ---
  if (
    /where|going|goes|spent|spending/.test(q) &&
    /money|income|salary/.test(q)
  ) {
    return { intent: 'money-going', params: {} };
  }

  // --- Give me financial advice / suggestions ---
  if (/advice|suggest|recommend|tip|tips|improve|improvement|better/.test(q)) {
    return { intent: 'advice', params: {} };
  }

  // --- Health / health score ---
  if (/health|score|healthy/.test(q)) {
    return { intent: 'health', params: {} };
  }

  // --- Income / salary questions ---
  if (/income|salary|earn|earning|credit|inflow/.test(q)) {
    return { intent: 'income', params: {} };
  }

  // --- Savings rate / total savings questions ---
  if (/savings|saved|save rate|rate of saving/.test(q)) {
    return { intent: 'savings', params: {} };
  }

  // --- Overview fallback ---
  return { intent: 'overview', params: {} };
}

// ---------------------------------------------------------------------------
// Coach-specific aggregation (NOT duplicating analytics — only computing
// month-over-month category deltas that the insights service does not expose)
// ---------------------------------------------------------------------------

/**
 * Compute per-month expense by category from raw transactions.
 * Uses the existing categorizeTransaction() helper (same rules as analytics).
 */
function computeMonthlyCategoryExpenses(transactions) {
  const map = {}; // "YYYY-MM" -> { category -> amount }
  const total = {}; // category -> total across statement

  for (const txn of transactions) {
    const debit = Number(txn.debit) || 0;
    if (debit <= 0) continue;
    const date = toDate(txn.date);
    if (!date) continue;

    const cat = txn.category || categorizeTransaction(txn.description) || 'Others';
    const mk = monthKey(date);

    if (!map[mk]) map[mk] = {};
    map[mk][cat] = (map[mk][cat] || 0) + debit;

    total[cat] = (total[cat] || 0) + debit;
  }

  return { monthly: map, total };
}

/**
 * Month-over-month category delta between the two latest months.
 * @returns {Array<{category, prev, latest, delta, pct, direction}>}
 */
function computeCategoryDeltas(transactions) {
  const { monthly } = computeMonthlyCategoryExpenses(transactions);
  const keys = Object.keys(monthly).sort();
  if (keys.length < 2) return [];

  const prevKey = keys[keys.length - 2];
  const latestKey = keys[keys.length - 1];
  const prevMonth = monthly[prevKey] || {};
  const latestMonth = monthly[latestKey] || {};

  const categories = new Set([...Object.keys(prevMonth), ...Object.keys(latestMonth)]);
  const deltas = [];

  for (const cat of categories) {
    const prev = prevMonth[cat] || 0;
    const latest = latestMonth[cat] || 0;
    const delta = latest - prev;
    if (Math.abs(delta) < 1) continue;
    const pct = prev > 0 ? (delta / prev) * 100 : 100;
    deltas.push({
      category: cat,
      prev: round2(prev),
      latest: round2(latest),
      delta: round2(delta),
      pct: round2(pct),
      direction: delta > 0 ? 'up' : 'down'
    });
  }

  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { deltas, prevKey, latestKey };
}

// ---------------------------------------------------------------------------
// Answer builders (all derived from live analytics payload + transactions)
// ---------------------------------------------------------------------------

function buildWhySpendMoreAnswer(insights, deltas) {
  const { deltas: changes, prevKey, latestKey } = deltas || {};
  const points = [];

  const latestExpense = insights.totalExpense || 0;
  points.push(`Your total expenses for this statement were ${formatINR(latestExpense)} across ${insights.transactionCount} transactions.`);

  if (changes && changes.length > 0) {
    const increases = changes.filter((c) => c.direction === 'up');
    const decreases = changes.filter((c) => c.direction === 'down');

    if (increases.length > 0) {
      const topIncrease = increases[0];
      points.push(
        `Compared with ${formatMonthLabel(prevKey)}, your spending went up by ${formatINR(Math.abs(topIncrease.delta))} ` +
        `(${topIncrease.pct.toFixed(1)}%) in "${topIncrease.category}" during ${formatMonthLabel(latestKey)}.`
      );
    }

    if (increases.length > 1) {
      const others = increases.slice(1, 3);
      points.push(
        `Other categories that increased: ${others.map((c) => `${c.category} (${formatINR(Math.abs(c.delta))})`).join(', ')}.`
      );
    }

    if (decreases.length > 0) {
      const topDecrease = decreases[0];
      points.push(
        `Partially offset by lower spending in "${topDecrease.category}" (${formatINR(Math.abs(topDecrease.delta))} less).`
      );
    }
  } else {
    points.push('I could not find a clear month-over-month increase because the statement spans only a single month or the changes were minimal.');
  }

  const answer =
    'Here is what I found from your data. The increase in spending is usually driven by a few specific categories — ' +
    'focusing on the ones that grew the most gives you the quickest way to bring expenses back down.';

  return { answer, points, intent: 'why-spend-more' };
}

function buildHighestCategoryAnswer(insights) {
  const cat = insights.highestExpenseCategory;
  const amount = insights.highestExpenseAmount || 0;
  const total = insights.totalExpense || 0;
  const points = [];

  if (!cat || cat === 'None' || cat === 'N/A' || amount <= 0) {
    return {
      answer: 'I do not see any expense categories in your data yet.',
      points: ['Upload and process a statement with debit transactions to see your top spending category.'],
      intent: 'highest-category'
    };
  }

  const share = total > 0 ? (amount / total) * 100 : 0;
  points.push(`Your highest expense category is "${cat}" with ${formatINR(amount)} spent.`);
  points.push(`That is ${share.toFixed(1)}% of your total expenses of ${formatINR(total)}.`);

  const topList = Array.isArray(insights.topExpenseCategories) ? insights.topExpenseCategories : [];
  const remaining = topList.filter((c) => c.category !== cat).slice(0, 3);
  if (remaining.length > 0) {
    points.push(
      `Next categories: ${remaining.map((c) => `${c.category} (${formatINR(c.amount)})`).join(', ')}.`
    );
  }

  const answer = `Here is the answer. "${cat}" is where most of your money is going — it accounts for ${share.toFixed(1)}% of all your expenses.`;

  return { answer, points, intent: 'highest-category' };
}

function buildHowToSaveAnswer(insights, target) {
  const totalIncome = insights.totalIncome || 0;
  const totalExpense = insights.totalExpense || 0;
  const savingsRate = insights.savingsRate || 0;
  const points = [];

  const avgMonthlyExpense = insights.averageMonthlySpending || 0;
  const avgDailySpending = insights.averageDailySpending || 0;
  const topCategories = Array.isArray(insights.topExpenseCategories) ? insights.topExpenseCategories : [];
  const discretionary = topCategories.filter((c) =>
    ['Food', 'Shopping', 'Entertainment'].includes(c.category)
  );

  const targetLabel = target > 0 ? formatINR(target) : '₹5,000';

  points.push(
    `Your current savings rate is ${savingsRate.toFixed(1)}%, with income of ${formatINR(totalIncome)} and expenses of ${formatINR(totalExpense)}.`
  );

  if (discretionary.length > 0 && totalExpense > 0) {
    const discSum = discretionary.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const discShare = (discSum / totalExpense) * 100;
    points.push(
      `Discretionary spending on ${discretionary.map((c) => c.category).join(', ')} is ${formatINR(discSum)} — ` +
      `${discShare.toFixed(1)}% of your total expenses. This is the first place to look for cuts.`
    );
  }

  if (avgMonthlyExpense > 0) {
    points.push(`On average you spend ${formatINR(avgMonthlyExpense)} per month, or about ${formatINR(avgDailySpending)} per day.`);
  }

  const top = topCategories[0];
  if (top) {
    points.push(
      `Your largest category is "${top.category}" at ${formatINR(top.amount)}. A 10% reduction there alone would free up ${formatINR(top.amount * 0.1)}.`
    );
  }

  points.push(
    `To save ${targetLabel} next month, you would need to trim about ${target > 0 ? formatINR(target) : '₹5,000'} — ` +
    'start with the categories above, meal-prepping, and canceling unused subscriptions.'
  );

  const answer =
    'Here is a personalised saving plan built from your own numbers. The fastest path is to cut the highest or most discretionary categories first, then set up an automatic transfer right after income arrives.';

  return { answer, points, intent: 'how-to-save' };
}

function buildCompareMonthsAnswer(insights, transactions) {
  const breakdown = Array.isArray(insights.monthlyBreakdown)
    ? insights.monthlyBreakdown.slice().sort((a, b) => (String(a.month) < String(b.month) ? -1 : 1))
    : [];
  const points = [];

  if (breakdown.length < 2) {
    return {
      answer: 'I need at least two months of data to compare them.',
      points: [
        'Your statement currently has only one active month of transactions.',
        'Upload or process a statement covering more than one month to enable comparisons.'
      ],
      intent: 'compare-months'
    };
  }

  const prev = breakdown[breakdown.length - 2];
  const latest = breakdown[breakdown.length - 1];

  const prevLabel = formatMonthLabel(prev.month);
  const latestLabel = formatMonthLabel(latest.month);

  points.push(`Income: ${formatINR(prev.income)} (${prevLabel}) → ${formatINR(latest.income)} (${latestLabel}).`);

  const expDelta = latest.expense - prev.expense;
  const expPct = prev.expense > 0 ? (expDelta / prev.expense) * 100 : 0;
  if (expDelta > 0) {
    points.push(`Expenses went UP by ${formatINR(expDelta)} (${expPct.toFixed(1)}%) from ${prevLabel} to ${latestLabel}.`);
  } else if (expDelta < 0) {
    points.push(`Expenses went DOWN by ${formatINR(Math.abs(expDelta))} (${Math.abs(expPct).toFixed(1)}%) from ${prevLabel} to ${latestLabel}.`);
  } else {
    points.push(`Expenses were broadly stable between the two months.`);
  }

  const savDelta = latest.savings - prev.savings;
  if (savDelta >= 0) {
    points.push(`Savings improved by ${formatINR(savDelta)} in ${latestLabel}.`);
  } else {
    points.push(`Savings decreased by ${formatINR(Math.abs(savDelta))} in ${latestLabel}.`);
  }

  // Category-level comparison (coach-specific)
  try {
    const catDeltas = computeCategoryDeltas(transactions);
    if (catDeltas && catDeltas.deltas && catDeltas.deltas.length > 0) {
      const top = catDeltas.deltas[0];
      if (top.direction === 'up') {
        points.push(`Biggest mover: "${top.category}" increased by ${formatINR(Math.abs(top.delta))}.`);
      } else {
        points.push(`Biggest mover: "${top.category}" decreased by ${formatINR(Math.abs(top.delta))}.`);
      }
    }
  } catch {
    // Never fail the comparison just because the delta pass threw.
  }

  const answer = `Here is how ${latestLabel} compares with ${prevLabel}:`;

  return { answer, points, intent: 'compare-months' };
}

function buildMoneyGoingAnswer(insights) {
  const total = insights.totalExpense || 0;
  const topCategories = Array.isArray(insights.topExpenseCategories) ? insights.topExpenseCategories : [];
  const points = [];

  points.push(`In total you spent ${formatINR(total)} on expenses in this statement.`);

  if (topCategories.length > 0) {
    topCategories.slice(0, 4).forEach((c, i) => {
      const share = total > 0 ? ((Number(c.amount) || 0) / total) * 100 : 0;
      points.push(`${i + 1}. "${c.category}" — ${formatINR(c.amount)} (${share.toFixed(1)}% of expenses)`);
    });
  } else {
    points.push('No expense categories found yet — upload a statement with debits to see the breakdown.');
  }

  const answer =
    'Here is where your money is going, ranked by the amount spent per category.';

  return { answer, points, intent: 'money-going' };
}

function buildAdviceAnswer(insights) {
  const points = [];

  if (Array.isArray(insights.aiRecommendations) && insights.aiRecommendations.length > 0) {
    insights.aiRecommendations.slice(0, 4).forEach((rec, i) => {
      points.push(`${i + 1}. ${rec}`);
    });
  }

  if (Array.isArray(insights.aiSuggestions) && insights.aiSuggestions.length > 0) {
    points.push(`A quick suggestion: ${insights.aiSuggestions[0]}`);
  }

  if (points.length === 0) {
    return {
      answer: 'I do not have enough data to give advice yet.',
      points: ['Upload and process a bank statement to unlock personalised financial advice.'],
      intent: 'advice'
    };
  }

  const answer =
    'Here is my financial advice, generated entirely from your own transaction data:';

  return { answer, points, intent: 'advice' };
}

function buildHealthAnswer(insights) {
  const score = insights.financialHealthScore || 0;
  const points = [];

  points.push(`Your financial health score is ${score}/100.`);

  if (score >= 80) {
    points.push('Excellent — you have strong savings discipline and healthy cash flow.');
  } else if (score >= 50) {
    points.push('Decent, but there is room to improve your savings rate and reduce non-essential spending.');
  } else {
    points.push('This is below average. Focus on cutting expenses and building a savings buffer.');
  }

  points.push(
    `Income ${formatINR(insights.totalIncome || 0)} · Expenses ${formatINR(insights.totalExpense || 0)} · ` +
    `Savings rate ${(insights.savingsRate || 0).toFixed(1)}%.`
  );

  const answer = 'Here is an overview of your financial health:';

  return { answer, points, intent: 'health' };
}

function buildIncomeAnswer(insights) {
  const totalIncome = insights.totalIncome || 0;
  const his = insights.highestIncomeSource;
  const hisName = his && typeof his === 'object' ? his.category : his;
  const hisAmount = his && typeof his === 'object' ? his.amount : 0;

  const points = [];
  points.push(`Your total income across this statement was ${formatINR(totalIncome)}.`);

  if (hisName && hisName !== 'N/A' && hisName !== 'None') {
    points.push(`Your top income source is "${hisName}" (${formatINR(hisAmount || 0)}).`);
  }

  const savingsRate = insights.savingsRate || 0;
  points.push(`After expenses, your savings rate is ${savingsRate.toFixed(1)}%.`);

  const answer = 'Here is what your income picture looks like:';

  return { answer, points, intent: 'income' };
}

function buildSavingsAnswer(insights) {
  const totalSavings = insights.totalSavings || 0;
  const savingsRate = insights.savingsRate || 0;
  const monthlySavings = insights.monthlySavings || 0;

  const points = [];
  points.push(`You saved ${formatINR(totalSavings)} in total across this statement (${savingsRate.toFixed(1)}% savings rate).`);

  if (insights.monthlyBreakdown && insights.monthlyBreakdown.length > 0) {
    points.push(`Your average savings per active month was ${formatINR(monthlySavings)}.`);
  }

  if (savingsRate >= 30) {
    points.push('That is an excellent savings rate — keep it up!');
  } else if (savingsRate >= 20) {
    points.push('That is a healthy savings rate. Aim to maintain at least 20%.');
  } else if (savingsRate >= 10) {
    points.push('Consider trimming discretionary expenses to push your savings rate above 20%.');
  } else {
    points.push('Your savings rate is low. Review your largest categories and cut back to avoid financial strain.');
  }

  const answer = 'Here is a summary of your savings:';

  return { answer, points, intent: 'savings' };
}

function buildOverviewAnswer(insights) {
  const points = [];

  points.push(`Income ${formatINR(insights.totalIncome || 0)} · Expenses ${formatINR(insights.totalExpense || 0)} · Savings ${formatINR(insights.totalSavings || 0)}.`);
  points.push(`Savings rate: ${(insights.savingsRate || 0).toFixed(1)}%.`);
  points.push(`Financial health score: ${insights.financialHealthScore || 0}/100.`);
  points.push(`Top expense category: "${insights.highestExpenseCategory || 'N/A'}" (${formatINR(insights.highestExpenseAmount || 0)}).`);

  if (Array.isArray(insights.aiRecommendations) && insights.aiRecommendations.length > 0) {
    points.push(`Key recommendation: ${insights.aiRecommendations[0]}`);
  }

  const answer =
    'Here is a quick overview of your finances based on the latest statement. ' +
    'Ask me things like "Why did I spend more this month?" or "How can I save ₹5,000 next month?" for deeper answers.';

  return { answer, points, intent: 'overview' };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Ask the AI Financial Coach a question about a statement.
 * @param {string} ownerUserId - MongoDB ObjectId of the user
 * @param {string} statementId - MongoDB ObjectId of the statement
 * @param {string} question - free-text question
 * @returns {Promise<{answer: string, points: string[], intent: string}>}
 */
async function askCoach(ownerUserId, statementId, question) {
  const ownerId = new mongoose.Types.ObjectId(ownerUserId);
  const stmtId = new mongoose.Types.ObjectId(statementId);

  // 1. Load the raw transactions for the statement.
  const transactions = await Transaction.find({
    ownerUserId: ownerId,
    statementId: stmtId
  }).lean();

  // 2. Reuse the existing AI Insights service as the single source of truth.
  const insights = await getAiInsights(ownerUserId, statementId);

  // 3. If there are no transactions, return a friendly empty-state answer.
  if (!transactions || transactions.length === 0 || (insights.transactionCount || 0) === 0) {
    return {
      answer:
        'I do not have any transaction data for this statement yet, so I cannot give you personalised financial answers.',
      points: [
        'Process this statement to parse its transactions.',
        'After processing, I can analyse your income, expenses, and savings.'
      ],
      intent: detectIntent(question).intent
    };
  }

  // 4. Detect intent and build the answer dynamically.
  const { intent, params } = detectIntent(question);
  const deltas = computeCategoryDeltas(transactions);

  switch (intent) {
    case 'why-spend-more':
      return buildWhySpendMoreAnswer(insights, deltas);
    case 'highest-category':
      return buildHighestCategoryAnswer(insights);
    case 'how-to-save':
      return buildHowToSaveAnswer(insights, params.target);
    case 'compare-months':
      return buildCompareMonthsAnswer(insights, transactions);
    case 'money-going':
      return buildMoneyGoingAnswer(insights);
    case 'advice':
      return buildAdviceAnswer(insights);
    case 'health':
      return buildHealthAnswer(insights);
    case 'income':
      return buildIncomeAnswer(insights);
    case 'savings':
      return buildSavingsAnswer(insights);
    case 'overview':
    default:
      return buildOverviewAnswer(insights);
  }
}

module.exports = { askCoach, detectIntent, computeCategoryDeltas };

