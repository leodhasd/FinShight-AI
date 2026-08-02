import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../utils/apiClient';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const userId = searchParams.get('userId') || '';

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    async function verify() {
      if (!token || !userId) {
        if (mounted) {
          setStatus('error');
          setMessage('Invalid verification link. Missing token or user ID.');
        }
        return;
      }

      try {
        const res = await apiClient.post('/api/auth/verify-email', { token, userId });
        const data = res?.data;
        if (mounted) {
          setStatus('success');
          setMessage(data?.message || 'Email verified successfully.');
        }
      } catch (err) {
        if (mounted) {
          setStatus('error');
          setMessage(err?.response?.data?.message || 'Failed to verify email. Please try again.');
        }
      }
    }

    verify();

    return () => {
      mounted = false;
    };
  }, [token, userId]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center">
        {/* Icon */}
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
            status === 'success'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
              : status === 'error'
              ? 'bg-gradient-to-br from-red-500 to-rose-500'
              : 'bg-gradient-to-br from-indigo-500 to-fuchsia-500'
          }`}
        >
          {status === 'verifying' ? (
            <svg className="h-8 w-8 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0l3-3m-3 3l-3-3M12 18a6 6 0 100-12 6 6 0 000 12z" />
            </svg>
          ) : status === 'success' ? (
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <h2 className="mt-6 text-xl font-semibold text-white">
          {status === 'verifying'
            ? 'Verifying your email...'
            : status === 'success'
            ? 'Email verified!'
            : 'Verification failed'}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {status === 'verifying'
            ? 'Please wait while we confirm your email address.'
            : message}
        </p>

        {status !== 'verifying' && (
          <div className="mt-6">
            {status === 'success' ? (
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95"
              >
                Go to Login
              </Link>
            ) : (
              <Link
                to="/register"
                className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95"
              >
                Back to Register
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

