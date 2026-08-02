import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../utils/apiClient';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [registeredEmail, setRegisteredEmail] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const nextFieldErrors = {};
    if (!fullName.trim()) nextFieldErrors.fullName = 'Full name is required';
    if (!email.trim()) nextFieldErrors.email = 'Email is required';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextFieldErrors.email = 'Enter a valid email';
    if (!password) nextFieldErrors.password = 'Password is required';
    if (password && password.length < 8) nextFieldErrors.password = 'Password must be at least 8 characters';

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/auth/register', { fullName, email, password });
      const data = res?.data;
      if (data?.data?.needsVerification) {
        setRegisteredEmail(data.data.email || email);
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Registration failed';
      setError(message);
      const errors = err?.response?.data?.errors;
      if (Array.isArray(errors)) {
        const map = {};
        for (const item of errors) map[item.path] = item.msg;
        setFieldErrors(map);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!registeredEmail && !email) return;
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/api/auth/resend-verification', { email: registeredEmail || email });
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to resend');
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="mt-6 text-xl font-semibold text-white">Verify your email</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            We sent a verification email to <strong className="text-slate-200">{registeredEmail}</strong>.
            Please check your inbox and click the link to activate your account.
          </p>
          <div className="mt-6 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
            The link expires in 24 hours. Check your spam folder if you do not see it.
          </div>
          <button
            onClick={handleResend}
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? 'Sending...' : 'Resend Verification Email'}
          </button>
          <div className="mt-4 text-center text-sm text-slate-400">
            <Link className="text-indigo-300 hover:text-indigo-200" to="/login">Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <h1 className="text-xl font-semibold text-white">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">Register to get started</p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/60"
              placeholder="Jane Doe"
              autoComplete="name"
            />
            {fieldErrors.fullName ? (
              <div className="mt-1 text-xs text-red-200">{fieldErrors.fullName}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/60"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {fieldErrors.email ? (
              <div className="mt-1 text-xs text-red-200">{fieldErrors.email}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">Password</label>
            <input
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/60"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            {fieldErrors.password ? (
              <div className="mt-1 text-xs text-red-200">{fieldErrors.password}</div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Register'}
          </button>

          <div className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link className="text-indigo-300 hover:text-indigo-200" to="/login">Login</Link>
          </div>
        </form>
        </div>
      </div>
  );
}
