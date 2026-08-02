import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import AiAlertCenter from '../../components/AiAlertCenter/AiAlertCenter';
import FinancialGoals from '../../components/FinancialGoals/FinancialGoals';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatCurrency(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
}

function formatInt(value) {
  return String(Math.round(Number(value) || 0));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
}

function getFirstName(fullName) {
  return (fullName || '').trim().split(/\s+/)[0] || 'there';
}

function formatUploadDate(iso) {
  if (!iso) return '-';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(iso));
  } catch {
    return '-';
  }
}

function formatMonthLabel(key) {
  if (!key) return null;
  const [y, m] = String(key).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const name = months[Number(m) - 1];
  return name ? `${name} ${String(y).slice(2)}` : key;
}

function getToken() {
  try {
    return localStorage.getItem('authToken') || sessionStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

// ---------------------------------------------------------------------------
// Number count-up animation
// ---------------------------------------------------------------------------
function CountUp({ value, format, className, duration = 1.1 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(0, Number(value) || 0, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v)
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {format ? format(display) : Math.round(display)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H5a2 2 0 00-2 2v9a2 2 0 002 2h15a1 1 0 001-1V8a1 1 0 00-1-1z" />
      <path d="M16 13h.01" />
      <path d="M3 9V6a2 2 0 012-2h12a2 2 0 012 2" />
    </svg>
  );
}

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

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-4.35-9.5-8.5C.9 9.6 2.4 6 5.5 6c1.9 0 3.3 1.1 4 2.2C10.2 7.1 11.6 6 13.5 6c3.1 0 4.6 3.6 3 6.5C19 16.65 12 21 12 21z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
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

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------
function SectionHeading({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function SummaryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
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
// Summary stat card
// ---------------------------------------------------------------------------
function SummaryCard({ index, label, icon, accent, value, format, valueClass, sub, loading }) {
  if (loading) {
    return (
      <motion.div variants={fadeUpVariants} custom={index}>
        <SummaryCardSkeleton />
      </motion.div>
    );
  }
  return (
    <motion.div
      variants={fadeUpVariants}
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

// ---------------------------------------------------------------------------
// Financial Health Score card
// ---------------------------------------------------------------------------
function getHealthTone(score) {
  if (score >= 80) return { label: 'Excellent', bar: 'bg-emerald-500', text: 'text-emerald-300' };
  if (score >= 50) return { label: 'Average', bar: 'bg-amber-500', text: 'text-amber-300' };
  return { label: 'Needs Work', bar: 'bg-rose-500', text: 'text-rose-300' };
}

function HealthScoreCard({ index, score, loading }) {
  if (loading) {
    return (
      <motion.div variants={fadeUpVariants} custom={index}>
        <SummaryCardSkeleton />
      </motion.div>
    );
  }
  const clamped = Math.min(100, Math.max(0, Number(score) || 0));
  const tone = getHealthTone(clamped);
  const accent = { bar: 'from-indigo-400/70 via-indigo-400/25 to-transparent', icon: 'bg-indigo-500/10 text-indigo-300' };
  return (
    <motion.div
      variants={fadeUpVariants}
      custom={index}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors duration-300 hover:border-white/20 sm:p-5"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent.bar}`} />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-400">Health Score</span>
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${accent.icon}`}>
          <HealthIcon />
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1">
        <CountUp value={clamped} format={formatInt} className={`text-2xl font-bold tracking-tight ${tone.text}`} />
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
// Quick action card
// ---------------------------------------------------------------------------
function QuickActionCard({ index, icon, title, description, href, accent }) {
  return (
    <motion.a
      variants={fadeUpVariants}
      custom={index}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors duration-300 hover:border-white/20 sm:p-5"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent.bar}`} />
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.icon}`}>{icon}</span>
        <ArrowRightIcon />
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
    </motion.a>
  );
}

// ---------------------------------------------------------------------------
// Recent Statement card
// ---------------------------------------------------------------------------
function RecentStatementCard({ latest, summary, loading }) {
  return (
    <motion.div
      variants={fadeUpVariants}
      className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
            <DocumentIcon />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Statement</h3>
            <p className="text-xs text-slate-500">Your latest uploaded statement</p>
          </div>
        </div>
        {latest ? (
          <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
            Latest
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-5 flex-1 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/5" />
          <div className="h-3 w-1/3 animate-pulse rounded-full bg-white/5" />
        </div>
      ) : latest ? (
        <div className="mt-5 flex flex-1 flex-col">
          <div className="truncate text-base font-semibold text-white" title={latest.originalFileName}>
            {latest.originalFileName}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {latest.mimeType?.replace('application/', '') || 'File'}
            </span>
            <span>{formatBytes(latest.fileSizeBytes)}</span>
            <span className="text-slate-600">•</span>
            <span>Uploaded {formatUploadDate(latest.uploadedAt)}</span>
          </div>

          <div className="mt-5 flex items-end justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Transactions</div>
              <div className="mt-1 text-2xl font-bold text-white">
                {summary?.isProcessed ? (
                  <CountUp value={summary.transactionCount} format={formatInt} />
                ) : (
                  <span className="text-slate-500">Not processed</span>
                )}
              </div>
            </div>
            <a
              href={`/dashboard/statements/${latest.id}/transactions`}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
            >
              View Transactions
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-slate-400">No statements uploaded yet.</p>
          <a
            href="/dashboard/upload"
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95"
          >
            Upload Your First Statement
          </a>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// AI Quick Insight card
// ---------------------------------------------------------------------------
function AiInsightCard({ summary, latest, loading }) {
  return (
    <motion.div
      variants={fadeUpVariants}
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] to-fuchsia-500/[0.06] p-5 sm:p-6"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-500/60 to-fuchsia-500/60" />
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
          <SparkleIcon />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">AI Quick Insight</h3>
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
              AI
            </span>
          </div>
          <p className="text-xs text-slate-500">One smart takeaway from your data</p>
        </div>
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-11/12 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/5" />
          </div>
        ) : summary?.insight ? (
          <>
            <p className="text-sm leading-relaxed text-slate-300">“{summary.insight}”</p>
            <div className="mt-5 flex items-center gap-2 text-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span className="text-slate-500">Generated from your latest statement data</span>
            </div>
            <a
              href={`/dashboard/statements/${latest.id}/transactions`}
              className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
            >
              View Full AI Analytics
              <ArrowRightIcon />
            </a>
          </>
        ) : latest ? (
          <>
            <p className="text-sm leading-relaxed text-slate-400">
              Your latest statement hasn't been processed yet. Process it to unlock AI-powered financial insights and recommendations.
            </p>
            <a
              href={`/dashboard/statements/${latest.id}/transactions`}
              className="mt-5 inline-flex w-fit items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
            >
              View Statement
            </a>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-400">
              Upload your first bank statement to get AI-powered insights about your income, expenses, and savings.
            </p>
            <a
              href="/dashboard/upload"
              className="mt-5 inline-flex w-fit items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95"
            >
              Upload Statement
            </a>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const token = useRef(getToken()).current;

  const [me, setMe] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [error, setError] = useState('');

  // Derived summary from the latest statement (existing APIs only)
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Load profile
  useEffect(() => {
    let mounted = true;

    async function fetchMe() {
      if (!token) {
        setError('Not authenticated');
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Failed to load profile');
        if (mounted) setMe(data?.data || null);
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load profile');
      }
    }

    fetchMe();

    return () => {
      mounted = false;
    };
  }, [token]);

  // Load recent uploads
  useEffect(() => {
    let mounted = true;

    async function fetchUploads() {
      if (!token) return;
      setLoadingUploads(true);
      try {
        const res = await fetch('/api/uploads/bank-statements', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Failed to load uploads');
        if (mounted) setRecentUploads(data?.data?.uploads || []);
      } catch (e) {
        // Keep dashboard usable — don't override the main error
      } finally {
        if (mounted) setLoadingUploads(false);
      }
    }

    fetchUploads();

    return () => {
      mounted = false;
    };
  }, [token]);

  // Derive dashboard summary from the latest statement using existing endpoints.
  const latest = recentUploads[0] || null;

  useEffect(() => {
    if (!token || !latest) {
      setSummary(null);
      setSummaryLoading(false);
      return;
    }

    let mounted = true;
    setSummaryLoading(true);

    (async () => {
      try {
        // 1. Latest transaction → closing balance + total transaction count + processed flag
        const tRes = await fetch(
          `/api/statements/${latest.id}/transactions?limit=1&sortBy=date&sortOrder=desc`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const tData = await tRes.json().catch(() => ({}));
        const isProcessed = tData?.data?.isProcessed === true || tData?.data?.processed === true;
        const balance = tData?.data?.transactions?.[0]?.balance ?? null;
        const transactionCount = tData?.data?.pagination?.total ?? 0;

        let healthScore = 0;
        let thisMonthIncome = 0;
        let thisMonthExpense = 0;
        let netSavings = 0;
        let monthLabel = null;
        let insight = null;
        let ai = null;

        // 2. AI insights → health score, net savings, latest-month income/expense, one insight
        if (isProcessed) {
          const aiRes = await fetch(`/api/statements/${latest.id}/ai-insights`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const aiData = await aiRes.json().catch(() => ({}));
          ai = aiData?.data || {};
          const breakdown = Array.isArray(ai.monthlyBreakdown) ? ai.monthlyBreakdown : [];
          const latestMonth = breakdown.length > 0 ? breakdown[breakdown.length - 1] : null;

          healthScore = Number(ai.financialHealthScore) || 0;
          netSavings = Number(ai.totalSavings) || 0;
          thisMonthIncome = latestMonth ? Number(latestMonth.income) || 0 : Number(ai.totalIncome) || 0;
          thisMonthExpense = latestMonth ? Number(latestMonth.expense) || 0 : Number(ai.totalExpense) || 0;
          monthLabel = latestMonth ? formatMonthLabel(latestMonth.month) : null;
          insight =
            ai.aiRecommendations?.[0] ||
            ai.aiSummary?.[0] ||
            null;
        }

        if (mounted) {
          setSummary({
            isProcessed,
            balance,
            transactionCount,
            healthScore,
            thisMonthIncome,
            thisMonthExpense,
            netSavings,
            monthLabel,
            insight,
            ai
          });
        }
      } catch {
        if (mounted) setSummary(null);
      } finally {
        if (mounted) setSummaryLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, latest]);

  const firstName = me?.fullName ? getFirstName(me.fullName) : 'there';
  const greeting = getGreeting();
  const todayLabel = getTodayLabel();

  const loading = summaryLoading || loadingUploads;

  return (
    <div className="min-h-screen px-4 pb-16">
      <div className="mx-auto max-w-6xl pt-8 sm:pt-10">
        {/* ------------------- Premium Header ------------------- */}
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                {greeting}
              </span>
              <span className="hidden text-xs text-slate-500 sm:inline">•</span>
              <span className="hidden text-xs text-slate-400 sm:inline">{todayLabel}</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, <span className="gradient-text">{firstName}</span> 👋
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Here's a quick overview of your finances.
            </p>
          </div>

          <a
            href="/dashboard/upload"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:-translate-y-0.5 hover:opacity-95"
          >
            <UploadIcon />
            Upload Statement
          </a>
        </motion.header>

        {/* ------------------- Error ------------------- */}
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
          >
            {error}
          </motion.div>
        ) : null}

        {/* ------------------- Smart AI Alert Center ------------------- */}
        <AiAlertCenter latest={latest} summary={summary} loading={loading} />

        {/* ------------------- Smart Financial Goals ------------------- */}
        <FinancialGoals latest={latest} summary={summary} loading={loading} />

        {/* ------------------- Quick Summary ------------------- */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-10"
        >
          <SectionHeading title="Quick Summary" subtitle="Your finances at a glance" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
            <SummaryCard
              index={0}
              loading={loading}
              label="Current Balance"
              icon={<WalletIcon />}
              accent={{ bar: 'from-emerald-400/70 via-emerald-400/25 to-transparent', icon: 'bg-emerald-500/10 text-emerald-300' }}
              value={summary?.balance ?? 0}
              format={formatCurrency}
              valueClass={summary?.isProcessed ? 'text-white' : 'text-slate-500'}
              sub={summary?.isProcessed ? 'Latest closing balance' : 'No data yet'}
            />
            <SummaryCard
              index={1}
              loading={loading}
              label="This Month Income"
              icon={<TrendUpIcon />}
              accent={{ bar: 'from-emerald-400/70 via-emerald-400/25 to-transparent', icon: 'bg-emerald-500/10 text-emerald-300' }}
              value={summary?.thisMonthIncome ?? 0}
              format={formatCurrency}
              valueClass={summary?.thisMonthIncome ? 'text-emerald-300' : 'text-slate-500'}
              sub={summary?.monthLabel || 'No data yet'}
            />
            <SummaryCard
              index={2}
              loading={loading}
              label="This Month Expense"
              icon={<TrendDownIcon />}
              accent={{ bar: 'from-rose-400/70 via-rose-400/25 to-transparent', icon: 'bg-rose-500/10 text-rose-300' }}
              value={summary?.thisMonthExpense ?? 0}
              format={formatCurrency}
              valueClass={summary?.thisMonthExpense ? 'text-rose-300' : 'text-slate-500'}
              sub={summary?.monthLabel || 'No data yet'}
            />
            <SummaryCard
              index={3}
              loading={loading}
              label="Net Savings"
              icon={<SavingsIcon />}
              accent={{ bar: 'from-violet-400/70 via-violet-400/25 to-transparent', icon: 'bg-violet-500/10 text-violet-300' }}
              value={summary?.netSavings ?? 0}
              format={formatCurrency}
              valueClass={
                !summary?.isProcessed
                  ? 'text-slate-500'
                  : (summary.netSavings >= 0 ? 'text-violet-300' : 'text-rose-300')
              }
              sub="Income − expenses"
            />
            <HealthScoreCard index={4} score={summary?.healthScore ?? 0} loading={loading} />
          </div>
        </motion.section>

        {/* ------------------- Quick Actions ------------------- */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-10"
        >
          <SectionHeading title="Quick Actions" subtitle="Jump straight to what you need" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <QuickActionCard
              index={0}
              icon={<UploadIcon />}
              title="Upload Statement"
              description="Add a new PDF or CSV bank statement"
              href="/dashboard/upload"
              accent={{ bar: 'from-indigo-400/70 via-indigo-400/25 to-transparent', icon: 'bg-indigo-500/10 text-indigo-300' }}
            />
            <QuickActionCard
              index={1}
              icon={<ListIcon />}
              title="View Transactions"
              description={latest ? 'Browse and search your transaction history' : 'Upload a statement to view transactions'}
              href={latest ? `/dashboard/statements/${latest.id}/transactions` : '/dashboard/upload'}
              accent={{ bar: 'from-cyan-400/70 via-cyan-400/25 to-transparent', icon: 'bg-cyan-500/10 text-cyan-300' }}
            />
            <QuickActionCard
              index={2}
              icon={<AnalyticsIcon />}
              title="AI Analytics"
              description="Health score, trends, and smart recommendations"
              href={latest ? `/dashboard/statements/${latest.id}/transactions` : '/dashboard/upload'}
              accent={{ bar: 'from-fuchsia-400/70 via-fuchsia-400/25 to-transparent', icon: 'bg-fuchsia-500/10 text-fuchsia-300' }}
            />
            <QuickActionCard
              index={3}
              icon={<ExportIcon />}
              title="Export Reports"
              description="Download your transactions as CSV or JSON"
              href={latest ? `/dashboard/statements/${latest.id}/transactions` : '/dashboard/upload'}
              accent={{ bar: 'from-amber-400/70 via-amber-400/25 to-transparent', icon: 'bg-amber-500/10 text-amber-300' }}
            />
          </div>
        </motion.section>

        {/* ------------------- Recent Statement + AI Insight ------------------- */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          <RecentStatementCard latest={latest} summary={summary} loading={loadingUploads} />
          <AiInsightCard latest={latest} summary={summary} loading={summaryLoading} />
        </motion.section>
      </div>
    </div>
  );
}

