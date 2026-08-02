import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  Sector
} from 'recharts';

// ---------------------------------------------------------------------------
// Colour palette (premium, modern dashboard tones)
// ---------------------------------------------------------------------------
const COLORS = {
  income: '#34d399',
  incomeDeep: '#059669',
  expense: '#fb7185',
  expenseDeep: '#be123c',
  savings: '#a78bfa',
  cashflow: '#22d3ee',
  pie: [
    '#818cf8', '#f472b6', '#22d3ee', '#fbbf24', '#34d399', '#a78bfa',
    '#fb7185', '#38bdf8', '#f97316', '#4ade80', '#e879f9', '#94a3b8'
  ]
};

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  })
};

// ---------------------------------------------------------------------------
// Formatting helpers (presentation only — values are never altered)
// ---------------------------------------------------------------------------
function formatINR(value) {
  const n = Math.round(Number(value) || 0);
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(n).toLocaleString('en-IN')}`;
}

function formatInt(value) {
  return String(Math.round(Number(value) || 0));
}

function formatCompact(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(abs >= 100000000 ? 0 : 1)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

function formatMonthLabel(key) {
  if (!key) return key;
  const [y, m] = String(key).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[Number(m) - 1] || key;
  return `${month} ${String(y).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Number count-up animation (Framer Motion)
// ---------------------------------------------------------------------------
function CountUp({ value, format, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(0, Number(value) || 0, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v)
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {format ? format(display) : display}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Chart loading simulation (visual only)
// ---------------------------------------------------------------------------
function useChartLoading(duration = 650) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(t);
  }, [duration]);
  return loading;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function TrendUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
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

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H5a2 2 0 00-2 2v9a2 2 0 002 2h15a1 1 0 001-1V8a1 1 0 00-1-1z" />
      <path d="M16 13h.01" />
      <path d="M3 9V6a2 2 0 012-2h12a2 2 0 012 2" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3L4 7l4 4" />
      <path d="M4 7h16" />
      <path d="M16 21l4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  );
}

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-4.35-9.5-8.5C.9 9.6 2.4 6 5.5 6c1.9 0 3.3 1.1 4 2.2C10.2 7.1 11.6 6 13.5 6c3.1 0 4.6 3.6 3 6.5C19 16.65 12 21 12 21z" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  );
}

function DonutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.2 15.9A10 10 0 118 2.8" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Card accents
// ---------------------------------------------------------------------------
const ACCENTS = {
  income: {
    bar: 'from-emerald-400/70 via-emerald-400/25 to-transparent',
    icon: 'bg-emerald-500/10 text-emerald-300',
    value: 'text-emerald-300'
  },
  expense: {
    bar: 'from-rose-400/70 via-rose-400/25 to-transparent',
    icon: 'bg-rose-500/10 text-rose-300',
    value: 'text-rose-300'
  },
  savings: {
    bar: 'from-violet-400/70 via-violet-400/25 to-transparent',
    icon: 'bg-violet-500/10 text-violet-300',
    value: 'text-violet-300'
  },
  cashflow: {
    bar: 'from-cyan-400/70 via-cyan-400/25 to-transparent',
    icon: 'bg-cyan-500/10 text-cyan-300',
    value: 'text-cyan-300'
  },
  health: {
    bar: 'from-indigo-400/70 via-indigo-400/25 to-transparent',
    icon: 'bg-indigo-500/10 text-indigo-300',
    value: 'text-indigo-300'
  }
};

function getHealthTone(score) {
  if (score >= 80) {
    return { label: 'Excellent', bar: 'bg-emerald-500', text: 'text-emerald-300' };
  }
  if (score >= 50) {
    return { label: 'Average', bar: 'bg-amber-500', text: 'text-amber-300' };
  }
  return { label: 'Needs Work', bar: 'bg-rose-500', text: 'text-rose-300' };
}

// ---------------------------------------------------------------------------
// Tooltips
// ---------------------------------------------------------------------------
function BarTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-sm">
      <p className="mb-1.5 font-semibold text-white">{label}</p>
      {payload.map((p, i) => {
        const color = p.dataKey === 'Income' ? COLORS.income : COLORS.expense;
        return (
          <p key={i} className="flex items-center gap-2 leading-relaxed text-slate-300">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="capitalize">{p.dataKey}:</span>
            <span className="font-semibold tabular-nums" style={{ color }}>{formatINR(p.value)}</span>
          </p>
        );
      })}
    </div>
  );
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-sm">
      <p className="font-semibold text-white">{d.name}</p>
      <p className="mt-0.5 tabular-nums text-slate-300">{formatINR(d.value)}</p>
      <p className="tabular-nums text-slate-400">{d.percent.toFixed(1)}% of expenses</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty / skeleton states
