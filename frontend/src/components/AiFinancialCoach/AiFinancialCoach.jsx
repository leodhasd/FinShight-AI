import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Auth + API helpers (consistent with the rest of the app)
// ---------------------------------------------------------------------------
function getToken() {
  try {
    return localStorage.getItem('authToken') || sessionStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

async function askCoach(statementId, question) {
  const res = await fetch(`/api/statements/${statementId}/ai-coach/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({ question })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Failed to get an answer from the AI coach');
    err.response = { data, status: res.status };
    throw err;
  }

  return data?.data || {};
}

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------
const SUGGESTED_QUESTIONS = [
  'Where did I spend the most?',
  'How can I save more?',
  'Show my biggest expense.',
  'Give me financial advice.',
  'Why did I spend more this month?',
  'How is my financial health?'
];

const MAX_QUESTION_LENGTH = 500;

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M12 8V4" />
      <circle cx="12" cy="4" r="1.5" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
      <path d="M9 16h6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
function formatStatementName(name) {
  const s = String(name || '').trim();
  if (!s) return 'your statement';
  // If a long file name, show the base name only (before extension) truncated.
  const base = s.replace(/\.[^.]+$/, '');
  return base.length > 32 ? `${base.slice(0, 32)}…` : base;
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Lightweight inline markdown renderer (no external dependency)
// Preserves plain text formatting and adds bold / italic / inline code /
// lists / headings while keeping existing AI text intact.
// ---------------------------------------------------------------------------
function renderInline(text) {
  const escaped = String(text || '');
  const tokens = [];

  // Split on code spans first so we never style inside code.
  const parts = escaped.split(/(`[^`]+`)/g);
  parts.forEach((part) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      tokens.push(
        <code
          key={`code-${tokens.length}`}
          className="coach-md-code rounded px-1.5 py-0.5 font-mono text-[0.8em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    } else {
      // Bold
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      boldParts.forEach((bp) => {
        if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
          tokens.push(
            <strong key={`b-${tokens.length}`} className="coach-md-strong font-semibold">
              {bp.slice(2, -2)}
            </strong>
          );
        } else {
          // Italic
          const italicParts = bp.split(/(\*[^*]+\*)/g);
          italicParts.forEach((ip) => {
            if (ip.startsWith('*') && ip.endsWith('*') && ip.length > 2) {
              tokens.push(
                <em key={`i-${tokens.length}`} className="coach-md-em italic">
                  {ip.slice(1, -1)}
                </em>
              );
            } else if (ip) {
              tokens.push(ip);
            }
          });
        }
      });
    }
  });

  return tokens;
}

function renderRichText(text) {
  const source = String(text || '');
  const lines = source.split('\n');
  const blocks = [];
  let list = [];
  let listType = null;

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    const type = listType;
    blocks.push({ type: 'list', ordered: type === 'ordered', items });
    list = [];
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');

    // Empty line → flush any pending list
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) {
      flushList();
      blocks.push({ type: 'heading', level: hMatch[1].length, text: hMatch[2] });
      continue;
    }

    // Unordered list
    const uMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (uMatch) {
      if (listType !== 'unordered') flushList();
      listType = 'unordered';
      list.push(uMatch[1]);
      continue;
    }

    // Ordered list
    const oMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (oMatch) {
      if (listType !== 'ordered') flushList();
      listType = 'ordered';
      list.push(oMatch[1]);
      continue;
    }

    flushList();
    blocks.push({ type: 'paragraph', text: line });
  }
  flushList();

  return blocks;
}

