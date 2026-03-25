import React, { useState, useRef, useEffect } from 'react';
import { Heart, Search, Bell, Wallet, Trash2, CheckCheck, X, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useNotificationSocket } from '../hooks/useNotificationSocket';

// ─── Notification type → icon/color mapping ──────────────────────────────────
const NOTIF_META = {
  like:    { emoji: '❤️', color: 'bg-pink-50 dark:bg-pink-900/30 text-pink-500' },
  comment: { emoji: '💬', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' },
  follow:  { emoji: '👤', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-500' },
  mention: { emoji: '📣', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' },
  ad:      { emoji: '📢', color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-500' },
  system:  { emoji: '🔔', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
  default: { emoji: '🔔', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
};

const getNotifMeta = (type) => NOTIF_META[(type || '').toLowerCase()] || NOTIF_META.default;

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
};

const NotifRow = ({ notif, onMarkRead, onDelete }) => {
  const meta = getNotifMeta(notif.type);
  return (
    <div
      className={`relative flex gap-3 px-4 py-3 transition-colors cursor-pointer group ${
        notif.isRead
          ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          : 'bg-pink-50/60 dark:bg-pink-900/10 hover:bg-pink-50 dark:hover:bg-pink-900/20'
      }`}
      onClick={() => !notif.isRead && onMarkRead(notif._id)}
    >
      {!notif.isRead && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-pink-500" />
      )}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${meta.color}`}>
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug ${notif.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-semibold'}`}>
          {notif.message || notif.body || 'New notification'}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(notif.createdAt || notif.created_at)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notif._id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 flex-shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

// ─── B-Smart Logo ─────────────────────────────────────────────────────────────
const BSmartLogo = () => (
  <div className="flex items-center gap-2">
    {/* Icon */}
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f09433] via-[#e6683c] via-[#dc2743] to-[#bc1888] flex items-center justify-center shadow-md shadow-pink-500/30 flex-shrink-0">
      <span className="text-white font-black text-sm leading-none">b</span>
    </div>
    {/* Wordmark */}
    <span className="text-base font-black tracking-tight">
      <span className="text-[#f09433]">B</span>
      <span className="text-[#dc2743]">-</span>
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: 'linear-gradient(90deg, #f09433 0%, #e6683c 30%, #dc2743 60%, #bc1888 100%)',
        }}
      >
        Smart
      </span>
    </span>
  </div>
);

const TopBar = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { userObject } = useSelector((state) => state.auth);

  const { notifications, unreadCount, loading, markRead, markAllRead, deleteNotif } =
    useNotificationSocket({ limit: 10 });

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getInitials = (name) => {
    const raw = (name || '').trim();
    if (!raw) return 'U';
    const parts = raw.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || 'U') + (parts.length > 1 ? (parts[1]?.[0] || '') : '');
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 flex justify-between items-center z-50">
      {/* Left: B-Smart logo */}
      <Link to="/" className="flex items-center gap-2">
        <BSmartLogo />
      </Link>

      {/* Right: actions */}
      <div className="flex gap-3 items-center">
        {/* Wallet chip */}
        <Link
          to="/wallet"
          className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-2.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white flex-shrink-0">
            <Wallet size={11} />
          </div>
          <span className="text-[11px] font-bold text-gray-900 dark:text-white leading-none">
            {userObject?.wallet?.balance ? Math.floor(Number(userObject.wallet.balance)) : 0}
          </span>
        </Link>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative p-1.5 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Notifications"
          >
            <Heart size={22} className="text-black dark:text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 bg-[#fa3f5e] rounded-full border-2 border-white dark:border-black flex items-center justify-center">
                <span className="text-[8px] font-black text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-gray-500 dark:text-gray-400" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 text-[10px] font-black">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-[10px] font-semibold text-pink-500 hover:text-pink-600 px-2 py-1 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"
                    >
                      <CheckCheck size={12} /> All read
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50">
                {loading ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs">Loading…</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                    <Bell size={24} className="opacity-30" />
                    <span className="text-xs font-medium">You're all caught up!</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <NotifRow key={n._id} notif={n} onMarkRead={markRead} onDelete={deleteNotif} />
                  ))
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5">
                <button
                  onClick={() => { setOpen(false); navigate('/notifications'); }}
                  className="w-full text-xs font-semibold text-pink-500 hover:text-pink-600 transition-colors py-1"
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        <Search size={22} className="text-black dark:text-white" />

        {userObject?.role !== 'vendor' && (
          <Link to="/profile">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-[1.5px]">
              <div className="w-full h-full rounded-full bg-white dark:bg-black p-[1px]">
                {userObject?.avatar_url ? (
                  <img src={userObject.avatar_url} alt={userObject?.username || 'Profile'} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center text-[11px] font-bold text-gray-900 dark:text-white">
                    {getInitials(userObject?.full_name || userObject?.username).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default TopBar;