import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  const toggle = () => {
    const newDark = !dark;
    setDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  return (
    <button
      onClick={toggle}
      className="relative flex h-8 w-14 items-center rounded-full border border-white/10 bg-white/5 p-1 transition-all hover:bg-white/10"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-xs"
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        animate={{ x: dark ? 0 : 24 }}
      >
        {dark ? '🌙' : '☀️'}
      </motion.div>
    </button>
  );
}

