import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, animate, useMotionValue } from 'framer-motion';
import { computeHealthScore } from './healthScore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatInt(value) {
  return String(Math.round(Number(value) || 0));
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
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

function LightbulbIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H5a2 2 0 00-2 2v9a2 2 0 002 2h15a1 1 0 001-1V8a1 1 0 00-1-1z" />
      <path d="M16 13h.01" />
    </svg>
  );
}

// Recommendation type → visual config
const REC_TYPE = {
  positive: { icon: <CheckIcon />, cls: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300', bar: 'from-emerald-400/70 via-emerald-400/25 to-transparent' },
  action: { icon: <LightbulbIcon />, cls: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-300', bar: 'from-amber-400/70 via-amber-400/25 to-transparent' },
  info: { icon: <TrendUpIcon />, cls: 'border-sky-500/20 bg-sky-500/[0.06] text-sky-300', bar: 'from-sky-400/70 via-sky-400/25 to-transparent' }
};

// ---------------------------------------------------------------------------
// Radial gauge (animated circular progress indicator)
// ---------------------------------------------------------------------------

/**
 * Convert a "clock angle" (0° = 12 o'clock, clockwise) to SVG cartesian coords.
 */
function polarToCartesian(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad)
  };
}

/**
 * Describe a circular-arc path in clock-angle degrees.
 * startAngle=225 (bottom-left) → endAngle=495 (bottom-right) sweeps 270° over
 * the top — the classic gauge look with a 90° gap at the bottom.
 */
function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function RadialGauge({ score, stroke, size = 190 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const animated = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  const clamped = Math.min(100, Math.max(0, Number(score) || 0));
  const progress = clamped / 100;
  const strokeWidth = 13;
  const radius = (size - strokeWidth) / 2;
  const arc = describeArc(size / 2, size / 2, radius, 225, 495);

  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(0, clamped, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        animated.set(v);
        setDisplay(v);
      }
    });
    return () => controls.stop();
  }, [inView, clamped, animated]);

  return (
    <div ref={ref} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stroke} />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Background track (full 270° gauge) */}
        <path
          d={arc}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={1}
        />

        {/* Progress arc — animated via pathLength */}
        <motion.path
          d={arc}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          style={{ filter: `drop-shadow(0 0 8px ${stroke}66)` }}
        />
      </svg>

      {/* Center readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Health Score</span>
        <div className="mt-0.5 flex items-baseline gap-0.5">
          <span className="text-4xl font-bold tracking-tight text-white tabular-nums sm:text-5xl">
            {formatInt(display)}
          </span>
          <span className="text-lg font-semibold text-slate-500">/100</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Factor breakdown row
// ---------------------------------------------------------------------------
function FactorRow({ factor, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 + index * 0.06 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-slate-200">{factor.label}</span>
        <span className="flex-shrink-0 text-xs tabular-nums text-slate-400">
          {factor.score}<span className="text-slate-600">/100</span>
          {factor.display ? <span className="ml-1.5 text-slate-500">· {factor.display}</span> : null}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
          initial={{ width: 0 }}
          animate={{ width: `${factor.score}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 + index * 0.07 }}
        />
      </div>
      {factor.hint ? <p className="mt-1.5 text-[10px] leading-snug text-slate-500">{factor.hint}</p> : null}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Recommendation card
// ---------------------------------------------------------------------------
function RecommendationItem({ rec, index }) {
  const cfg = REC_TYPE[rec.type] || REC_TYPE.info;
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.07 }}
      className={`relative flex items-start gap-2.5 overflow-hidden rounded-xl border p-3 ${cfg.cls}`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${cfg.bar}`} />
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
        {cfg.icon}
      </span>
      <p className="min-w-0 text-xs leading-relaxed text-slate-300">{rec.text}</p>
    </motion.li>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function HealthScoreSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 animate-pulse rounded-xl bg-white/10" />
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="h-2.5 w-24 animate-pulse rounded-full bg-white/5" />
        </div>
      </div>
      <div className="mt-5 flex justify-center">
        <div className="h-44 w-44 animate-pulse rounded-full border-8 border-white/[0.06]" />
      </div>
      <div className="mt-5 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty / inline state
// ---------------------------------------------------------------------------
function InlineState({ icon, title, subtitle, href, cta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{subtitle}</p>
      </div>
      {href ? (
        <a
          href={href}
          className="inline-flex flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95"
        >
          {cta || 'Upload Statement'}
        </a>
      ) : null}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------
export default function FinancialHealthScore({ latest, summary, loading }) {
  const ai = useMemo(() => summary?.ai || {}, [summary]);
  const health = useMemo(() => computeHealthScore(ai), [ai]);

  const isProcessed = summary?.isProcessed === true;
  const hasActivity =
    isProcessed &&
    (Number(ai.totalIncome) > 0 || Number(ai.totalExpense) > 0 || Number(ai.transactionCount) > 0);
  const hasRecommendations = health.recommendations.length > 0;

  const tone = health.tone;
  const accentBar = 'from-emerald-400/70 via-emerald-400/25 to-transparent';

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
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
            <GaugeIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">AI Financial Health Score</h2>
            <p className="max-w-[280px] truncate text-xs text-slate-500 sm:max-w-sm">
              {latest ? `Generated from ${latest.originalFileName}` : 'A 0–100 score from your analytics'}
            </p>
          </div>
        </div>
        <span className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${tone.chip}`}>
          <SparkleIcon />
          AI Powered
        </span>
      </div>

      {/* Loading skeletons */}
      {loading ? (
        <HealthScoreSkeleton />
      ) : !latest ? (
        <InlineState
          icon={<GaugeIcon />}
          title="No score yet"
          subtitle="Upload a bank statement to generate your personalised AI Financial Health Score."
          href="/dashboard/upload"
        />
      ) : !isProcessed ? (
        <InlineState
          icon={<GaugeIcon />}
          title="Statement not processed yet"
          subtitle="Process your latest statement to unlock your AI Financial Health Score and recommendations."
          href={`/dashboard/statements/${latest.id}/transactions`}
          cta="Process Statement"
        />
      ) : !hasActivity ? (
        <InlineState
          icon={<GaugeIcon />}
          title="No financial activity found"
          subtitle="Your statement doesn't have enough transaction data to compute a health score yet."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Left: radial gauge + status */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors duration-300 hover:border-white/20 lg:col-span-2"
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accentBar}`} />
            <RadialGauge score={health.score} stroke={tone.stroke} />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${tone.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              {tone.label}
            </motion.div>
            <p className="mt-2.5 text-center text-[11px] leading-relaxed text-slate-500">
              Weighted from your savings rate, income vs expenses, spending consistency &amp; cash flow.
            </p>
          </motion.div>

          {/* Right: factor breakdown + recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="lg:col-span-3"
          >
            <div className="flex h-full flex-col gap-4">
              {/* Factor breakdown */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Why this score</h3>
                  <span className="text-[10px] text-slate-500">Factor breakdown</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {health.factors.map((factor, i) => (
                    <FactorRow key={factor.key} factor={factor} index={i} />
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                      <SparkleIcon />
                    </span>
                    AI Recommendations
                  </h3>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    {health.recommendations.length}
                  </span>
                </div>

                {hasRecommendations ? (
                  <ul className="space-y-2">
                    {health.recommendations.map((rec, i) => (
                      <RecommendationItem key={i} rec={rec} index={i} />
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-slate-400">
                    No recommendations yet. Upload and process a statement with transaction data to unlock personalised AI recommendations.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.section>
  );
}

