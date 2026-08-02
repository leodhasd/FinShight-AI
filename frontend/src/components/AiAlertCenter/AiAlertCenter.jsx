import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
}

function formatInt(value) {
  return String(Math.round(Number(value) || 0));
}

function formatMonthLabel(key) {
  if (!key) return key;
  const [y, m] = String(key).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[Number(m) - 1] || key;
  return `${month} ${String(y).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function AlertOctagonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Alert type configuration (color-coded: critical / warning / success / info)
// ---------------------------------------------------------------------------
const ALERT_TYPES = {
  critical: {
    icon: <AlertOctagonIcon />,
    iconBg: 'bg-rose-500/10 text-rose-300',
    title: 'text-rose-300',
    bar: 'from-rose-400/70 via-rose-400/25 to-transparent',
    badge: 'bg-rose-500/15 text-rose-300',
    hover: 'hover:border-rose-400/30'
  },
  warning: {
    icon: <AlertTriangleIcon />,
    iconBg: 'bg-amber-500/10 text-amber-300',
    title: 'text-amber-300',
    bar: 'from-amber-400/70 via-amber-400/25 to-transparent',
    badge: 'bg-amber-500/15 text-amber-300',
    hover: 'hover:border-amber-400/30'
  },
  success: {
    icon: <CheckCircleIcon />,
    iconBg: 'bg-emerald-500/10 text-emerald-300',
    title: 'text-emerald-300',
    bar: 'from-emerald-400/70 via-emerald-400/25 to-transparent',
    badge: 'bg-emerald-500/15 text-emerald-300',
    hover: 'hover:border-emerald-400/30'
  },
  info: {
    icon: <InfoIcon />,
    iconBg: 'bg-sky-500/10 text-sky-300',
    title: 'text-sky-300',
    bar: 'from-sky-400/70 via-sky-400/25 to-transparent',
    badge: 'bg-sky-500/15 text-sky-300',
    hover: 'hover:border-sky-400/30'
  }
};

const SEVERITY_CHIPS = [
  { type: 'critical', label: 'Critical', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
  { type: 'warning', label: 'Warning', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  { type: 'success', label: 'Good', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  { type: 'info', label: 'Info', cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300' }
];

// ---------------------------------------------------------------------------
// Alert generation — derived ONLY from existing transaction + AI analytics data
// ---------------------------------------------------------------------------
function buildAlerts({ latest, summary }) {
  const alerts = [];
  const seen = new Set();
  const push = (alert) => {
    if (seen.has(alert.id)) return;
    seen.add(alert.id);
    alerts.push(alert);
  };

  // 1. No statement / transactions uploaded yet
  if (!latest) {
    push({
      id: 'no-uploads',
      type: 'info',
      title: 'No transactions uploaded yet',
      description: 'Upload a bank statement to start receiving smart AI financial alerts.',
      timeLabel: 'Today'
    });
    return alerts;
  }

  // 2. Latest statement not processed yet
  if (!summary?.isProcessed) {
    push({
      id: 'not-processed',
      type: 'info',
      title: 'Statement not processed yet',
      description: 'Process your latest statement to unlock AI-powered financial alerts.',
      timeLabel: 'Today'
    });
    return alerts;
  }

  const ai = summary?.ai || {};

  // ---- Normalize AI metrics (defensive — never trust shape) ----
  const totalIncome = Number(ai.totalIncome) || 0;
  const totalExpense = Number(ai.totalExpense) || 0;
  const totalSavings = Number(ai.totalSavings) || 0;
  const savingsRate = Number(ai.savingsRate) || 0;
  const health = Number(ai.financialHealthScore ?? summary?.healthScore ?? 0) || 0;
  const atmRatio = Number(ai.atmExpenseRatio) || 0;
  const atmTotal = Number(ai.atmWithdrawalTotal) || 0;
  const largeExpenseCount = Number(ai.largeExpenseCount) || 0;
  const debitCount = Number(ai.debitCount) || 0;
  const creditCount = Number(ai.creditCount) || 0;
  const highestExpenseCategory = ai.highestExpenseCategory || null;
  const highestExpenseAmount = Number(ai.highestExpenseAmount) || 0;
  const cashFlow = ai.cashFlowSummary || null;
  const netCashFlow = Number(cashFlow?.netCashFlow) || totalSavings;
  const big = ai.biggestTransaction;
  const topExpenseCategories = Array.isArray(ai.topExpenseCategories) ? ai.topExpenseCategories : [];
  const highestIncome =
    ai.highestIncomeSource && typeof ai.highestIncomeSource === 'object'
      ? ai.highestIncomeSource
      : { category: ai.highestIncomeSource || null, amount: 0, count: 0 };

  // Monthly breakdown (sorted ascending) + latest/prev month
  const breakdown = Array.isArray(ai.monthlyBreakdown)
    ? ai.monthlyBreakdown.slice().sort((a, b) => (String(a.month) < String(b.month) ? -1 : 1))
    : [];
  const latestMonth = breakdown[breakdown.length - 1] || null;
  const prevMonth = breakdown.length >= 2 ? breakdown[breakdown.length - 2] : null;
  const latestMonthLabel = latestMonth ? formatMonthLabel(latestMonth.month) : null;

  // ============================ CRITICAL ============================
  // 3. Financial health score critically low
  if (health > 0 && health < 50) {
    push({
      id: 'low-health-score',
      type: 'critical',
      title: 'Low financial health score',
      description: `Your financial health score is ${formatInt(health)}/100. Review spending and build savings to improve it.`,
      timeLabel: 'Score'
    });
  }

  // 4. Overall expenses exceed income
  if (totalIncome > 0 && totalExpense > totalIncome) {
    push({
      id: 'expense-exceeds-income',
      type: 'critical',
      title: 'Expenses exceed income',
      description: `You spent ${formatCurrency(totalExpense)} against income of ${formatCurrency(totalIncome)} this period.`,
      timeLabel: 'Period'
    });
  }

  // 5. Critically low savings rate
  if (totalIncome > 0 && savingsRate < 10) {
    push({
      id: 'savings-rate-critical',
      type: 'critical',
      title: 'Very low savings rate',
      description: `Savings rate is only ${savingsRate.toFixed(1)}%. Reduce unnecessary expenses to avoid financial strain.`,
      timeLabel: 'Period'
    });
  }

  // 6. Negative net cash flow
  if (netCashFlow < 0) {
    push({
      id: 'negative-cash-flow',
      type: 'critical',
      title: 'Negative cash flow',
      description: `Net cash flow was ${formatCurrency(Math.abs(netCashFlow))} negative this period. You spent more than you earned.`,
      timeLabel: 'Period'
    });
  }

  // ============================ WARNING ============================
  // 7. Health score below 80 (room for improvement)
  if (health >= 50 && health < 80) {
    push({
      id: 'health-average',
      type: 'warning',
      title: 'Financial health could improve',
      description: `Your health score is ${formatInt(health)}/100. Focus on building a stronger savings buffer.`,
      timeLabel: 'Score'
    });
  }

  // 8. Savings rate below the 20% target
  if (totalIncome > 0 && savingsRate >= 10 && savingsRate < 20) {
    push({
      id: 'savings-rate-warning',
      type: 'warning',
      title: 'Savings rate below target',
      description: `Savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20% to build a strong cushion.`,
      timeLabel: 'Period'
    });
  }

  // 9. ATM withdrawals >= 30% of spending
  if (atmRatio >= 30 && totalExpense > 0) {
    push({
      id: 'atm-high',
      type: 'warning',
      title: 'High ATM cash withdrawals',
      description: `ATM withdrawals are ${atmRatio.toFixed(1)}% of your spending (${formatCurrency(atmTotal)}). Prefer UPI or cards to track cash.`,
      timeLabel: 'Period'
    });
  }

  // 10. Many large expenses
  if (largeExpenseCount > 5) {
    push({
      id: 'many-large-expenses',
      type: 'warning',
      title: 'Many large expenses',
      description: `${largeExpenseCount} transactions over ₹10,000 detected. Large payments can strain cash flow.`,
      timeLabel: 'Period'
    });
  }

  // 11. High discretionary spending
  if (totalExpense > 0) {
    const discretionary = topExpenseCategories
      .filter((c) => ['Entertainment', 'Shopping', 'Food'].includes(c.category))
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const discretionaryPct = (discretionary / totalExpense) * 100;
    if (discretionaryPct >= 30) {
      push({
        id: 'discretionary-high',
        type: 'warning',
        title: 'High discretionary spending',
        description: `Entertainment, Shopping & Food make up ${discretionaryPct.toFixed(1)}% of your expenses. Consider trimming them.`,
        timeLabel: 'Period'
      });
    }
  }

  // 12. Spending concentrated in a single category
  if (totalExpense > 0 && highestExpenseAmount > 0 && (highestExpenseAmount / totalExpense) * 100 > 40) {
    push({
      id: 'category-concentration',
      type: 'warning',
      title: 'Spending concentrated in one category',
      description: `${highestExpenseCategory} is ${((highestExpenseAmount / totalExpense) * 100).toFixed(1)}% of your total spend.`,
      timeLabel: 'Period'
    });
  }

  // 13. Month-over-month expense increase
  if (prevMonth && latestMonth && Number(prevMonth.expense) > 0 && Number(latestMonth.expense) > 0) {
    const deltaPct = ((Number(latestMonth.expense) - Number(prevMonth.expense)) / Number(prevMonth.expense)) * 100;
    if (deltaPct >= 5) {
      push({
        id: 'expense-increased',
        type: 'warning',
        title: 'Expenses increased this month',
        description: `Your spending rose ${deltaPct.toFixed(1)}% compared to last month.`,
        timeLabel: latestMonthLabel || 'This Month'
      });
    }
  }

  // 14. Expenses exceeded income this month
  if (
    latestMonth &&
    Number(latestMonth.expense) > 0 &&
    Number(latestMonth.income) > 0 &&
    Number(latestMonth.expense) > Number(latestMonth.income)
  ) {
    push({
      id: 'high-spending',
      type: 'warning',
      title: 'High spending this month',
      description: `Your expenses exceeded your income by ${formatCurrency(Number(latestMonth.expense) - Number(latestMonth.income))} this month.`,
      timeLabel: latestMonthLabel || 'This Month'
    });
  }

  // ============================ SUCCESS ============================
  // 15. Savings improved month-over-month
  if (prevMonth && latestMonth && Number(latestMonth.savings) > Number(prevMonth.savings)) {
    push({
      id: 'savings-improved',
      type: 'success',
      title: 'Savings improved this month',
      description: `You saved ${formatCurrency(Number(latestMonth.savings) - Number(prevMonth.savings))} more than last month.`,
      timeLabel: latestMonthLabel || 'This Month'
    });
  }

  // 16. Excellent savings rate
  if (totalIncome > 0 && savingsRate >= 30) {
    push({
      id: 'savings-rate-great',
      type: 'success',
      title: 'Excellent savings discipline',
      description: `Savings rate of ${savingsRate.toFixed(1)}% — you are building a strong financial cushion.`,
      timeLabel: 'Period'
    });
  }

  // 17. Excellent health score
  if (health >= 80) {
    push({
      id: 'health-excellent',
      type: 'success',
      title: 'Excellent financial health',
      description: `Your financial health score is ${formatInt(health)}/100. Keep up the great work!`,
      timeLabel: 'Score'
    });
  }

  // ============================ INFO ============================
  // 18. Top income source
  if (highestIncome.category && highestIncome.category !== 'N/A' && highestIncome.category !== 'None' && totalIncome > 0) {
    const incomeAmount = Number(highestIncome.amount) || 0;
    const incomeCount = Number(highestIncome.count) || 0;
    push({
      id: 'top-income-source',
      type: 'info',
      title: `${highestIncome.category} is your top income source`,
      description: `You earned ${formatCurrency(incomeAmount)} from this source${incomeCount > 1 ? ` across ${incomeCount} credits` : ''}.`,
      timeLabel: 'Period'
    });
  }

  // 19. High debit transaction count
  if (debitCount > 20) {
    push({
      id: 'high-debit-count',
      type: 'info',
      title: 'High number of debit transactions',
      description: `${debitCount} debit transactions this period. Consolidating small payments can simplify tracking.`,
      timeLabel: 'Period'
    });
  }

  // 20. Large transaction detected
  if (big && Number(big.amount) >= 10000) {
    const kind = big.type === 'credit' ? 'Credit' : 'Debit';
    const label =
      big.description && !['Unknown', 'N/A', 'NA'].includes(big.description) ? ` — ${big.description}` : '';
    push({
      id: 'large-transaction',
      type: 'info',
      title: 'Large transaction detected',
      description: `${kind} of ${formatCurrency(big.amount)}${label} this period.`,
      timeLabel: 'Period'
    });
  }

  // 21. Top spending category highlight
  if (highestExpenseCategory && highestExpenseCategory !== 'None' && highestExpenseAmount > 0) {
    push({
      id: 'top-category',
      type: 'info',
      title: `Top spending category: ${highestExpenseCategory}`,
      description: `${highestExpenseCategory} accounts for ${formatCurrency(highestExpenseAmount)} of your spending.`,
      timeLabel: 'Period'
    });
  }

  // 22. Cash-flow activity summary
  if (cashFlow?.text && totalIncome + totalExpense > 0) {
    push({
      id: 'cash-flow-activity',
      type: 'info',
      title: 'Cash flow activity',
      description: `In ${formatCurrency(cashFlow.totalInflow || 0)} · Out ${formatCurrency(cashFlow.totalOutflow || 0)} this period.`,
      timeLabel: 'Period'
    });
  }

  // 23. Credit count info
  if (creditCount > 0 && totalIncome > 0) {
    push({
      id: 'credit-count',
      type: 'info',
      title: `${creditCount} credit transactions`,
      description: `You received ${formatCurrency(totalIncome)} in total income across this statement.`,
      timeLabel: 'Period'
    });
  }

  // 24. Surface AI recommendations (max 3) as info alerts
  if (Array.isArray(ai.aiRecommendations)) {
    ai.aiRecommendations.slice(0, 3).forEach((rec, i) => {
      push({
        id: `ai-recommendation-${i}`,
        type: 'info',
        title: 'AI Recommendation',
        description: rec,
        timeLabel: 'AI'
      });
    });
  }

  // ---- Deduplicate + sort by severity priority ----
  const priority = { critical: 0, warning: 1, success: 2, info: 3 };
  alerts.sort((a, b) => (priority[a.type] ?? 4) - (priority[b.type] ?? 4));

  return alerts;
}

// ---------------------------------------------------------------------------
// Severity count chips
// ---------------------------------------------------------------------------
function SeverityChips({ alerts }) {
  const counts = alerts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});

  const present = SEVERITY_CHIPS.filter((c) => counts[c.type] > 0);
  if (present.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {present.map((c) => (
        <span
          key={c.type}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.cls}`}
        >
          <span className="tabular-nums">{counts[c.type]}</span>
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single alert card
// ---------------------------------------------------------------------------
function AlertCard({ alert, index, detailed }) {
  const cfg = ALERT_TYPES[alert.type] || ALERT_TYPES.info;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      title={alert.description}
      className={`group relative flex items-start gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3.5 transition-colors duration-300 hover:border-white/20 ${cfg.hover}`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${cfg.bar}`} />
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}>
        {cfg.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className={`truncate text-sm font-semibold ${cfg.title}`}>{alert.title}</h4>
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.badge}`}>
            {alert.timeLabel}
          </span>
        </div>
        <p className={`mt-0.5 text-xs leading-relaxed text-slate-400 ${detailed ? 'line-clamp-2' : 'truncate'}`}>
          {alert.description}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// AI Alert Center
// ---------------------------------------------------------------------------
export default function AiAlertCenter({ latest, summary, loading }) {
  const alerts = useMemo(() => buildAlerts({ latest, summary }), [latest, summary]);
  const [expanded, setExpanded] = useState(false);

  // Reset the expanded state whenever the underlying data changes
  useEffect(() => {
    setExpanded(false);
  }, [latest, summary]);

  const visibleAlerts = expanded ? alerts : alerts.slice(0, 3);
  const hasAlerts = alerts.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="mt-8"
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
            <BellIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">AI Alerts</h2>
            <p className="max-w-[280px] truncate text-xs text-slate-500 sm:max-w-sm">
              {latest ? `From ${latest.originalFileName}` : 'Smart alerts from your latest statement'}
            </p>
          </div>
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          Smart
        </span>
      </div>

      {/* Severity count chips */}
      {!loading && hasAlerts && (
        <div className="mb-3">
          <SeverityChips alerts={alerts} />
        </div>
      )}

      {loading ? (
        // Subtle skeleton while data is loading
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
                <div className="h-2.5 w-full animate-pulse rounded-full bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : hasAlerts ? (
        <>
          {/* Alert cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleAlerts.map((alert, index) => (
              <AlertCard key={alert.id} alert={alert} index={index} detailed={expanded} />
            ))}
          </div>

          {/* View all / show less toggle */}
          {alerts.length > 3 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              >
                {expanded ? (
                  <>
                    Show less
                    <ChevronUpIcon />
                  </>
                ) : (
                  <>
                    View all alerts ({alerts.length})
                    <ChevronDownIcon />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        // No alerts — all clear
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
            <CheckCircleIcon />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-emerald-300">All clear</h4>
            <p className="truncate text-xs text-slate-400">Everything looks good. No financial alerts.</p>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}

