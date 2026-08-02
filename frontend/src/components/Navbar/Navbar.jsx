import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'AI Insights', href: '#ai-insights' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' }
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass border-b border-white/[0.06] shadow-xl shadow-black/5'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25">
              <span className="text-sm font-bold text-white">FS</span>
            </div>
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/40 blur-lg -z-10" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">FinSight AI</div>
            <div className="text-[11px] text-[rgb(var(--color-muted))]">AI-Powered Analysis</div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-4 py-2 text-sm text-[rgb(var(--color-muted))] transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="hidden rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 sm:inline-block"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="btn-primary !px-4 !py-2 text-sm"
          >
            Get Started
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 md:hidden"
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1.5">
              <motion.span
                className="block h-0.5 w-5 bg-white/60"
                animate={mobileOpen ? { rotate: 45, y: 3 } : { rotate: 0, y: 0 }}
              />
              <motion.span
                className="block h-0.5 w-5 bg-white/60"
                animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
              />
              <motion.span
                className="block h-0.5 w-5 bg-white/60"
                animate={mobileOpen ? { rotate: -45, y: -3 } : { rotate: 0, y: 0 }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/5 md:hidden"
          >
            <div className="glass px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm text-[rgb(var(--color-muted))] transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-2 border-t border-white/5">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm text-[rgb(var(--color-muted))] hover:text-white"
                >
                  Login
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

