import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function ProfilePage() {
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to load profile');
        setUser(data.user);
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">My Profile</h1>

      {!token ? (
        <p className="mt-2 text-slate-600">Please log in.</p>
      ) : loading ? (
        <p className="mt-2 text-slate-600">Loading…</p>
      ) : !user ? (
        <p className="mt-2 text-slate-600">No user data.</p>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-lg font-bold text-slate-900">{user.firstName} {user.lastName}</div>
            {user.isVerified ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                Not Verified
              </span>
            )}
          </div>
          <div className="mt-2 text-slate-700">
            <div><span className="font-semibold">Email:</span> {user.email}</div>
          </div>
          {!user.isVerified && (
            <p className="mt-4 text-sm text-slate-600">
              Your profile becomes verified after an admin approves all required documents.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
