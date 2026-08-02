import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

function AnimatedCounter({ end, suffix = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!isInView) return;
    let startTime;
    const duration = 2000;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, end]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

export default function AIInsightsPreview() {
  return (
    <section id="ai-insights" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute left-0 bottom-0 h-64 w-64 rounded-full bg-fuchsia-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="section-label">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            AI-Powered Analytics
          </div>
          <h2 className="section-title">
            Intelligent Insights at Your{' '}
            <span className="gradient-text">Fingertips</span>
          </h2>
          <p className="section-subtitle">
            Our AI engine automatically categorizes transactions, detects anomalies,
            and generates actionable financial insights from your bank statements.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Live Stats Cards */}
          {[
            { label: 'Transactions Analyzed', end: 128400, suffix: '+', color: 'from-indigo-500 to-blue-500', desc: 'Processed across all banks' },
            { label: 'Accuracy Rate', end: 99, suffix: '.8%', color: 'from-emerald-500 to-teal-500', desc: 'Transaction extraction precision' },
            { label: 'Banks Supported', end: 12, suffix: '', color: 'from-fuchsia-500 to-pink-500', desc: 'Major Indian banks covered' }
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="glass-card rounded-2xl p-8 text-center"
            >
              <div className={`inline-flex rounded-xl bg-gradient-to-br ${stat.color} p-3 text-2xl`}>
                <AnimatedCounter end={stat.end} suffix={stat.suffix} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{stat.label}</h3>
              <p className="mt-2 text-sm text-[rgb(var(--color-muted))]">{stat.desc}</p>
            </motion.div>
          ))}

          {/* Preview Dashboard Card */}
          <motion.div
            variants={itemVariants}
            className="glass-card col-span-full rounded-2xl overflow-hidden"
          >
            <div className="border-b border-white/5 bg-white/[0.02] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-xs text-[rgb(var(--color-muted))]">AI Insights Dashboard · Live Preview</span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                    <span className="text-sm text-[rgb(var(--color-muted))]">Total Credits</span>
                    <span className="text-sm font-semibold text-emerald-400">₹4,52,890.00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                    <span className="text-sm text-[rgb(var(--color-muted))]">Total Debits</span>
                    <span className="text-sm font-semibold text-red-400">₹3,21,450.00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                    <span className="text-sm text-[rgb(var(--color-muted))]">Net Balance</span>
                    <span className="text-sm font-semibold text-sky-400">₹1,31,440.00</span>
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4">
                  <div className="text-xs text-[rgb(var(--color-muted))] mb-3">Monthly Spending Trend</div>
                  <div className="flex items-end gap-2 h-24">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500 to-fuchsia-500"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-[rgb(var(--color-muted))]">
                    <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Dec</span>
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