// ---------------------------------------------------------------------------
function ChartEmpty({ text }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

function ChartSkeleton({ variant = 'bar' }) {
  if (variant === 'donut') {
    return (
      <div className="flex h-[280px] items-center justify-center">
        <div className="h-44 w-44 animate-pulse rounded-full border-8 border-white/[0.06]" />
      </div>
    );
  }
  return (
    <div className="h-[300px] w-full">
      <div className="flex h-full items-end gap-2 sm:gap-3">
        {[40, 65, 50, 80, 55, 90, 60].map((h, i) => (
          <div key={i} className="flex h-full flex-1 items-end">
            <div className="w-full animate-pulse rounded-t-lg bg-white/[0.05]" style={{ height: `${h}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-8 animate-pulse rounded-xl bg-white/10" />
      </div>
      <div className="mt-3 h-7 w-28 animate-pulse rounded-lg bg-white/10" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-white/5" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------
function StatCard({ index, loading, label, icon, accent, value, format, valueClass, sub }) {
  if (loading) {
    return (
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={index}>
        <StatCardSkeleton />
      </motion.div>
    );
  }
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors duration-300 hover:border-white/20 sm:p-5"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent.bar}`} />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${accent.icon}`}>{icon}</span>
      </div>
      <div className={`mt-2.5 text-xl font-bold tracking-tight sm:text-2xl ${valueClass || accent.value || 'text-white'}`}>
        <CountUp value={value} format={format} />
      </div>
      {sub ? <div className="mt-1.5 truncate text-[11px] leading-snug text-slate-500">{sub}</div> : null}
    </motion.div>
  );
}

function HealthScoreCard({ index, loading, score, tone }) {
  if (loading) {
    return (
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={index}>
        <StatCardSkeleton />
      </motion.div>
    );
  }
  const clamped = Math.min(100, Math.max(0, Number(score) || 0));
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors duration-300 hover:border-white/20 sm:p-5"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${ACCENTS.health.bar}`} />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-400">Health Score</span>
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${ACCENTS.health.icon}`}>
          <HealthIcon />
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1">
        <CountUp value={clamped} format={formatInt} className={`text-2xl font-bold tracking-tight sm:text-2xl ${tone.text}`} />
        <span className="text-sm font-medium text-slate-500">/100</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className={`h-full rounded-full ${tone.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </div>
      <div className={`mt-2 text-[11px] font-semibold ${tone.text}`}>{tone.label}</div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Chart card wrapper
// ---------------------------------------------------------------------------
function ChartCard({ index, loading, skeleton, title, subtitle, icon, children }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors duration-300 hover:border-white/20 sm:p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-slate-300">
          {icon}
        </span>
      </div>
      {loading ? <ChartSkeleton variant={skeleton} /> : children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Chart 1 — Monthly Income vs Expense (animated bar chart)
// ---------------------------------------------------------------------------
function MonthlyBarChart({ monthlyBreakdown }) {
  if (!monthlyBreakdown || monthlyBreakdown.length === 0) {
    return <ChartEmpty text="No monthly data available" />;
  }

  const data = monthlyBreakdown.map((m) => ({
    name: formatMonthLabel(m.month),
    Income: m.income,
    Expense: m.expense
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }} barGap={6}>
          <defs>
            <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.income} />
              <stop offset="100%" stopColor={COLORS.incomeDeep} />
            </linearGradient>
            <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.expense} />
              <stop offset="100%" stopColor={COLORS.expenseDeep} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: 14, fontSize: 12, color: '#94a3b8' }}
          />
          <Bar
            dataKey="Income"
            fill="url(#gradIncome)"
            radius={[6, 6, 0, 0]}
            maxBarSize={26}
            animationDuration={900}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="Expense"
            fill="url(#gradExpense)"
            radius={[6, 6, 0, 0]}
            maxBarSize={26}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart 2 — Category-wise Spending (animated donut chart)
// ---------------------------------------------------------------------------
function CategoryDonut({ categoryExpenseShares }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!categoryExpenseShares) return <ChartEmpty text="No category data available" />;

  const entries = Object.entries(categoryExpenseShares)
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + Number(v), 0);

  if (entries.length === 0 || total <= 0) {
    return <ChartEmpty text="No spending categories found" />;
  }

  const data = entries.map(([name, value]) => ({
    name,
    value: Number(value),
    percent: (Number(value) / total) * 100
  }));

  const activeIndex = hoverIndex ?? 0;
  const active = data[activeIndex] || data[0];

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    );
  };

  const renderLabel = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (percent < 0.06) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#0f172a"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div>
      <div className="relative h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="86%"
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, i) => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              label={renderLabel}
              labelLine={false}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={COLORS.pie[i % COLORS.pie.length]}
                  stroke="rgba(2,6,23,0.5)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {hoverIndex === null ? (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Spent</span>
              <span className="mt-1 text-2xl font-bold tracking-tight text-white">{formatCompact(total)}</span>
            </>
          ) : (
            <>
              <span className="max-w-[130px] truncate px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {active.name}
              </span>
              <span className="mt-1 text-2xl font-bold tracking-tight text-white">{active.percent.toFixed(1)}%</span>
              <span className="mt-0.5 text-[11px] font-medium tabular-nums text-slate-400">{formatINR(active.value)}</span>
            </>
          )}
        </div>
      </div>

      {/* Modern legend */}
      <div className="mt-4 max-h-44 space-y-1 overflow-y-auto pr-1">
        {data.map((item, i) => (
          <div
            key={item.name}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
            className={`flex cursor-default items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-150 ${
              i === activeIndex ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: COLORS.pie[i % COLORS.pie.length] }}
              />
              <span className="truncate text-slate-300">{item.name}</span>
            </span>
            <span className="flex flex-shrink-0 items-center gap-3">
              <span className="text-sm font-semibold tabular-nums text-white">{formatINR(item.value)}</span>
              <span className="w-11 text-right text-xs tabular-nums text-slate-400">{item.percent.toFixed(1)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Analytics Dashboard
// ---------------------------------------------------------------------------
export default function FinancialAnalytics({ aiInsights }) {
  const isLoading = useChartLoading(650);

  if (!aiInsights) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center"
      >
        <p className="text-sm text-slate-400">No analytics data available.</p>
      </motion.div>
    );
  }

  const {
    totalIncome = 0,
    totalExpense = 0,
    totalSavings = 0,
    savingsRate = 0,
    financialHealthScore = 0,
    monthlyBreakdown = [],
    categoryExpenseShares = {},
    cashFlowSummary = null,
    creditCount = 0,
    debitCount = 0
  } = aiInsights;

  const netCashFlow = cashFlowSummary?.netCashFlow ?? totalSavings;
  const cashInflow = cashFlowSummary?.totalInflow ?? totalIncome;
  const cashOutflow = cashFlowSummary?.totalOutflow ?? totalExpense;
  const healthTone = getHealthTone(financialHealthScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex items-center gap-3"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-cyan-500/25 text-cyan-300 ring-1 ring-white/10">
          <AnalyticsIcon />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">Financial Analytics</h2>
          <p className="text-xs text-slate-500">A clear, at-a-glance view of your money</p>
        </div>
      </motion.div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          index={0}
          loading={isLoading}
          label="Total Income"
          icon={<TrendUpIcon />}
          accent={ACCENTS.income}
          value={totalIncome}
          format={formatINR}
          sub={creditCount ? `${creditCount} credit transactions` : 'No credits yet'}
        />
        <StatCard
          index={1}
          loading={isLoading}
          label="Total Expense"
          icon={<TrendDownIcon />}
          accent={ACCENTS.expense}
          value={totalExpense}
          format={formatINR}
          sub={debitCount ? `${debitCount} debit transactions` : 'No debits yet'}
        />
        <StatCard
          index={2}
          loading={isLoading}
          label="Net Savings"
          icon={<WalletIcon />}
          accent={ACCENTS.savings}
          value={totalSavings}
          format={formatINR}
          valueClass={totalSavings >= 0 ? 'text-emerald-300' : 'text-rose-300'}
          sub={<span>Savings rate <span className="font-semibold text-slate-300">{savingsRate.toFixed(1)}%</span></span>}
        />
        <StatCard
          index={3}
          loading={isLoading}
          label="Cash Flow"
          icon={<SwapIcon />}
          accent={ACCENTS.cashflow}
          value={netCashFlow}
          format={formatINR}
          valueClass={netCashFlow >= 0 ? 'text-cyan-300' : 'text-rose-300'}
          sub={<span>In {formatCompact(cashInflow)} · Out {formatCompact(cashOutflow)}</span>}
        />
        <HealthScoreCard index={4} loading={isLoading} score={financialHealthScore} tone={healthTone} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          index={0}
          loading={isLoading}
          skeleton="bar"
          title="Monthly Income vs Expense"
          subtitle="How your income and spending changed month by month"
          icon={<BarsIcon />}
        >
          <MonthlyBarChart monthlyBreakdown={monthlyBreakdown} />
        </ChartCard>
        <ChartCard
          index={1}
          loading={isLoading}
          skeleton="donut"
          title="Category-wise Spending"
          subtitle="Where your money went, by category"
          icon={<DonutIcon />}
        >
          <CategoryDonut categoryExpenseShares={categoryExpenseShares} />
        </ChartCard>
      </div>
    </div>
  );
}

