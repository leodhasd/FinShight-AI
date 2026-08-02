import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const floatingVariants = {
  animate: {
    y: [0, -15, 0],
    transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-24 pb-16">
      {/* Background Gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-48 -left-48 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -top-48 right-0 h-[400px] w-[400px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[100px]" />
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4">
        <motion.div
          className="grid gap-12 lg:grid-cols-2 lg:items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Content */}
          <div className="relative">
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                AI-Powered Bank Statement Analysis
              </div>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl"
            >
              Upload, Parse, and{' '}
              <span className="gradient-text">Analyze</span>
              {' '}Bank Statements with AI
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-xl text-lg leading-relaxed text-[rgb(var(--color-muted))]"
            >
              Instantly extract transactions from PDF and CSV bank statements.
              Supports SBI, HDFC, ICICI, Axis, and more. Visualize your finances
              with interactive dashboards and AI-powered insights.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-col gap-4 sm:flex-row"
            >
              <Link to="/register" className="btn-primary text-base">
                Get Started Free
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link to="/login" className="btn-secondary text-base">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign In
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={itemVariants}
              className="mt-12 grid grid-cols-3 gap-6"
            >
              {[
                { value: '12+', label: 'Banks Supported' },
                { value: '99.8%', label: 'Accuracy Rate' },
                { value: '5K+', label: 'Statements Parsed' }
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold gradient-text">{s.value}</div>
                  <div className="mt-1 text-xs text-[rgb(var(--color-muted))]">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <motion.div
            variants={itemVariants}
            className="relative"
          >
            {/* Floating elements */}
            <motion.div
              className="absolute -right-4 -top-4 z-10 hidden lg:block"
              variants={floatingVariants}
              animate="animate"
            >
              <div className="glass-card rounded-2xl px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-emerald-300">Live Parsing</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute -bottom-4 -left-4 z-10 hidden lg:block"
              variants={floatingVariants}
              animate="animate"
              style={{ animationDelay: '2s' }}
            >
              <div className="glass-card rounded-2xl px-5 py-3">
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-indigo-300">99.8% Accurate</span>
                </div>
              </div>
            </motion.div>

            {/* Main dashboard card */}
            <div className="glass-card rounded-3xl p-1">
              <div className="rounded-[calc(1.5rem-1px)] bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-6">
                {/* Window controls */}
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400/70" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 text-xs text-[rgb(var(--color-muted))]">FinSight AI Dashboard</span>
                </div>

                {/* Preview content */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
                    <span className="text-sm text-[rgb(var(--color-muted))]">Total Transactions</span>
                    <span className="text-sm font-semibold">1,284 extracted</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
                    <span className="text-sm text-[rgb(var(--color-muted))]">Total Credits</span>
                    <span className="text-sm font-semibold text-emerald-400">₹4,52,890.00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
                    <span className="text-sm text-[rgb(var(--color-muted))]">Total Debits</span>
                    <span className="text-sm font-semibold text-red-400">₹3,21,450.00</span>
                  </div>
                </div>

                {/* Mini preview of transaction rows */}
                <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-4">
                  <div className="text-xs text-[rgb(var(--color-muted))] mb-2">Sample Transaction Data</div>
                  <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-300">
{`01/04/2024  NEFT TRANSFER      1,500.00     0    45,230.00
02/04/2024  ATM WITHDRAWAL         0     2,000.00  43,230.00
03/04/2024  SALARY CREDIT      55,000.00     0    98,230.00`}
                  </pre>
                </div>

                {/* Bar chart mini */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-xs text-[rgb(var(--color-muted))]">Income</div>
                    <div className="mt-1 h-12 flex items-end gap-1">
                      {[50, 70, 45, 85, 60, 90].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500 to-fuchsia-500" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-xs text-[rgb(var(--color-muted))]">Expenses</div>
                    <div className="mt-1 h-12 flex items-end gap-1">
                      {[35, 55, 40, 70, 45, 60].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-500 to-teal-500" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

