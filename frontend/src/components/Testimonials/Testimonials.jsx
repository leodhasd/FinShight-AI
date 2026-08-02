import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const testimonials = [
  {
    quote: "FinSight AI saved us countless hours of manual data entry. The statement parsing is incredibly accurate, even for complex multi-page PDFs.",
    author: 'Priya Sharma',
    role: 'CFO, TechVentures India',
    rating: 5,
    gradient: 'from-indigo-500 to-blue-500'
  },
  {
    quote: "The AI insights feature is a game-changer. We can now spot spending patterns and anomalies that we would have otherwise missed.",
    author: 'Rahul Verma',
    role: 'Finance Manager, GrowthCorp',
    rating: 5,
    gradient: 'from-fuchsia-500 to-pink-500'
  },
  {
    quote: "Setting up was a breeze. Uploaded my first statement and within seconds had all transactions neatly extracted. Highly recommend!",
    author: 'Ananya Patel',
    role: 'Independent Accountant',
    rating: 5,
    gradient: 'from-cyan-500 to-teal-500'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

export default function Testimonials() {
  const [active, setActive] = useState(0);

  return (
    <section id="testimonials" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-1/4 top-0 h-80 w-80 rounded-full bg-fuchsia-500/[0.03] blur-3xl" />
        <div className="absolute left-1/4 bottom-0 h-80 w-80 rounded-full bg-indigo-500/[0.03] blur-3xl" />
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
            Testimonials
          </div>
          <h2 className="section-title">
            Trusted by{' '}
            <span className="gradient-text">Finance Professionals</span>
          </h2>
          <p className="section-subtitle">
            See what our users say about their experience with FinSight AI.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              variants={cardVariants}
              className="glass-card group relative rounded-2xl p-8"
              onMouseEnter={() => setActive(i)}
            >
              {/* Quote mark */}
              <div className="absolute -top-3 -left-3 text-6xl leading-none text-indigo-500/20 select-none">
                &ldquo;
              </div>

              {/* Rating */}
              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <svg key={j} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--color-muted))]">
                "{t.quote}"
              </p>

              <div className="mt-6 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} text-sm font-bold text-white`}>
                  {t.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.author}</div>
                  <div className="text-xs text-[rgb(var(--color-muted))]">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

