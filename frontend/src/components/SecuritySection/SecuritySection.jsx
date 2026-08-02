import React from 'react';
import { motion } from 'framer-motion';

const securityFeatures = [
  {
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Enterprise-Grade Security',
    desc: 'Your financial data is encrypted at rest and in transit using AES-256 and TLS 1.3 protocols.',
    gradient: 'from-indigo-500 to-blue-500'
  },
  {
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
    title: 'JWT-Authenticated Access',
    desc: 'Secure token-based authentication with automatic session expiry. Your data is isolated per user.',
    gradient: 'from-fuchsia-500 to-pink-500'
  },
  {
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
      </svg>
    ),
    title: 'Privacy First',
    desc: 'We never share your data with third parties. Statements are processed securely and deleted after analysis.',
    gradient: 'from-cyan-500 to-teal-500'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

export default function SecuritySection() {
  return (
    <section id="security" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-500/[0.03] blur-3xl" />
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
            Security & Privacy
          </div>
          <h2 className="section-title">
            Your Data is{' '}
            <span className="gradient-text">Safe with Us</span>
          </h2>
          <p className="section-subtitle">
            We employ bank-grade security measures to ensure your financial data
            remains confidential and protected at all times.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {securityFeatures.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="glass-card rounded-2xl p-8 text-center"
            >
              <div className={`inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 text-white`}>
                {feature.icon}
              </div>
              <h3 className="mt-6 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--color-muted))]">
                {feature.desc}
              </p>
              <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 mx-auto" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

