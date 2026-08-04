import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import FinancialAnalytics from '../../components/FinancialAnalytics/FinancialAnalytics';

function formatDate(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return iso;
  }
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
}

function getToken() {
  try {
    return localStorage.getItem('authToken') || sessionStorage.getItem('token') || null;
  } catch {
    return null;
  }
}
const API_BASE =
import.meta.env.VITE_API_BASE_URL || "https://finshight-ai.onrender.com";

export default function StatementTransactions() {
  const { id } = useParams();
  const token = useRef(getToken()).current;

  // Data state
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statement, setStatement] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  // UI state
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);

  // Export state
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);

  // AI Insights state
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    month: '',
    year: '',
    category: '',
    type: '',
    minCredit: '',
    maxCredit: '',
    minDebit: '',
    maxDebit: '',
    search: ''
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceTimer = useRef(null);
  const [availableYears, setAvailableYears] = useState([]);

  // Debounce filter changes
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedFilters(prev => ({ ...prev, [key]: value }));
    }, 400);
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async (pageNum) => {
    if (!token || !id) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum || 1));
      params.set('limit', '50');

      // Add filters
      if (debouncedFilters.startDate) params.set('startDate', debouncedFilters.startDate);
      if (debouncedFilters.endDate) params.set('endDate', debouncedFilters.endDate);
      if (debouncedFilters.month) params.set('month', debouncedFilters.month);
      if (debouncedFilters.year) params.set('year', debouncedFilters.year);
      if (debouncedFilters.category) params.set('category', debouncedFilters.category);
      if (debouncedFilters.type) params.set('type', debouncedFilters.type);
      if (debouncedFilters.minCredit) params.set('minCredit', debouncedFilters.minCredit);
      if (debouncedFilters.maxCredit) params.set('maxCredit', debouncedFilters.maxCredit);
      if (debouncedFilters.minDebit) params.set('minDebit', debouncedFilters.minDebit);
      if (debouncedFilters.maxDebit) params.set('maxDebit', debouncedFilters.maxDebit);
      if (debouncedFilters.search) params.set('search', debouncedFilters.search);

      const res = await fetch(
  `${API_BASE}/api/statements/${id}/transactions?${params.toString()}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.message || 'Failed to load transactions');

      setTransactions(data?.data?.transactions || []);
      setStatement(data?.data?.statement || null);
      setSummary(data?.data?.summary || null);
      setPagination(data?.data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      setAvailableYears(data?.data?.filterOptions?.years || []);
      // Use the backend's isProcessed flag so we show the "Process Statement" button when no transactions exist
      setIsProcessed(data?.data?.isProcessed === true || data?.data?.processed === true);
    } catch (e) {
      setError(e?.message || 'Failed to load transactions');
      // If 404 or no transactions, statement may not be processed yet
      if (e?.message?.includes('not found') || e?.message?.includes('statement')) {
        setIsProcessed(false);
      }
    } finally {
      setLoading(false);
    }
  }, [token, id, debouncedFilters]);

  // Process statement
  const handleProcess = async () => {
    if (!token || !id) return;

    setProcessing(true);
    setError('');

    try {
      const res = await fetch(
  `${API_BASE}/api/statements/${id}/process`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.message || 'Failed to process statement');

      // Refresh transactions
      await fetchTransactions(1);
    } catch (e) {
      setError(e?.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  // Re-fetch when debounced filters change
  useEffect(() => {
    if (isProcessed) {
      fetchTransactions(1);
    }
  }, [debouncedFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch AI Insights
  const fetchAiInsights = useCallback(async () => {
    if (!token || !id) return;

    setAiLoading(true);
    setAiError('');

    try {
      const res = await fetch(
  `${API_BASE}/api/statements/${id}/ai-insights`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.message || 'Failed to load AI insights');

      setAiInsights(data?.data || null);
    } catch (e) {
      setAiError(e?.message || 'Failed to load AI insights');
      setAiInsights(null);
    } finally {
      setAiLoading(false);
    }
  }, [token, id]);

  // Fetch AI Insights when statement is processed and transactions are loaded
  useEffect(() => {
    if (isProcessed && !loading && !error) {
      fetchAiInsights();
    }
  }, [isProcessed, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchTransactions(newPage);
  };

  return (
    <div className="min-h-screen px-4">
      <div className="mx-auto max-w-6xl pt-6 pb-10">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Statement Transactions</h1>
            {statement && (
              <p className="mt-1 text-sm text-slate-400">
                {statement.originalFileName} &middot;{' '}
                {statement.uploadedAt ? formatDate(statement.uploadedAt) : ''}
              </p>
            )}
          </div>
          <a
            href="/dashboard/upload"
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back to Uploads
          </a>
        </div>

        {/* Error */}
        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}

        {/* Process button (if not processed) */}
        {!loading && !isProcessed && !error && (
          <div className="mt-6 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-8 text-center">
            <div className="text-lg font-semibold text-amber-200">Statement not yet processed</div>
            <p className="mt-2 text-sm text-slate-400">
              Click the button below to parse this statement and extract transactions.
            </p>
            <button
              onClick={handleProcess}
              disabled={processing}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(251,191,36,0.25)] transition hover:opacity-95 disabled:opacity-60"
            >
              {processing ? 'Processing...' : 'Process Statement'}
            </button>
          </div>
        )}

        {/* Summary Cards */}
        {summary && isProcessed && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Credits</div>
              <div className="mt-1 text-xl font-bold text-emerald-300">{formatCurrency(summary.totalCredits)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Debits</div>
              <div className="mt-1 text-xl font-bold text-red-300">{formatCurrency(summary.totalDebits)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transactions</div>
              <div className="mt-1 text-xl font-bold text-white">{summary.transactionCount}</div>
            </div>
          </div>
        )}

        {/* AI Financial Insights */}
        {isProcessed && !loading && (
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg font-semibold text-white">AI Financial Insights</span>
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">Powered by AI</span>
            </div>

            {/* AI Loading */}
            {aiLoading && (
              <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <span className="ml-3 text-sm text-slate-400">Generating AI insights...</span>
              </div>
            )}

            {/* AI Error */}
            {aiError && !aiLoading && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{aiError}</span>
                </div>
              </div>
            )}

            {/* AI Insights Content */}
            {!aiLoading && !aiError && aiInsights && (
              <div className="space-y-4">
                {/* Financial Health Score */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Financial Health Score</div>
                      <div className="mt-1 text-3xl font-bold text-white">{aiInsights.financialHealthScore}<span className="text-lg text-slate-400">/100</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-32 rounded-full bg-slate-700`}>
                        <div
                          className={`h-3 rounded-full transition-all duration-700 ${
                            aiInsights.financialHealthScore >= 80 ? 'bg-emerald-500' :
                            aiInsights.financialHealthScore >= 50 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, aiInsights.financialHealthScore))}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${
                        aiInsights.financialHealthScore >= 80 ? 'text-emerald-300' :
                        aiInsights.financialHealthScore >= 50 ? 'text-amber-300' :
                        'text-red-300'
                      }`}>
                        {aiInsights.financialHealthScore >= 80 ? 'Excellent' :
                         aiInsights.financialHealthScore >= 50 ? 'Average' :
                         'Needs Improvement'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Metrics Grid */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Income</div>
                    <div className="mt-1 text-lg font-bold text-emerald-300">{formatCurrency(aiInsights.totalIncome)}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Expense</div>
                    <div className="mt-1 text-lg font-bold text-red-300">{formatCurrency(aiInsights.totalExpense)}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Savings</div>
                    <div className={`mt-1 text-lg font-bold ${aiInsights.totalSavings >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {formatCurrency(Math.abs(aiInsights.totalSavings))}
                      <span className="ml-1 text-xs">{aiInsights.totalSavings < 0 ? '(Deficit)' : ''}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Savings Rate</div>
                    <div className="mt-1 text-lg font-bold text-indigo-300">{aiInsights.savingsRate.toFixed(1)}%</div>
                  </div>
                </div>

                {/* Row 2: Monthly Savings / Average Daily Spending / Average Monthly Spending */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Monthly Savings</div>
                    <div className={`mt-1 text-lg font-bold ${(aiInsights.monthlySavings ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {formatCurrency(aiInsights.monthlySavings ?? 0)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">Average savings per active month</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Average Daily Spending</div>
                    <div className="mt-1 text-lg font-bold text-amber-300">{formatCurrency(aiInsights.averageDailySpending ?? 0)}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Per active day in this statement</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Average Monthly Spending</div>
                    <div className="mt-1 text-lg font-bold text-fuchsia-300">{formatCurrency(aiInsights.averageMonthlySpending ?? 0)}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Per active month in this statement</div>
                  </div>
                </div>

                {/* Highest Income Source (supports both object and legacy string formats) */}
                {(() => {
                  const his = aiInsights.highestIncomeSource;
                  const hisName = (his && typeof his === 'object') ? his.category : his;
                  const hisAmount = (his && typeof his === 'object') ? his.amount : 0;
                  const hisCount = (his && typeof his === 'object') ? his.count : 0;
                  return (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Highest Income Source</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-lg font-bold text-emerald-300">{hisName || 'N/A'}</span>
                        {hisAmount > 0 && (
                          <span className="text-sm text-slate-400">
                            ({formatCurrency(hisAmount)}{hisCount > 1 ? ` · ${hisCount} credits` : ''})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Detail Cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Highest Expense Category</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-lg font-bold text-amber-300">{aiInsights.highestExpenseCategory}</span>
                      {aiInsights.highestExpenseAmount > 0 && (
                        <span className="text-sm text-slate-400">({formatCurrency(aiInsights.highestExpenseAmount)})</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Biggest Transaction</div>
                    <div className="mt-1">
                      <div className="text-lg font-bold text-white">{formatCurrency(aiInsights.biggestTransaction?.amount || 0)}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="max-w-[200px] truncate text-sm text-slate-400" title={aiInsights.biggestTransaction?.description}>
                          {aiInsights.biggestTransaction?.description || 'N/A'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          aiInsights.biggestTransaction?.type === 'debit' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {aiInsights.biggestTransaction?.type || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cash Flow Summary */}
                {aiInsights.cashFlowSummary && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cash Flow Summary</span>
                    </div>

                    {/* Narrative text */}
                    {aiInsights.cashFlowSummary.text ? (
                      <p className="text-sm leading-relaxed text-slate-300">{aiInsights.cashFlowSummary.text}</p>
                    ) : null}

                    {/* Flow figures */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Inflow</div>
                        <div className="mt-1 text-lg font-bold text-emerald-300">{formatCurrency(aiInsights.cashFlowSummary.totalInflow ?? 0)}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Outflow</div>
                        <div className="mt-1 text-lg font-bold text-red-300">{formatCurrency(aiInsights.cashFlowSummary.totalOutflow ?? 0)}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net Cash Flow</div>
                        <div className={`mt-1 text-lg font-bold ${(aiInsights.cashFlowSummary.netCashFlow ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                          {formatCurrency(Math.abs(aiInsights.cashFlowSummary.netCashFlow ?? 0))}
                          {(aiInsights.cashFlowSummary.netCashFlow ?? 0) < 0 ? (
                            <span className="ml-1 text-xs">(Negative)</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Monthly breakdown */}
                    {aiInsights.monthlyBreakdown && aiInsights.monthlyBreakdown.length > 0 && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead className="bg-slate-950/30 text-xs uppercase text-slate-300">
                              <tr>
                                <th className="px-4 py-2.5">Month</th>
                                <th className="px-4 py-2.5 text-right">Income</th>
                                <th className="px-4 py-2.5 text-right">Expense</th>
                                <th className="px-4 py-2.5 text-right">Savings</th>
                                <th className="px-4 py-2.5 text-right">Transactions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {aiInsights.monthlyBreakdown.map((m) => (
                                <tr key={m.month} className="hover:bg-white/5 transition-colors">
                                  <td className="px-4 py-2.5 whitespace-nowrap font-medium text-white">{m.month}</td>
                                  <td className="px-4 py-2.5 text-right whitespace-nowrap text-emerald-300">{formatCurrency(m.income)}</td>
                                  <td className="px-4 py-2.5 text-right whitespace-nowrap text-red-300">{formatCurrency(m.expense)}</td>
                                  <td className={`px-4 py-2.5 text-right whitespace-nowrap ${m.savings >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                    {formatCurrency(m.savings)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right whitespace-nowrap text-slate-400">{m.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Summary */}
                {aiInsights.aiSummary && aiInsights.aiSummary.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI Summary</span>
                    </div>
                    <ul className="space-y-2">
                      {aiInsights.aiSummary.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Recommendations (data-driven) */}
                {aiInsights.aiRecommendations && aiInsights.aiRecommendations.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">AI Recommendations</span>
                    </div>
                    <ul className="space-y-2">
                      {aiInsights.aiRecommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">
                            {idx + 1}
                          </span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 border-t border-white/5 pt-2 text-xs text-slate-500">
                      Recommendations are generated from your actual transaction data.
                    </p>
                  </div>
                )}

{/* Personalized Suggestions */}
                {aiInsights.aiSuggestions && aiInsights.aiSuggestions.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Personalized Suggestions</span>
                    </div>
                    <ol className="space-y-2">
                      {aiInsights.aiSuggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">
                            {idx + 1}
                          </span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Financial Analytics Dashboard */}
                <FinancialAnalytics aiInsights={aiInsights} />
              </div>
            )}

            {/* No Data */}
            {!aiLoading && !aiError && !aiInsights && (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
                <div className="text-sm text-slate-400">No AI insights available for this statement.</div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {isProcessed && (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
            {/* Filtered count */}
            {(() => {
              const hasActiveFilters = Object.values(debouncedFilters).some((v) => v !== '' && v !== null && v !== undefined);
              return hasActiveFilters ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-slate-400">
                    <span className="font-semibold text-white">{pagination.total}</span>{' '}
                    of {summary?.transactionCount ?? pagination.total} transactions
                  </div>
                </div>
              ) : null;
            })()}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {/* Date range */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">From Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">To Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              {/* Month */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Month</label>
                <select
                  value={filters.month}
                  onChange={(e) => updateFilter('month', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                >
                  <option value="" className="bg-slate-900 text-white">All Months</option>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m, i) => (
                    <option key={m} value={String(i + 1)} className="bg-slate-900 text-white">{m}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => updateFilter('year', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                >
                  <option value="" className="bg-slate-900 text-white">All Years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={String(y)} className="bg-slate-900 text-white">{y}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                >
                  <option value="" className="bg-slate-900 text-white">All Categories</option>
                  {[
                    'Food', 'Shopping', 'Travel', 'Fuel', 'Salary', 'ATM', 'UPI', 'Bills',
                    'EMI', 'Entertainment', 'Healthcare', 'Education', 'Investment', 'Transfer', 'Others'
                  ].map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => updateFilter('type', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                >
                  <option value="" className="bg-slate-900 text-white">All Types</option>
                  <option value="credit" className="bg-slate-900 text-white">Credit</option>
                  <option value="debit" className="bg-slate-900 text-white">Debit</option>
                </select>
              </div>

              {/* Credit */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Min Credit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={filters.minCredit}
                  onChange={(e) => updateFilter('minCredit', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Max Credit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="9999.99"
                  value={filters.maxCredit}
                  onChange={(e) => updateFilter('maxCredit', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              {/* Debit */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Min Debit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={filters.minDebit}
                  onChange={(e) => updateFilter('minDebit', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Max Debit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="9999.99"
                  value={filters.maxDebit}
                  onChange={(e) => updateFilter('maxDebit', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              {/* Search */}
              <div className="sm:col-span-2 md:col-span-2 lg:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Search</label>
                <input
                  type="text"
                  placeholder="Search description or reference number..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            {/* Clear filters */}
            <button
              onClick={() => {
                const empty = {
                  startDate: '', endDate: '',
                  month: '', year: '', category: '', type: '',
                  minCredit: '', maxCredit: '',
                  minDebit: '', maxDebit: '',
                  search: ''
                };
                setFilters(empty);
                setDebouncedFilters(empty);
              }}
              className="mt-3 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="ml-3 text-sm text-slate-400">Loading transactions...</span>
          </div>
        )}

        {/* Transactions Table */}
        {!loading && isProcessed && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/30 text-xs uppercase text-slate-300">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Date</th>
<th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Debit</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Credit</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.length > 0 ? (
                    transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                          {formatDate(txn.date)}
                        </td>
<td className="px-4 py-3">
                          <div className="max-w-xs truncate font-medium text-white" title={txn.description}>
                            {txn.description}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                            {txn.category || 'Others'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {txn.debit > 0 ? (
                            <span className="font-medium text-red-300">{formatCurrency(txn.debit)}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {txn.credit > 0 ? (
                            <span className="font-medium text-emerald-300">{formatCurrency(txn.credit)}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-slate-300">
                          {txn.balance !== 0 ? formatCurrency(txn.balance) : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
<td colSpan={6} className="px-4 py-10 text-center">
                        <div className="text-sm font-medium text-white">No transactions found</div>
                        {(() => {
                          const hasActiveFilters = Object.values(debouncedFilters).some((v) => v !== '' && v !== null && v !== undefined);
                          return (
                            <div className="mt-1 text-xs text-slate-500">
                              {error
                                ? 'Error loading transactions.'
                                : hasActiveFilters
                                  ? 'No transactions match your current filters. Try adjusting or clearing them.'
                                  : 'This statement has no transactions yet.'}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
                <div className="text-sm text-slate-400">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} transactions)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export */}
        {isProcessed && !loading && transactions.length > 0 && (
          <div className="mt-4 flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
            {/* Format selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                disabled={exporting}
                className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
              >
                <option value="csv" className="bg-slate-900 text-white">CSV</option>
                <option value="json" className="bg-slate-900 text-white">JSON</option>
              </select>
            </div>

            <button
              onClick={async (e) => {
                e.preventDefault();
                const token = getToken();
                if (!token) return;

                setExporting(true);
                setError('');
                try {
                  const params = new URLSearchParams();
                  params.set('format', exportFormat);

                  // Pass active filters so the export matches the on-screen results
                  if (debouncedFilters.startDate) params.set('startDate', debouncedFilters.startDate);
                  if (debouncedFilters.endDate) params.set('endDate', debouncedFilters.endDate);
                  if (debouncedFilters.month) params.set('month', debouncedFilters.month);
                  if (debouncedFilters.year) params.set('year', debouncedFilters.year);
                  if (debouncedFilters.category) params.set('category', debouncedFilters.category);
                  if (debouncedFilters.type) params.set('type', debouncedFilters.type);
                  if (debouncedFilters.minCredit) params.set('minCredit', debouncedFilters.minCredit);
                  if (debouncedFilters.maxCredit) params.set('maxCredit', debouncedFilters.maxCredit);
                  if (debouncedFilters.minDebit) params.set('minDebit', debouncedFilters.minDebit);
                  if (debouncedFilters.maxDebit) params.set('maxDebit', debouncedFilters.maxDebit);
                  if (debouncedFilters.search) params.set('search', debouncedFilters.search);

                  const res = await fetch(`/api/statements/${id}/transactions/export?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });

                  if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData?.message || 'Export failed');
                  }

                  const blob = await res.blob();

                  // Derive a friendly filename from the original file name
                  const originalName = statement?.originalFileName || 'transactions';
                  const baseName = originalName.replace(/\.(pdf|csv)$/i, '');
                  const extension = exportFormat === 'json' ? 'json' : 'csv';
                  const downloadName = `${baseName}_transactions.${extension}`;

                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = downloadName;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  setError(err.message);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="inline-flex items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20 disabled:opacity-60"
            >
              {exporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

