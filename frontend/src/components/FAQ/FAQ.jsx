import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    q: 'How do I get started with FinSight AI?',
    a: 'Simply create a free account, upload your bank statement (PDF or CSV), and our AI will automatically extract all transactions. No credit card required.'
  },
  {
    q: 'Which banks are supported?',
    a: 'We currently support SBI, HDFC, ICICI, Axis Bank, Canara Bank, and Indian Bank. We are continuously adding support for more banks.'
  },
  {
    q: 'Is my financial data secure?',
    a: 'Absolutely. All data is encrypted using AES-256 at rest and TLS 1.3 in transit. We use JWT-based authentication and never share your data with third parties.'
  },
  {
    q: 'Can I export my transaction data?',
    a: 'Yes! You can export all your transactions to CSV format for use in Excel, Google Sheets, or your accounting software.'
  },
  {
    q: 'What file formats are supported?',
    a: 'We support both PDF and CSV bank statement formats. Our parser handles multi-page PDFs, multi-line descriptions, and Indian number formats.'
  },
  {
    q: 'Is there a limit on the number of statements?',
    a: 'Free accounts can upload up to 5 statements per month. Premium plans offer unlimited uploads and advanced analytics features.'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

function FAQItem({ faq, isOpen, onClick, index }) {
  return (
    <motion.div
      variants={itemVariants}
      className="glass-card rounded-2xl overflow-hidden"
    >
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-xs font-bold text-indigo-300">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-sm font-medium">{faq.q}</span>
        </span>
        <motion.svg
          className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted))]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-6 py-4">
              <p className="text-sm leading-relaxed text-[rgb(var(--color-muted))]">
                {faq.a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-3xl" />
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
            FAQ
          </div>
          <h2 className="section-title">
            Frequently Asked{' '}
            <span className="gradient-text">Questions</span>
          </h2>
          <p className="section-subtitle">
            Everything you need to know about FinSight AI.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto max-w-3xl space-y-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openIndex === i}
              onClick={() => toggle(i)}
              index={i}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

