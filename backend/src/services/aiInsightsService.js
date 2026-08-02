const mongoose = require('mongoose');
const { Transaction } = require('../models/Transaction');
const { categorizeTransaction } = require('./categoryService');

/**
 * Generate 3 data-driven AI summary bullet points.
 * @param {Object} stats - computed statistics
 * @returns {string[]} array of summary strings
 */
function generateAiSummaries(stats) {
  const { totalIncome, totalExpense, totalSavings, savingsRate, transactionCount, highestExpenseCategory, debitCount } = stats;
  const summaries = [];

  // Summary 1: Overall financial snapshot
  summaries.push(
    `Your total income is ₹${totalIncome.toLocaleString('en-IN')}, total expenses are ₹${totalExpense.toLocaleString('en-IN')}, ` +
    `and you saved ₹${totalSavings.toLocaleString('en-IN')} with a savings rate of ${savingsRate.toFixed(1)}%.`
  );

  // Summary 2: Spending pattern insight
  if (highestExpenseCategory && highestExpenseCategory !== 'None') {
    summaries.push(
      `Your highest spending category is "${highestExpenseCategory}" at ₹${stats.highestExpenseAmount.toLocaleString('en-IN')}. ` +
      `${totalExpense > 0 ? `This accounts for ${((stats.highestExpenseAmount / totalExpense) * 100).toFixed(1)}% of your total expenses.` : ''}`
    );
  } else {
    summaries.push(
      `You have ${transactionCount} transactions in this statement with a total expense of ₹${totalExpense.toLocaleString('en-IN')}.`
    );
  }

  // Summary 3: Financial health insight
  if (savingsRate >= 30) {
    summaries.push(`Excellent savings discipline! With a savings rate of ${savingsRate.toFixed(1)}%, you are building a strong financial cushion.`);
  } else if (savingsRate >= 20) {
    summaries.push(`Good savings rate of ${savingsRate.toFixed(1)}%. Try to maintain at least 20% savings for long-term financial goals.`);
  } else if (savingsRate >= 10) {
    summaries.push(`Your savings rate is ${savingsRate.toFixed(1)}%. Consider reducing discretionary expenses to save more each month.`);
  } else {
    summaries.push(`Your savings rate is ${savingsRate.toFixed(1)}%. Focus on budgeting and reducing unnecessary expenses to improve financial health.`);
  }

  return summaries;
}

/**
 * Generate 5 personalized financial suggestions based on transaction data.
 * @param {Object} stats - computed statistics
 * @returns {string[]} array of suggestion strings
 */
