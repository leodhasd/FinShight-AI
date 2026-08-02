import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatCurrency(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
}

function formatMonthLabel(key) {
  if (!key) return null;
  const [y, m] = String(key).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const name = months[Number(m) - 1];
  return name ? `${name} ${String(y).slice(2)}` : key;
}

function clampPct(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

// ---------------------------------------------------------------------------
// Goal derivation helpers
// ---------------------------------------------------------------------------
function latestMonthOf(ai) {
  const breakdown = Array.isArray(ai.monthlyBreakdown)
    ? ai.monthlyBreakdown.slice().sort((a, b) => (String(a.month) < String(b.month) ? -1 : 1))
    : [];
  return breakdown[breakdown.length - 1] || null;
}

function computeGoal({ current, target, higherIsBetter }) {
  const cur = Number(current) || 0;
  const tgt = Number(target) || 0;

  let progress = 0;
  if (tgt > 0) {
    // For "lower is better" goals, hitting 0 current means the goal is met.
    progress = higherIsBetter ? (cur / tgt) * 100 : tgt > 0 && cur > 0 ? (tgt / cur) * 100 : 100;
  }
  progress = clampPct(progress);

  const remaining = higherIsBetter ? Math.max(0, tgt - cur) : Math.max(0, cur - tgt);
  const surplus = higherIsBetter ? Math.max(0, cur - tgt) : Math.max(0, tgt - cur);

  let status = 'Behind';
  if (progress >= 100) status = 'Completed';
  else if (progress >= 50) status = 'On Track';

  return { current: cur, target: tgt, progress, remaining, surplus, status };
}

/**
 * Build 4 smart financial goals purely from existing AI insights data.
 * @param {Object} ai - summary.ai payload from /api/statements/:id/ai-insights
 * @returns {Array<Object>}
 */
function buildGoals(ai) {
  const totalIncome = Number(ai.totalIncome) || 0;
  const totalExpense = Number(ai.totalExpense) || 0;
  const totalSavings = Math.max(0, Number(ai.totalSavings) || 0);
  const avgDailySpending = Number(ai.averageDailySpending) || 0;
  const avgMonthlySpending = Number(ai.averageMonthlySpending) || 0;
  const cashFlow = ai.cashFlowSummary || {};
  const daysSpan = Number(cashFlow.daysSpan) || 1;

  const latest = latestMonthOf(ai);
  const monthlyIncome = latest ? Number(latest.income) || 0 : totalIncome;
  const monthlySavings = latest ? Number(latest.savings) || 0 : Number(ai.monthlySavings) || 0;
  const monthlyExpense = latest ? Number(latest.expense) || 0 : totalExpense;
  const monthLabel = latest ? formatMonthLabel(latest.month) : null;

  // Daily income → daily budget = 80% of daily income (fallback: modest headroom over current)
  const dailyIncome = totalIncome > 0 && daysSpan > 0 ? totalIncome / daysSpan : 0;
  const dailyTarget = dailyIncome > 0 ? dailyIncome * 0.8 : avgDailySpending > 0 ? avgDailySpending * 1.15 : 0;

  return [
    {
      id: 'monthly-savings',
      title: 'Monthly Savings Goal',
      description:
        'Save at least 20% of your monthly income to build wealth steadily and grow a strong financial cushion.',
      sub: monthLabel ? `Latest month · ${monthLabel}` : 'Based on your average monthly income',
      ...computeGoal({ current: monthlySavings, target: monthlyIncome * 0.2, higherIsBetter: true })
    },
    {
      id: 'expense-reduction',
      title: 'Expense Reduction Goal',
      description:
        'Keep your monthly expenses within 80% of your income so you always have a comfortable savings buffer.',
      sub: monthLabel ? `Latest month · ${monthLabel}` : 'Based on your average monthly income',
      ...computeGoal({ current: monthlyExpense, target: monthlyIncome * 0.8, higherIsBetter: false })
    },
    {
      id: 'emergency-fund',
      title: 'Emergency Fund Goal',
      description:
        'Build a safety net covering at least 3 months of essential living expenses for unexpected situations.',
      sub: '3× your average monthly spending',
      ...computeGoal({ current: totalSavings, target: avgMonthlySpending * 3, higherIsBetter: true })
    },
    {
      id: 'spending-control',
      title: 'Spending Control Goal',
      description:
        'Cap your average daily spending at 80% of your daily income to prevent lifestyle creep and overspending.',
      sub: dailyIncome > 0 ? '80% of your daily income' : 'A modest budget above your current daily spend',
      ...computeGoal({ current: avgDailySpending, target: dailyTarget, higherIsBetter: false })
    }
  ];
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function SavingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5a2 2 0 012-2h9a2 2 0 012 2v14" />
      <path d="M2 19h20" />
      <path d="M8 8h6" />
      <path d="M8 12h4" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M21 10v7h-7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14l3-4" />
      <path d="M3.3 18A9 9 0 0120.7 18" />
      <circle cx="12" cy="14" r="1.5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Visual configuration
// ---------------------------------------------------------------------------
const GOAL_META = {
  'monthly-savings': {
    icon: <SavingsIcon />,
    bar: 'from-violet-400/70 via-violet-400/25 to-transparent',
    iconBg: 'bg-violet-500/10 text-violet-300'
  },
  'expense-reduction': {
    icon: <TrendDownIcon />,
    bar: 'from-rose-400/70 via-rose-400/25 to-transparent',
    iconBg: 'bg-rose-500/10 text-rose-300'
  },
  'emergency-fund': {
    icon: <ShieldIcon />,
    bar: 'from-emerald-400/70 via-emerald-400/25 to-transparent',
    iconBg: 'bg-emerald-500/10 text-emerald-300'
  },
  'spending-control': {
    icon: <GaugeIcon />,
    bar: 'from-cyan-400/70 via-cyan-400/25 to-transparent',
    iconBg: 'bg-cyan-500/10 text-cyan-300'
  }
};

const STATUS_META = {
  Completed: {
    label: 'Completed',
    badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    text: 'text-emerald-300'
  },
  'On Track': {
    label: 'On Track',
    badge: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
    bar: 'bg-gradient-to-r from-cyan-500 to-sky-400',
    text: 'text-cyan-300'
  },
  Behind: {
    label: 'Behind',
    badge: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-400',
    text: 'text-amber-300'
  }
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

// ---------------------------------------------------------------------------
// Goal card
// ---------------------------------------------------------------------------
function GoalCard({ goal, index }) {
  const meta = GOAL_META[goal.id];
  const status = STATUS_META[goal.status] || STATUS_META.Behind;
  const isCompleted = goal.status === 'Completed';
  const statLabel = isCompleted ? 'Surplus' : 'Remaining';
  const statValue = isCompleted ? goal.surplus : goal.remaining;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors duration-300 hover:border-white/20 sm:p-5"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${meta.bar}`} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}>
            {meta.icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">{goal.title}</h3>
            <p className="truncate text-xs text-slate-500">{goal.sub}</p>
          </div>
        </div>
        <span
          className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${status.badge}`}
        >
          {isCompleted ? (
            <motion.span
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.35 }}
              className="text-[11px] leading-none"
            >
              ✓
            </motion.span>
          ) : null}
          {goal.status}
        </span>
      </div>

      {/* Description */}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">{goal.description}</p>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">{Math.round(goal.progress)}%</span>
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${status.text}`}>{goal.status}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            className={`h-full rounded-full ${status.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${goal.progress}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 + index * 0.1 }}
          />
        </div>
      </div>

      {/* Current / Target / Remaining */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Current</div>
          <div className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-200">
            {formatCurrency(goal.current)}
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Target</div>
          <div className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-200">
            {formatCurrency(goal.target)}
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{statLabel}</div>
          <div className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-200">
            {formatCurrency(statValue)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function GoalSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-white/5" />
          </div>
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2.5 w-full animate-pulse rounded-full bg-white/5" />
        <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-white/5" />
      </div>
      <div className="mt-4 h-1.5 w-full animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Smart Financial Goals widget
// ---------------------------------------------------------------------------
export default function FinancialGoals({ latest, summary, loading }) {
  const ai = useMemo(() => summary?.ai || {}, [summary]);
  const goals = useMemo(() => buildGoals(ai), [ai]);

  const isProcessed = summary?.isProcessed === true;
  const hasActivity = isProcessed && (Number(ai.totalIncome) > 0 || Number(ai.totalExpense) > 0 || Number(ai.transactionCount) > 0);

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
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
            <TargetIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Financial Goals</h2>
            <p className="max-w-[280px] truncate text-xs text-slate-500 sm:max-w-sm">
              {latest ? `Generated from ${latest.originalFileName}` : 'Smart goals from your latest statement'}
            </p>
          </div>
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-indigo-500/30 bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
          <SparkleIcon />
          Premium
        </span>
      </div>

      {/* Loading skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <GoalSkeleton key={i} />
          ))}
        </div>
      ) : !latest ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
            <TargetIcon />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white">No goals yet</h4>
            <p className="truncate text-xs text-slate-400">
              Upload a bank statement to automatically generate smart financial goals from your AI insights.
            </p>
          </div>
        </motion.div>
      ) : !isProcessed ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/[0.04] p-4"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
            <TargetIcon />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-amber-200">Statement not processed yet</h4>
            <p className="truncate text-xs text-slate-400">
              Process your latest statement to unlock smart financial goals.
            </p>
          </div>
        </motion.div>
      ) : !hasActivity ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
            <TargetIcon />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white">No financial activity found</h4>
            <p className="truncate text-xs text-slate-400">
              Your statement doesn't have enough transaction data to generate goals yet.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
        >
          {goals.map((goal, index) => (
            <GoalCard key={goal.id} goal={goal} index={index} />
          ))}
        </motion.div>
      )}
    </motion.section>
  );
}

