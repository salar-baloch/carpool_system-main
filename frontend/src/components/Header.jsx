import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Button from "./ui/Button";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);

        try {
          if (!token) {
            setIsAdmin(false);
          } else {
            const [, payloadBase64] = token.split('.');
            const payload = payloadBase64 ? JSON.parse(atob(payloadBase64)) : null;
            setIsAdmin(payload?.role === 'admin');
          }
        } catch {
          setIsAdmin(false);
        }
    }, []);

    useEffect(() => {
      if (!isLoggedIn) {
        setNotificationCount(0);
        return;
      }

      let isMounted = true;
      const fetchNotifications = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          const response = await fetch(`${API_BASE}/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (!isMounted) return;
          const notifications = Array.isArray(data?.notifications) ? data.notifications : [];
          const unread = notifications.filter((note) => !note.readAt).length;
          setNotificationCount(unread);
        } catch {
          if (isMounted) setNotificationCount(0);
        }
      };

      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [isLoggedIn]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
    setIsAdmin(false);
        setMobileOpen(false);
        navigate('/login');
    };

    const NavLinks = ({ onNavigate }) => (
      <>
        <Link to="/search" onClick={onNavigate} className="hover:text-slate-900 transition">
          Search
        </Link>
        <Link to="/share" onClick={onNavigate} className="hover:text-slate-900 transition">
          Share
        </Link>
        <Link to="/trips" onClick={onNavigate} className="relative inline-flex items-center gap-2 hover:text-slate-900 transition">
          Trips
          {notificationCount > 0 && (
            <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white">
              {notificationCount}
            </span>
          )}
        </Link>
        <Link to="/profile" onClick={onNavigate} className="hover:text-slate-900 transition">
          Profile
        </Link>
        <Link to="/documents" onClick={onNavigate} className="hover:text-slate-900 transition">
          Documents
        </Link>
        {isAdmin && (
          <Link to="/admin/verify" onClick={onNavigate} className="hover:text-slate-900 transition">
            Admin Verify
          </Link>
        )}
      </>
    );

    return (
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="text-2xl font-extrabold text-slate-900 tracking-tight"
            >
              CarPool System
            </Link>
            {isLoggedIn && (
              <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
                <NavLinks />
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label="Toggle menu"
                >
                  Menu
                </button>
                <Button variant="secondary" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button>Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {isLoggedIn && mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <nav className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-col gap-3 text-sm font-semibold text-slate-700">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
          </div>
        )}
      </header>
    );
};

export default Header;
