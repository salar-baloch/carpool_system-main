import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../components/ui/Button';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const decodeJwt = (token) => {
  try {
    const [, payloadBase64] = token.split('.');
    return payloadBase64 ? JSON.parse(atob(payloadBase64)) : null;
  } catch {
    return null;
  }
};

const docLabel = (type) =>
  String(type)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

export default function AdminVerifyPage() {
  const token = localStorage.getItem('token');
  const payload = useMemo(() => (token ? decodeJwt(token) : null), [token]);
  const isAdmin = payload?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [busyId, setBusyId] = useState(null);

  const fetchDocs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/documents?status=${encodeURIComponent(statusFilter)}` , {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to load documents');
      }
      setDocs(data.documents || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const decide = async (docId, decision) => {
    if (!token) return;
    let reason;
    if (decision === 'REJECTED') {
      reason = window.prompt('Reject reason:', 'Blurry / invalid document');
      if (reason === null) return;
    }

    setBusyId(docId);
    try {
      const res = await fetch(`${API_BASE}/admin/documents/${docId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to update');
      toast.success('Updated');
      await fetchDocs();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900">Admin Verification</h1>
        <p className="mt-2 text-slate-600">Please log in as admin.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900">Admin Verification</h1>
        <p className="mt-2 text-slate-600">You are not an admin.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Admin Verification</h1>
          <p className="mt-1 text-slate-600">Review uploaded documents and approve/reject them.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
          <Button variant="secondary" onClick={fetchDocs} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-slate-600">Loading…</div>
        ) : docs.length === 0 ? (
          <div className="p-6 text-slate-600">No documents found.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {docs.map((d) => (
              <div key={d.id} className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {d.status}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{docLabel(d.type)}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600 break-words">
                    User: <span className="font-semibold">{d.user?.firstName} {d.user?.lastName}</span> ({d.user?.email})
                    {d.user?.isVerified ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Verified</span>
                    ) : (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Not verified</span>
                    )}
                  </div>
                  {d.rejectReason ? (
                    <div className="mt-1 text-xs text-rose-700">Reject reason: {d.rejectReason}</div>
                  ) : null}
                  <div className="mt-2">
                    <a
                      className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 underline"
                      href={`${API_BASE}${d.storagePath}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View document
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => decide(d.id, 'APPROVED')}
                    disabled={busyId === d.id}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => decide(d.id, 'REJECTED')}
                    disabled={busyId === d.id}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