function MarkdownBody({ text }) {
  const blocks = renderRichText(text);
  return (
    <div className="coach-markdown space-y-2">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          const size =
            block.level === 1
              ? 'text-[15px] font-bold'
              : block.level === 2
                ? 'text-sm font-bold'
                : block.level === 3
                  ? 'text-sm font-semibold'
                  : 'text-[13px] font-semibold';
          return (
            <p key={i} className={`coach-md-heading ${size}`}>
              {renderInline(block.text)}
            </p>
          );
        }
        if (block.type === 'list') {
          return block.ordered ? (
            <ol key={i} className="ml-1 list-decimal space-y-1 pl-4 marker:text-indigo-400">
              {block.items.map((item, j) => (
                <li key={j} className="pl-1 leading-relaxed">{renderInline(item)}</li>
              ))}
            </ol>
          ) : (
            <ul key={i} className="ml-1 list-disc space-y-1 pl-4 marker:text-indigo-400">
              {block.items.map((item, j) => (
                <li key={j} className="pl-1 leading-relaxed">{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-end"
      >
        <div className="flex max-w-[86%] flex-col items-end sm:max-w-[78%]">
          <div className="coach-user-bubble whitespace-pre-wrap rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed text-white">
            {message.text}
          </div>
          <span className="mt-1 pr-1 text-[10px] text-[rgb(var(--color-muted))]">{formatTime(message.at)}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-2.5"
    >
      <span className="coach-avatar mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white">
        <BotIcon />
      </span>
      <div className="max-w-[86%] sm:max-w-[78%]">
        <div className="ai-bubble px-4 py-3 text-sm leading-relaxed text-[rgb(var(--color-text))]">
          <MarkdownBody text={message.text} />
        </div>
        {Array.isArray(message.points) && message.points.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {message.points.map((point, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 + i * 0.05 }}
                className="flex items-start gap-2 text-xs leading-relaxed text-[rgb(var(--color-muted))]"
              >
                <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400" />
                <span className="whitespace-pre-wrap">{point}</span>
              </motion.li>
            ))}
          </ul>
        ) : null}
        <span className="mt-1 block pl-1 text-[10px] text-[rgb(var(--color-muted))]">{formatTime(message.at)}</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-2.5"
    >
      <span className="coach-avatar mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white">
        <BotIcon />
      </span>
      <div className="flex flex-col gap-1.5">
        <div className="ai-bubble flex items-center gap-2 px-4 py-3.5">
          <motion.span
            className="coach-dot block"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="coach-dot block"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
          />
          <motion.span
            className="coach-dot block"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
          <span className="ml-1 text-xs font-medium text-[rgb(var(--color-muted))]">AI is thinking...</span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Suggested chips
// ---------------------------------------------------------------------------
function SuggestedChips({ onSelect, disabled }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible"
    >
      {SUGGESTED_QUESTIONS.map((q, i) => (
        <motion.button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          disabled={disabled}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.04 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          className="coach-chip flex flex-shrink-0 items-center gap-1.5 sm:flex-shrink"
        >
          <span className="coach-chip-dot inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full" />
          {q}
        </motion.button>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Send button (with click ripple)
// ---------------------------------------------------------------------------
function SendButton({ disabled, thinking, onClick }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev, { id, x, y, size }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label="Send message"
      title="Send message"
      className="coach-send"
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="coach-ripple"
          style={{ width: r.size, height: r.size, left: r.x, top: r.y }}
        />
      ))}
      {thinking ? (
        <motion.span
          className="block h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        <SendIcon />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main AI Financial Coach widget
// ---------------------------------------------------------------------------
export default function AiFinancialCoach({ latest, summary, loading }) {
  const token = useMemo(() => getToken(), []);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const [asked, setAsked] = useState(false);
  const [focused, setFocused] = useState(false);

  const isProcessed = summary?.isProcessed === true;
  const hasStatement = Boolean(latest && latest.id);
  const trimmedInput = input.trim();
  const canSend = hasStatement && isProcessed && !thinking && trimmedInput.length > 0;

  // Auto-scroll to the bottom whenever messages / thinking state change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: messages.length > 0 || thinking ? 'smooth' : 'auto'
      });
    }
  }, [messages, thinking]);

  // Keep a welcome message in sync with the active statement.
  useEffect(() => {
    setMessages([
      {
        role: 'ai',
        text: hasStatement
          ? `Hi! I'm your AI Financial Coach. I've analysed ${formatStatementName(latest.originalFileName)} and can answer personalised questions about your spending, savings, income, and financial health.`
          : "Hi! I'm your AI Financial Coach. Upload and process a bank statement and I'll answer personalised questions about your finances.",
        at: new Date().toISOString()
      }
    ]);
    setError('');
    setAsked(false);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [hasStatement, latest]);

  // Reset the input after sending so the textarea height returns to normal.
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  const handleAsk = useCallback(
    async (rawQuestion) => {
      const question = String(rawQuestion || '').trim();
      if (!question || thinking) return;
      if (!hasStatement) {
        setError('Please upload and process a bank statement first.');
        return;
      }
      if (!isProcessed) {
        setError('Please process your statement first to unlock personalised answers.');
        return;
      }

      setAsked(true);
      setInput('');
      setError('');

      const userMessage = { role: 'user', text: question, at: new Date().toISOString() };
      setMessages((prev) => [...prev, userMessage]);
      setThinking(true);

      try {
        const data = await askCoach(latest.id, question);
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: data.answer || 'Here is your answer.',
            points: data.points || [],
            at: new Date().toISOString()
          }
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: e?.message || 'Sorry, I could not answer that right now. Please try again.',
            points: [],
            at: new Date().toISOString()
          }
        ]);
      } finally {
        setThinking(false);
        if (textareaRef.current) textareaRef.current.focus();
      }
    },
    [thinking, hasStatement, isProcessed, latest]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAsk(input);
  };

  const handleKeyDown = (e) => {
    // Enter sends; Shift+Enter inserts a new line.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk(input);
    }
  };

  const handleClearChat = () => {
    setMessages((prev) => prev.slice(0, 1));
    setAsked(false);
    setError('');
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.length > MAX_QUESTION_LENGTH) return;
    setInput(value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="mt-8"
    >
      {/* Modern header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="coach-avatar flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl"
            role="img"
            aria-label="AI Financial Coach"
          >
            🤖
          </motion.span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[rgb(var(--color-text))] sm:text-xl">
              AI Financial Coach
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[rgb(var(--color-muted))] sm:text-sm">
              Ask anything about your finances, spending, savings, or financial health.
            </p>
          </div>
        </div>
        <span
          className={`coach-status inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            isProcessed
              ? 'coach-status--online border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : 'coach-status--pending border-amber-500/30 bg-amber-500/15 text-amber-300'
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            {isProcessed ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            ) : null}
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isProcessed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </span>
          {isProcessed ? 'Online' : 'Pending'}
        </span>
      </div>

      {loading ? (
        // Subtle skeleton while the dashboard data loads
        <div className="coach-skeleton-card overflow-hidden rounded-3xl">
          <div className="h-[320px] space-y-3 p-4">
            <div className="coach-skeleton-bar h-3 w-2/3 animate-pulse rounded-full" />
            <div className="coach-skeleton-bar h-3 w-1/2 animate-pulse rounded-full" />
            <div className="coach-skeleton-bar h-3 w-3/4 animate-pulse rounded-full" />
            <div className="coach-skeleton-bar h-3 w-2/3 animate-pulse rounded-full" />
          </div>
          <div className="coach-divider border-t p-3">
            <div className="coach-skeleton-bar h-10 animate-pulse rounded-xl" />
          </div>
        </div>
      ) : !hasStatement ? (
        // No-statement empty state
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="coach-card rounded-3xl p-8 text-center"
        >
          <span className="coach-avatar mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-xl">
            🤖
          </span>
          <h4 className="mt-4 text-sm font-semibold text-[rgb(var(--color-text))]">No statement to analyse yet</h4>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[rgb(var(--color-muted))]">
            Upload a bank statement to start chatting with your AI Financial Coach about your income, expenses, savings, and financial health.
          </p>
          <a
            href="/dashboard/upload"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:-translate-y-0.5 hover:opacity-95"
          >
            Upload Statement
          </a>
        </motion.div>
      ) : (
        <div className="coach-card overflow-hidden rounded-3xl">
          {/* Chat header */}
          <div className="coach-chat-header flex items-center justify-between gap-3 border-b bg-gradient-to-r from-indigo-500/[0.06] to-fuchsia-500/[0.04] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                <BotIcon />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white/80 bg-emerald-400" />
                </span>
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-[rgb(var(--color-text))]">Chat with your coach</h3>
                <p className="truncate text-[11px] text-[rgb(var(--color-muted))]">
                  {isProcessed ? 'Answers are generated from your live statement data' : 'Process your statement to unlock personalised answers'}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {asked ? (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear chat"
                  className="coach-trash-btn flex h-8 w-8 items-center justify-center rounded-lg border transition"
                >
                  <TrashIcon />
                </button>
              ) : null}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="chat-scroll h-[340px] space-y-4 overflow-y-auto px-4 py-4 sm:h-[420px] sm:px-5"
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            <AnimatePresence>{thinking ? <TypingIndicator key="typing" /> : null}</AnimatePresence>
          </div>

{/* Error */}
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="coach-error-box mx-4 mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
            >
              <AlertIcon />
              <span>{error}</span>
            </motion.div>
          ) : null}

          {/* Suggested chips (shown until the user has asked something) */}
          {!asked && !thinking ? (
            <div className="coach-section-divider border-t px-4 py-3 sm:px-5 sm:py-4">
              <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--color-muted))]">
                Try asking
              </p>
              <SuggestedChips onSelect={(q) => handleAsk(q)} disabled={thinking || !isProcessed} />
            </div>
          ) : null}

          {/* Premium chat composer */}
          <form onSubmit={handleSubmit} className="coach-section-divider border-t p-3 sm:p-4">
            <div className="coach-composer">
              <div className="coach-composer__inner">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  rows={1}
                  placeholder="Ask me anything about your finances..."
                  disabled={thinking || !isProcessed}
                  className={`coach-textarea ${focused && input.length === 0 ? 'coach-caret' : ''}`}
                />
                <SendButton disabled={!canSend} thinking={thinking} onClick={() => handleAsk(input)} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[rgb(var(--color-muted))]">
              <span className="flex items-center gap-1.5">
                Press{' '}
<kbd className="coach-kbd rounded px-1 py-0.5 font-sans text-[9px]">
                  Enter
                </kbd>{' '}
                to send ·{' '}
                <kbd className="coach-kbd rounded px-1 py-0.5 font-sans text-[9px]">
                  Shift
                </kbd>{' '}
                +{' '}
<kbd className="coach-kbd rounded px-1 py-0.5 font-sans text-[9px]">
                  Enter
                </kbd>{' '}
                for a new line
              </span>
              <span className="tabular-nums">{input.length}/{MAX_QUESTION_LENGTH}</span>
            </div>
          </form>
        </div>
      )}
    </motion.section>
  );
}
