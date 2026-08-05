import React, { useEffect, useMemo, useState, useCallback } from 'react';
import PasswordModal from '../../components/PasswordModal/PasswordModal';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getToken() {
  try {
    return localStorage.getItem('authToken') || sessionStorage.getItem('token') || null;
  } catch {
    return null;
  }
}
const API_BASE = import.meta.env.VITE_API_BASE_URL;

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(['application/pdf', 'text/csv', 'application/vnd.ms-excel']);

export default function BankStatementUpload() {
  const token = useMemo(() => getToken(), []);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [previewError, setPreviewError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  // Password modal state
  const [passwordModal, setPasswordModal] = useState({
    show: false,
    statementId: null,
    fileName: '',
    fileSizeBytes: 0
  });

  useEffect(() => {
    async function loadUploads() {
      if (!token) return;
      setLoadingUploads(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/api/uploads/bank-statements`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Failed to load uploads');
        setUploads(data?.data?.uploads || []);
      } catch (e) {
        setError(e?.message || 'Failed to load uploads');
      } finally {
        setLoadingUploads(false);
      }
    }
    loadUploads();
  }, [token]);

  function validateFile(candidate) {
    if (!candidate) return 'No file selected';
    if (!ACCEPTED_MIME_TYPES.has(candidate.type)) return 'Only PDF and CSV files are allowed.';
    if (candidate.size > MAX_BYTES) return 'File too large. Max 10MB.';
    return '';
  }

  function onPickFile(e) {
    const picked = e.target.files?.[0] || null;
    const msg = validateFile(picked);
    setPreviewError(msg);
    setFile(picked && !msg ? picked : null);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragActive(false);

    const dropped = e.dataTransfer?.files?.[0] || null;
    const msg = validateFile(dropped);
    setPreviewError(msg);
    setFile(dropped && !msg ? dropped : null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError(previewError || 'Select a valid file');
      return;
    }

    if (!token) {
      setError('Not authenticated');
      return;
    }

    setSubmitting(true);
    setProgress(0);

    try {
      // Use XHR for upload progress.
      const formData = new FormData();
      formData.append('bankStatement', file);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/api/uploads/bank-statements`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const pct = Math.round((event.loaded / event.total) * 100);
          setProgress(pct);
        };

        xhr.onload = async () => {
          const resText = xhr.responseText;
          const resJson = (() => {
            try {
              return JSON.parse(resText);
            } catch {
              return null;
            }
          })();

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(resJson);
          } else {
            const msg = resJson?.message || 'Upload failed';
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      }).then((resJson) => {
        // Check if the uploaded PDF requires a password
        if (resJson && resJson.needsPassword === true && resJson.data && resJson.data.id) {
          // Show password modal — file is saved, parse deferred until password is provided
          setPasswordModal({
            show: true,
            statementId: resJson.data.id,
            fileName: resJson.data.originalFileName,
            fileSizeBytes: resJson.data.fileSizeBytes
          });
          setFile(null);
          setProgress(0);
          return;
        }

        // Normal (non-password-protected) success
        setSuccess('Upload successful.');
        setFile(null);
        setPreviewError('');
        setProgress(0);
      });

      // Refresh list (skip if password modal is showing — will refresh after unlock)
      if (!passwordModal.show) {
        const refreshRes = await fetch(`${API_BASE}/api/uploads/bank-statements`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
        const refreshData = await refreshRes.json().catch(() => ({}));
        if (refreshRes.ok) setUploads(refreshData?.data?.uploads || []);
      }
    } catch (e) {
      setError(e?.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Password modal handlers
  const handlePasswordSuccess = useCallback(async () => {
    setPasswordModal({ show: false, statementId: null, fileName: '', fileSizeBytes: 0 });
    setSuccess('Statement unlocked and transactions processed successfully.');

    // Refresh uploads list
    try {
      const refreshRes = await fetch(`${API_BASE}/api/uploads/bank-statements`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const refreshData = await refreshRes.json().catch(() => ({}));
      if (refreshRes.ok) setUploads(refreshData?.data?.uploads || []);
    } catch {
      // Silent fail on refresh
    }
  }, [token]);

  const handlePasswordCancel = useCallback(() => {
    setPasswordModal({ show: false, statementId: null, fileName: '', fileSizeBytes: 0 });
    setFile(null);
    setPreviewError('');
    setProgress(0);
    setSuccess('');
  }, []);

  const handlePasswordError = useCallback(() => {
    // Modal handles error display internally; we just clean up if needed
  }, []);

  return (
    <div className="min-h-screen px-4">
      <div className="mx-auto max-w-4xl pt-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-white">Upload Bank Statement</h1>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back to Dashboard
          </a>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6">
          <div
            className={`rounded-2xl border border-dashed p-6 transition ${
              dragActive ? 'border-indigo-400/70 bg-indigo-500/10' : 'border-white/15 bg-white/5'
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
              setPreviewError('');
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Drag & drop your statement</div>
                <div className="mt-1 text-sm text-slate-400">PDF or CSV, up to 10MB</div>
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                Choose file
                <input type="file" accept=".pdf,.csv,text/csv,application/pdf" className="hidden" onChange={onPickFile} disabled={submitting} />
              </label>
            </div>

            {file ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/30 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{file.name}</div>
                    <div className="text-xs text-slate-400">{file.type || 'unknown'} • {formatBytes(file.size)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreviewError('');
                      setProgress(0);
                    }}
                    className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : null}

            {previewError ? (
              <div className="mt-4 text-sm text-red-200">{previewError}</div>
            ) : null}
          </div>

          {submitting ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white">Uploading...</div>
                <div className="text-sm text-slate-300">{progress}%</div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !file}
            className="mt-5 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? 'Uploading...' : 'Upload Statement'}
          </button>
        </form>

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Previous uploads</div>
            {loadingUploads ? <div className="text-xs text-slate-400">Loading...</div> : null}
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/30 text-xs uppercase text-slate-300">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Uploaded</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {uploads.length ? (
                    uploads.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{u.originalFileName}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{u.mimeType}</td>
                        <td className="px-4 py-3 text-slate-300">{formatBytes(u.fileSizeBytes)}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {u.uploadedAt ? new Date(u.uploadedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/dashboard/statements/${u.id}/transactions`}
                            className="inline-flex items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
                          >
                            View Transactions
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                        No uploads yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {passwordModal.show && (
        <PasswordModal
          statementId={passwordModal.statementId}
          fileName={passwordModal.fileName}
          fileSizeBytes={passwordModal.fileSizeBytes}
          onSuccess={handlePasswordSuccess}
          onCancel={handlePasswordCancel}
          onError={handlePasswordError}
        />
      )}
    </div>
  );
}