function generateAiSuggestions(stats) {
  const { totalIncome, totalExpense, totalSavings, savingsRate, highestExpenseCategory, atmWithdrawalTotal, debitCount, largeExpenseCount } = stats;
  const suggestions = [];

  // Suggestion 1: Expense vs Income advice
  if (totalExpense > totalIncome) {
    suggestions.push(`Your expenses (₹${totalExpense.toLocaleString('en-IN')}) exceed your income (₹${totalIncome.toLocaleString('en-IN')}). Review non-essential spending and create a strict monthly budget to avoid debt.`);
  } else {
    suggestions.push(`You are spending within your means. To grow savings, consider automating a fixed transfer to a savings or investment account right after payday.`);
  }

  // Suggestion 2: Savings rate advice
  if (savingsRate < 20) {
    suggestions.push(`Your savings rate is only ${savingsRate.toFixed(1)}%. Aim for at least 20% — start by cutting back on dining out, subscriptions, or impulse purchases.`);
  } else if (savingsRate >= 30) {
    suggestions.push(`Great savings rate! Consider directing surplus savings into diversified investments like mutual funds or fixed deposits for better returns.`);
  } else {
    suggestions.push(`Your savings rate of ${savingsRate.toFixed(1)}% is decent. Try to increase it gradually by 2-3% each month.`);
  }

  // Suggestion 3: Highest expense category advice
  if (highestExpenseCategory && highestExpenseCategory !== 'None') {
    if (highestExpenseCategory === 'Food & Dining') {
      suggestions.push(`Food & Dining is your top expense. Try meal prepping at home and limiting restaurant orders to weekends to save significantly.`);
    } else if (highestExpenseCategory === 'ATM / Cash Withdrawal') {
      suggestions.push(`ATM withdrawals are your top expense category. Use digital payments to track spending better and avoid withdrawal fees.`);
    } else if (highestExpenseCategory === 'Shopping') {
      suggestions.push(`Shopping is your largest expense category. Apply the 24-hour rule before making non-essential purchases to reduce impulse buying.`);
    } else if (highestExpenseCategory === 'Bills & Utilities') {
      suggestions.push(`Bills & Utilities consume the most. Check for cheaper plans, unplug unused devices, and negotiate with service providers to reduce costs.`);
    } else if (highestExpenseCategory === 'Entertainment') {
      suggestions.push(`Entertainment spending is high. Audit your subscriptions and keep only the ones you use regularly to save money.`);
    } else if (highestExpenseCategory === 'Transportation') {
      suggestions.push(`Transportation costs are high. Consider carpooling, using public transport, or walking for short distances to cut down expenses.`);
    } else {
      suggestions.push(`Your highest expense category is "${highestExpenseCategory}". Review these expenses and identify opportunities to reduce costs.`);
    }
  }

  // Suggestion 4: ATM / cash withdrawal advice
  if (atmWithdrawalTotal > 0) {
    suggestions.push(`You withdrew ₹${atmWithdrawalTotal.toLocaleString('en-IN')} via ATM. Using UPI or cards helps track spending automatically and prevents cash leakage.`);
  }

  // Suggestion 5: Large expense / transaction count advice
  if (largeExpenseCount > 5) {
    suggestions.push(`You have ${largeExpenseCount} transactions over ₹10,000 each. Large payments can strain cash flow — consider splitting big payments or using EMI options where possible.`);
  } else if (debitCount > 20) {
    suggestions.push(`You have ${debitCount} debit transactions. Consolidating small payments into fewer transactions can simplify tracking and reduce bank charges.`);
  } else {
    suggestions.push(`Review your recurring subscriptions and memberships. Canceling unused ones can free up extra cash for savings each month.`);
  }

  return suggestions;
}

/**
 * Compute the financial health score based on penalty rules.
 * @param {Object} stats
 * @returns {number} health score (0-100)
 */
