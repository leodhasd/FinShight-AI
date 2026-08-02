import React from 'react';
import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Upload Your Statement',
    desc: 'Drag and drop your PDF or CSV bank statement. We support SBI, HDFC, ICICI, Axis, Canara, and Indian Bank formats.',
    gradient: 'from-indigo-500 to-blue-500',
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    )
  },
  {
    number: '02',
    title: 'AI-Powered Parsing',
    desc: 'Our engine automatically extracts every transaction — date, description, amount, and balance — with 99.8% accuracy.',
    gradient: 'from-fuchsia-500 to-pink-500',
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    )
  },
  {
    number: '03',
    title: 'Analyze & Export',
    desc: 'View interactive dashboards with filters, charts, and AI insights. Export your transactions to CSV anytime.',
    gradient: 'from-cyan-500 to-teal-500',
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    )
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.25 }
  }
};

const stepVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/3 h-72 w-72 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute right-0 bottom-1/3 h-72 w-72 rounded-full bg-fuchsia-500/5 blur-3xl" />
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
            How It Works
          </div>
          <h2 className="section-title">
            Three Simple Steps to{' '}
            <span className="gradient-text">Financial Clarity</span>
          </h2>
          <p className="section-subtitle">
            Get started in minutes. No technical knowledge required.
          </p>
        </motion.div>

        <motion.div
          className="relative grid gap-8 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Connecting line */}
          <div className="absolute left-1/2 top-16 hidden h-[calc(100%-6rem)] w-px -translate-x-1/2 bg-gradient-to-b from-indigo-500/40 via-fuchsia-500/40 to-cyan-500/40 md:block" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              variants={stepVariants}
              className="glass-card relative rounded-2xl p-8 text-center md:text-left"
            >
              <div className={`inline-flex rounded-2xl bg-gradient-to-br ${step.gradient} p-4 text-white`}>
                {step.icon}
              </div>
              <div className="mt-6">
                <span className="text-xs font-semibold tracking-widest text-[rgb(var(--color-muted))]">
                  STEP {step.number}
                </span>
                <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--color-muted))]">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

