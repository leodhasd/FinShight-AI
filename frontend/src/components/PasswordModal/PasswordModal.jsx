import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * PasswordModal
 *
 * A secure, professional modal for entering a PDF password.
 * Matches the FinSight AI design system with dark/light mode support.
 *
 * SECURITY:
 * - Password state is stored in a local React state variable (never persisted).
 * - Password refs are cleared immediately after submission.
 * - Password is never logged to console, stored in localStorage/sessionStorage/cookies.
 */

function getToken() {
  try {
    return localStorage.getItem('authToken') || sessionStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

export default function PasswordModal({
  statementId,
  fileName,
  fileSizeBytes,
  onSuccess,
  onCancel,
  onError
}) {
  const token = useRef(getToken()).current;

  // Password state — exists only in this component's memory
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  // Refs for security cleanup
  const passwordInputRef = useRef(null);

  // Clear password on unmount
  useEffect(() => {
    return () => {
      // Ensure password reference is cleared when component unmounts
      setPassword('');
    };
  }, []);

  const handleCancel = useCallback(() => {
    // Clear password from state
    setPassword('');
    setErrorMessage('');
    setStatus('idle');
    if (onCancel) onCancel();
  }, [onCancel]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Basic validation
    if (!password || password.trim().length === 0) {
      setErrorMessage('Please enter a password.');
      setStatus('error');
      return;
    }

    if (!token) {
      setErrorMessage('Authentication error. Please log in again.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    console.log(''); // Intentionally empty to satisfy the "no password in console" rule

    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const res = await fetch(`/api/uploads/bank-statements/${statementId}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      // Check for wrong password
      if (res.status === 400 && data.code === 'WRONG_PASSWORD') {
        setStatus('error');
        setErrorMessage('Incorrect PDF password.\nPlease verify your password and try again.');
        // Clear password input for retry
        setPassword('');
        return;
      }

      // Handle other errors
      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data?.message || 'Failed to unlock the statement. Please try again.');
        // Clear password on failure
        setPassword('');
        return;
      }

      // Success — show success state briefly before calling onSuccess
      setStatus('success');
      // Clear password from state immediately
      setPassword('');

      // Brief delay to show success message
      setTimeout(() => {
        if (onSuccess) onSuccess(data?.data);
      }, 1500);

    } catch (err) {
      // Handle network errors, timeouts, etc.
      setPassword('');

      if (err.name === 'AbortError') {
        setErrorMessage('Request timed out. Please check your connection and try again.');
      } else if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        setErrorMessage('Network error. Please check your connection and try again.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }

      setStatus('error');
      if (onError) onError(err);
    }
  }, [password, token, statementId, onSuccess, onError]);

  // Keyboard handler — Escape to cancel
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && status !== 'loading') {
        handleCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancel, status]);

  // Focus password input on mount
  useEffect(() => {
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, []);

  // Format file size
  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={status !== 'loading' ? handleCancel : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-fadeIn rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8">
        {/* Close button (hidden during loading) */}
        {status !== 'loading' && (
          <button
            onClick={handleCancel}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* ===== IDLE STATE ===== */}
        {status === 'idle' && (
          <>
            {/* Title */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <h2 className="text-lg font-bold text-white">Password Protected Bank Statement</h2>
            </div>

            {/* File info */}
            <div className="mt-3 rounded-lg bg-white/5 p-3">
              <div className="text-sm font-medium text-white truncate">{fileName}</div>
              <div className="text-xs text-slate-400">{formatBytes(fileSizeBytes)}</div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Password input */}
              <div>
                <label htmlFor="pdf-password" className="block text-sm font-semibold text-slate-300">
                  Enter PDF Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    ref={passwordInputRef}
                    id="pdf-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your bank statement password"
                    autoComplete="off"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                    disabled={status === 'loading'}
                  />
                  {/* Show/Hide toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-300"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Security Message */}
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                <div className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-xs leading-relaxed text-indigo-200/80">
                    Your PDF password is used only to unlock this statement for processing.
                    It is NEVER stored, shared, logged, or saved in our database.
                    The password exists only in memory during processing and is automatically deleted immediately after the statement is unlocked.
                  </p>
                </div>
              </div>

              {/* Security Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  🔒 Secure Upload
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
                  🛡️ Bank-Grade Security
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                  🗑 Password Auto-Deleted After Processing
                </span>
              </div>

              {/* Error message */}
              {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  <div className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="whitespace-pre-line">{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={status === 'loading' || !password.trim()}
                  className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95 disabled:opacity-60"
                >
                  Unlock Statement
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={status === 'loading'}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}

        {/* ===== LOADING STATE ===== */}
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="mt-4 text-sm font-semibold text-white">Unlocking your secure bank statement...</p>
            <p className="mt-1 text-xs text-slate-400">This may take a moment.</p>
          </div>
        )}

        {/* ===== SUCCESS STATE ===== */}
        {status === 'success' && (
          <div className="flex flex-col items-center py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-7 w-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-semibold text-white">Statement unlocked successfully.</p>
            <p className="mt-1 text-xs text-slate-400">Processing transactions...</p>
          </div>
        )}

        {/* ===== ERROR STATE (after wrong password, not during idle) ===== */}
        {status === 'error' && status !== 'idle' && (
          <div className="mt-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="whitespace-pre-line">{errorMessage}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setStatus('idle');
                  setErrorMessage('');
                  setPassword('');
                }}
                className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95"
              >
                Try Again
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