function computeHealthScore(stats) {
  const { totalIncome, totalExpense, savingsRate, atmExpenseRatio, largeExpenseCount, debitCount } = stats;
  let score = 100;

  // Rule 1: Expense > Income → -30
  if (totalExpense > totalIncome) {
    score -= 30;
  }

  // Rule 2: Savings Rate < 20% → -20
  if (savingsRate < 20) {
    score -= 20;
  }

  // Rule 3: ATM Withdrawals > 30% of expenses → -10
  if (atmExpenseRatio > 30) {
    score -= 10;
  }

  // Rule 4: More than 5 large expenses (>₹10000) → -10
  if (largeExpenseCount > 5) {
    score -= 10;
  }

  // Rule 5: More than 20 debit transactions → -10
  if (debitCount > 20) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Normalize a value into a valid Date object (or null if invalid).
 * @param {*} value - Date | string | number
 * @returns {Date|null}
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Build a "YYYY-MM" key for a date.
 * @param {Date} date
 * @returns {string}
 */
function monthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Round a number to 2 decimal places.
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Format a number as Indian Rupees.
 * @param {number} value
 * @returns {string}
 */
function formatINR(value) {
  return `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
}

/**
 * Detect UPI-channel transactions from their narration.
 * UPI payments can be categorized into merchant categories (Food, Shopping, etc.),
 * so this independent channel check is used for the UPI spending trend.
 * @param {string} description - transaction narration
 * @returns {boolean}
 */
function isUpiTransaction(description) {
  const d = String(description || '').toLowerCase();
  return /upi|\bgpay\b|google pay|phonepe|paytm|bhim|amazon pay/.test(d);
}

/**
 * Generate data-driven AI recommendations from the computed financial metrics.
 *
 * Every recommendation is derived ONLY from actual transaction data that was
 * aggregated into `metrics`. No random / generic advice is produced.
 *
 * @param {Object} metrics - output of computeFinancialMetrics(transactions)
 * @param {Array<Object>} [transactions] - raw transactions (for UPI channel analysis)
 * @returns {string[]} array of recommendation strings
 */
function generateAiRecommendations(metrics, transactions) {
  const recommendations = [];

  if (!metrics || !metrics.transactionCount) {
    return recommendations;
  }

  const { totalIncome, totalExpense, totalSavings, savingsRate } = metrics;
  const list = Array.isArray(transactions) ? transactions : [];

  // ---------- 1. Category share of total spending ----------
  // "You spent 35% on Food."
  if (metrics.totalExpense > 0 && metrics.highestExpenseCategory && metrics.highestExpenseCategory !== 'None') {
    const sharePct = (metrics.highestExpenseAmount / metrics.totalExpense) * 100;
    recommendations.push(
      `You spent ${sharePct.toFixed(1)}% of your total expenses on "${metrics.highestExpenseCategory}" (${formatINR(metrics.highestExpenseAmount)}).`
    );
  }

  // ---------- 2. Month-over-month comparisons (requires >= 2 months) ----------
  const breakdown = Array.isArray(metrics.monthlyBreakdown) ? metrics.monthlyBreakdown : [];
  if (breakdown.length >= 2) {
    const sorted = breakdown.slice().sort((a, b) => (a.month < b.month ? -1 : 1));
    const prev = sorted[sorted.length - 2];
    const latest = sorted[sorted.length - 1];

    // Expense trend: worsening / improving
    if (prev.expense > 0 && latest.expense > 0) {
      const expenseDelta = latest.expense - prev.expense;
      const expensePct = (expenseDelta / prev.expense) * 100;
      if (expenseDelta > 0 && expensePct >= 5) {
        recommendations.push(
          `Your spending increased by ${expensePct.toFixed(1)}% this month compared to last month — your spending trend is worsening.`
        );
      } else if (expenseDelta < 0 && expensePct <= -5) {
        recommendations.push(
          `Your spending decreased by ${Math.abs(expensePct).toFixed(1)}% this month compared to last month — your spending trend is improving.`
        );
      } else {
        recommendations.push('Your spending remained broadly stable compared to last month.');
      }
    }

    // Savings trend
    const savingsDelta = latest.savings - prev.savings;
    if (savingsDelta < 0) {
      recommendations.push(
        `Your savings decreased this month by ${formatINR(Math.abs(savingsDelta))} compared to last month.`
      );
    } else if (savingsDelta > 0) {
      recommendations.push(
        `Your savings increased this month by ${formatINR(savingsDelta)} compared to last month.`
      );
    }

    // Income / salary trend
    if (prev.income > 0 && latest.income > 0) {
      const incomeDelta = latest.income - prev.income;
      const incomePct = (incomeDelta / prev.income) * 100;
      if (incomeDelta > 0 && incomePct >= 5) {
        recommendations.push(
          `Your income increased this month compared to last month (${incomePct.toFixed(1)}% higher).`
        );
      } else if (incomeDelta < 0 && incomePct <= -5) {
        recommendations.push(
          `Your income decreased this month compared to last month (${Math.abs(incomePct).toFixed(1)}% lower).`
        );
      }
    }
  }

  // ---------- 3. UPI spending trend (channel-level analysis) ----------
  // Aggregate UPI-channel debit spend per month from raw transactions.
  const upiMonthly = {};
  for (const txn of list) {
    const debit = Number(txn.debit) || 0;
    if (debit <= 0) continue;
    const date = toDate(txn.date);
    if (!date) continue;
    if (!isUpiTransaction(txn.description)) continue;
    const mk = monthKey(date);
    upiMonthly[mk] = (upiMonthly[mk] || 0) + debit;
  }
  const upiMonthKeys = Object.keys(upiMonthly).sort();
  if (upiMonthKeys.length >= 2) {
    const prevUpi = upiMonthly[upiMonthKeys[upiMonthKeys.length - 2]];
    const latestUpi = upiMonthly[upiMonthKeys[upiMonthKeys.length - 1]];
    if (prevUpi > 0 && latestUpi > 0) {
      const upiDeltaPct = ((latestUpi - prevUpi) / prevUpi) * 100;
      if (upiDeltaPct > 0) {
        recommendations.push(
          `Your UPI spending increased this month by ${upiDeltaPct.toFixed(1)}% (${formatINR(latestUpi - prevUpi)}).`
        );
      } else if (upiDeltaPct < 0) {
        recommendations.push(
          `Your UPI spending decreased this month by ${Math.abs(upiDeltaPct).toFixed(1)}% (${formatINR(Math.abs(latestUpi - prevUpi))}).`
        );
      }
    }
  }

  // ---------- 4. Savings rate health ----------
  if (totalIncome > 0) {
    if (savingsRate < 10) {
      recommendations.push(
        `Your savings rate is only ${savingsRate.toFixed(1)}%. Reduce unnecessary expenses to avoid financial strain.`
      );
    } else if (savingsRate < 20) {
      recommendations.push(
        `Your savings rate is ${savingsRate.toFixed(1)}%. Try to trim discretionary spending to reach the recommended 20% savings rate.`
      );
    } else if (savingsRate < 0) {
      recommendations.push(
        `You spent more than you earned this period (${formatINR(Math.abs(totalSavings))} deficit). Reduce unnecessary expenses immediately.`
      );
    }
  }

  // ---------- 5. Expense vs Income ----------
  if (totalIncome > 0 && totalExpense > totalIncome) {
    recommendations.push(
      `Your expenses (${formatINR(totalExpense)}) exceed your income (${formatINR(totalIncome)}). Reduce unnecessary expenses and create a budget to avoid debt.`
    );
  }

  // ---------- 6. EMI is consuming a high percentage of income ----------
  const categoryExpenseShares = metrics.categoryExpenseShares || {};
  const emiShare = metrics.totalIncome > 0 ? (categoryExpenseShares.EMI / metrics.totalIncome) * 100 : 0;
  if (emiShare >= 30) {
    recommendations.push(
      `EMI payments consume ${emiShare.toFixed(1)}% of your income — a high percentage. Consider loan restructuring or prepayment to reduce the burden.`
    );
  } else if (emiShare >= 20) {
    recommendations.push(
      `EMI payments consume ${emiShare.toFixed(1)}% of your income. Keep an eye on this so it does not cross the 30% comfort zone.`
    );
  }

  // ---------- 7. ATM / cash withdrawals ----------
  if (metrics.atmWithdrawalTotal > 0 && metrics.totalExpense > 0) {
    const atmPct = (metrics.atmWithdrawalTotal / metrics.totalExpense) * 100;
    if (atmPct >= 30) {
      recommendations.push(
        `ATM withdrawals make up ${atmPct.toFixed(1)}% of your spending (${formatINR(metrics.atmWithdrawalTotal)}). Switch to UPI or cards to track cash spending better.`
      );
    } else {
      recommendations.push(
        `You withdrew ${formatINR(metrics.atmWithdrawalTotal)} in cash. Prefer digital payments to keep track of expenses automatically.`
      );
    }
  }

  // ---------- 8. Large expenses ----------
  if (metrics.largeExpenseCount > 5) {
    recommendations.push(
      `You have ${metrics.largeExpenseCount} transactions over ₹10,000. Large payments strain cash flow — consider splitting them or using EMI where possible.`
    );
  }

  // ---------- 9. Recurring subscription / top non-essential categories ----------
  const topExpenseCategories = metrics.topExpenseCategories || [];
  const discretionary = topExpenseCategories.filter((c) =>
    ['Entertainment', 'Shopping', 'Food'].includes(c.category)
  );
  if (discretionary.length > 0 && totalExpense > 0) {
    const sum = discretionary.reduce((s, c) => s + c.amount, 0);
    const share = (sum / totalExpense) * 100;
    recommendations.push(
      `Discretionary spending on ${discretionary.map((c) => c.category).join(', ')} is ${share.toFixed(1)}% of your total expenses. Consider reducing these to save more.`
    );
  }

  return recommendations;
}

/**
 * Pure function that computes ALL financial metrics from a list of transactions.
 *
 * Designed to be unit-testable: no DB access, no side effects.
 *
 * @param {Array<Object>} transactions - array of { date, description, debit, credit }
 * @returns {Object} all computed metrics
 */
function computeFinancialMetrics(transactions) {
  const list = Array.isArray(transactions) ? transactions : [];

  let totalIncome = 0;
  let totalExpense = 0;
  let debitCount = 0;
  let creditCount = 0;
  let atmWithdrawalTotal = 0;
  let largeExpenseCount = 0;

  // Category aggregations: cat -> amount (expenses) / cat -> { amount, count } (income)
  const categoryExpenses = {};
  const categoryIncome = {};

  // Monthly aggregations: "YYYY-MM" -> { income, expense, count }
  const monthly = {};

  // Unique calendar days spanned by transactions
  const uniqueDays = new Set();

  let minDate = null;
  let maxDate = null;

  // Track biggest transaction (by absolute amount)
  let biggestTransaction = { description: 'N/A', amount: 0, type: 'N/A' };

  for (const txn of list) {
    const credit = Number(txn.credit) || 0;
    const debit = Number(txn.debit) || 0;
    const desc = (txn.description || '').trim();

    // Income (credits)
    if (credit > 0) {
      totalIncome += credit;
      creditCount++;
      const cat = categorizeTransaction(desc) || 'Others';
      if (!categoryIncome[cat]) categoryIncome[cat] = { amount: 0, count: 0 };
      categoryIncome[cat].amount += credit;
      categoryIncome[cat].count += 1;
    }

    // Expense (debits)
    if (debit > 0) {
      totalExpense += debit;
      debitCount++;
      const cat = categorizeTransaction(desc) || 'Others';
      categoryExpenses[cat] = (categoryExpenses[cat] || 0) + debit;

      // Check if it's an ATM withdrawal
      if (cat === 'ATM' || cat === 'ATM / Cash Withdrawal') {
        atmWithdrawalTotal += debit;
      }

      // Count large expenses (>₹10000)
      if (debit > 10000) {
        largeExpenseCount++;
      }
    }

    // Track biggest single transaction (by absolute amount)
    const absAmount = Math.abs(credit > 0 ? credit : debit);
    if (absAmount > biggestTransaction.amount) {
      biggestTransaction = {
        description: desc || 'Unknown',
        amount: absAmount,
        type: debit > 0 ? 'debit' : 'credit'
      };
    }

    // Date-based aggregation (monthly breakdown + daily span)
    const date = toDate(txn.date);
    if (date) {
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
      uniqueDays.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
      const mk = monthKey(date);
      if (!monthly[mk]) monthly[mk] = { income: 0, expense: 0, count: 0 };
      monthly[mk].income += credit;
      monthly[mk].expense += debit;
      monthly[mk].count += 1;
    }
  }

  // --- Derived metrics ---
  const transactionCount = list.length;
  const totalSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // Find highest expense category
  let highestExpenseCategory = 'None';
  let highestExpenseAmount = 0;
  for (const [category, amount] of Object.entries(categoryExpenses)) {
    if (amount > highestExpenseAmount) {
      highestExpenseAmount = amount;
      highestExpenseCategory = category;
    }
  }

  // Find highest income source
  let highestIncomeSource = 'N/A';
  let highestIncomeAmount = 0;
  let highestIncomeCount = 0;
  for (const [category, { amount, count }] of Object.entries(categoryIncome)) {
    if (amount > highestIncomeAmount) {
      highestIncomeAmount = amount;
      highestIncomeSource = category;
      highestIncomeCount = count;
    }
  }

  // Monthly breakdown (sorted ascending by month key)
  const monthlyBreakdown = Object.keys(monthly)
    .sort()
    .map((mk) => {
      const { income, expense, count } = monthly[mk];
      return {
        month: mk,
        income: round2(income),
        expense: round2(expense),
        savings: round2(income - expense),
        count
      };
    });

  // Average monthly savings (across months that had activity)
  const monthsCount = Object.keys(monthly).length;
  const monthlySavings = monthsCount > 0
    ? monthlyBreakdown.reduce((sum, m) => sum + m.savings, 0) / monthsCount
    : 0;

  // Average daily spending (total expense ÷ number of unique days in the range)
  const uniqueDaysCount = uniqueDays.size;
  const averageDailySpending = uniqueDaysCount > 0 ? totalExpense / uniqueDaysCount : 0;

  // Average monthly spending (total expense ÷ number of distinct months)
  const averageMonthlySpending = monthsCount > 0 ? totalExpense / monthsCount : 0;

  // Date range / span info
  const dateRangeStart = minDate ? minDate.toISOString() : null;
  const dateRangeEnd = maxDate ? maxDate.toISOString() : null;
  const daysSpan = minDate && maxDate ? Math.round((maxDate - minDate) / 86400000) + 1 : 0;

  // Cash flow summary
  const netCashFlow = totalSavings;
  const cashFlowDirection = netCashFlow >= 0 ? 'positive' : 'negative';
  const cashFlowSummaryText = transactionCount > 0
    ? `Over the statement period (${daysSpan} day${daysSpan === 1 ? '' : 's'}, ${monthsCount} month${monthsCount === 1 ? '' : 's'}), you received ₹${round2(totalIncome).toLocaleString('en-IN')} as total income and spent ₹${round2(totalExpense).toLocaleString('en-IN')}. This resulted in a ${cashFlowDirection} net cash flow of ₹${Math.abs(round2(netCashFlow)).toLocaleString('en-IN')}. On average you spend ₹${round2(averageDailySpending).toLocaleString('en-IN')} per day and ₹${round2(averageMonthlySpending).toLocaleString('en-IN')} per month.`
    : 'No cash flow activity found for this statement.';

  // ATM withdrawal ratio (as percentage of total expenses)
  const atmExpenseRatio = totalExpense > 0 ? (atmWithdrawalTotal / totalExpense) * 100 : 0;

  return {
    // Core aggregates
    totalIncome: round2(totalIncome),
    totalExpense: round2(totalExpense),
    totalSavings: round2(totalSavings),
    savingsRate: round2(savingsRate),
    transactionCount,
    creditCount,
    debitCount,

    // New insights
    monthlySavings: round2(monthlySavings),
    monthlyBreakdown,
    averageDailySpending: round2(averageDailySpending),
    averageMonthlySpending: round2(averageMonthlySpending),

    // Category insights
    highestExpenseCategory,
    highestExpenseAmount: round2(highestExpenseAmount),
    highestIncomeSource,
    highestIncomeAmount: round2(highestIncomeAmount),
    highestIncomeCount,

    // Biggest transaction
    biggestTransaction: {
      description: biggestTransaction.description,
      amount: round2(biggestTransaction.amount),
      type: biggestTransaction.type
    },

    // Cash flow
    cashFlowSummary: {
      text: cashFlowSummaryText,
      totalInflow: round2(totalIncome),
      totalOutflow: round2(totalExpense),
      netCashFlow: round2(netCashFlow),
      dateRangeStart,
      dateRangeEnd,
      daysSpan,
      monthsSpan: monthsCount
    },

    // Supporting stats for health score / suggestions
    atmWithdrawalTotal: round2(atmWithdrawalTotal),
    atmExpenseRatio: round2(atmExpenseRatio),
    largeExpenseCount,

    // Category expense share map: category -> amount (for EMI ratio etc.)
    categoryExpenseShares: Object.keys(categoryExpenses).reduce((acc, cat) => {
      acc[cat] = round2(categoryExpenses[cat]);
      return acc;
    }, {}),

    // Top expense categories sorted by amount (descending)
    topExpenseCategories: Object.keys(categoryExpenses)
      .map((cat) => ({ category: cat, amount: round2(categoryExpenses[cat]) }))
      .sort((a, b) => b.amount - a.amount)
  };
}

/**
 * Main function: Get AI financial insights for a given statement.
 * @param {string} ownerUserId - MongoDB ObjectId of the user
 * @param {string} statementId - MongoDB ObjectId of the statement
 * @returns {Object} AI insights payload
 */
async function getAiInsights(ownerUserId, statementId) {
  const ownerId = new mongoose.Types.ObjectId(ownerUserId);
  const stmtId = new mongoose.Types.ObjectId(statementId);

  // Fetch all transactions for this statement
  const transactions = await Transaction.find({
    ownerUserId: ownerId,
    statementId: stmtId
  }).lean();

  if (!transactions || transactions.length === 0) {
    return {
      financialHealthScore: 0,
      totalIncome: 0,
      totalExpense: 0,
      totalSavings: 0,
      savingsRate: 0,
      monthlySavings: 0,
      monthlyBreakdown: [],
      averageDailySpending: 0,
      averageMonthlySpending: 0,
      highestExpenseCategory: 'N/A',
      highestExpenseAmount: 0,
      highestIncomeSource: 'N/A',
      highestIncomeAmount: 0,
      highestIncomeCount: 0,
      biggestTransaction: { description: 'N/A', amount: 0, type: 'N/A' },
      transactionCount: 0,
      cashFlowSummary: {
        text: 'No transactions found for this statement.',
        totalInflow: 0,
        totalOutflow: 0,
        netCashFlow: 0,
        dateRangeStart: null,
        dateRangeEnd: null,
        daysSpan: 0,
        monthsSpan: 0
      },
      aiSummary: [
        'No transactions found for this statement.',
        'Upload and process a bank statement to view AI insights.',
        'Once processed, this section will display personalized financial analysis.'
      ],
      aiSuggestions: [
        'Start by uploading a bank statement in PDF or CSV format.',
        'After processing, AI insights will analyze your spending patterns.',
        'Use the insights to create a budget and track your financial goals.',
        'Regularly review your transactions to stay on top of your finances.',
        'Set savings targets to build a strong financial future.'
      ],
      aiRecommendations: []
    };
  }

  // --- Compute ALL metrics with the pure function ---
  const metrics = computeFinancialMetrics(transactions);

  // --- Compute health score ---
  const stats = {
    totalIncome: metrics.totalIncome,
    totalExpense: metrics.totalExpense,
    totalSavings: metrics.totalSavings,
    savingsRate: metrics.savingsRate,
    highestExpenseCategory: metrics.highestExpenseCategory,
    highestExpenseAmount: metrics.highestExpenseAmount,
    debitCount: metrics.debitCount,
    largeExpenseCount: metrics.largeExpenseCount,
    atmExpenseRatio: metrics.atmExpenseRatio,
    atmWithdrawalTotal: metrics.atmWithdrawalTotal
  };

  const financialHealthScore = computeHealthScore(stats);

  // --- Generate AI summaries ---
  const aiSummary = generateAiSummaries({
    ...stats,
    transactionCount: metrics.transactionCount,
    biggestTransaction: metrics.biggestTransaction
  });

  // --- Generate AI suggestions ---
  const aiSuggestions = generateAiSuggestions(stats);

  // --- Generate AI recommendations (data-driven, from actual transactions) ---
  const aiRecommendations = generateAiRecommendations(metrics, transactions);

return {
    financialHealthScore,
    totalIncome: metrics.totalIncome,
    totalExpense: metrics.totalExpense,
    totalSavings: metrics.totalSavings,
    savingsRate: metrics.savingsRate,

    // New insights
    monthlySavings: metrics.monthlySavings,
    monthlyBreakdown: metrics.monthlyBreakdown,
    averageDailySpending: metrics.averageDailySpending,
    averageMonthlySpending: metrics.averageMonthlySpending,
    highestIncomeSource: {
      category: metrics.highestIncomeSource,
      amount: metrics.highestIncomeAmount,
      count: metrics.highestIncomeCount
    },
    cashFlowSummary: metrics.cashFlowSummary,

    // Existing insights
    highestExpenseCategory: metrics.highestExpenseCategory,
    highestExpenseAmount: metrics.highestExpenseAmount,
    biggestTransaction: metrics.biggestTransaction,
    transactionCount: metrics.transactionCount,
    creditCount: metrics.creditCount,
    debitCount: metrics.debitCount,
    categoryExpenseShares: metrics.categoryExpenseShares,
    topExpenseCategories: metrics.topExpenseCategories,
    aiSummary,
    aiSuggestions,
    aiRecommendations
  };
}

module.exports = { getAiInsights, computeFinancialMetrics, generateAiRecommendations };

