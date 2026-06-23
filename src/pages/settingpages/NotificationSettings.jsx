import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, AtSign, Megaphone, ShoppingBag, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

const SectionTitle = ({ title }) => (
  <p className="text-[11px] font-bold text-[#fa3f5e] uppercase tracking-widest mb-2 px-1">{title}</p>
);

const Toggle = ({ on, onChange, disabled }) => (
  <label className={`relative inline-flex items-center flex-shrink-0 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
    <input type="checkbox" checked={on} onChange={onChange} disabled={disabled} className="sr-only peer" />
    <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-[#fa3f5e]' : 'bg-gray-300 dark:bg-gray-700'}`} />
    <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
  </label>
);

const DEFAULT_PREFS = {
  push_enabled: true,
  likes: true,
  comments: true,
  follows: true,
  mentions: true,
  direct_messages: true,
  promotions: false,
  product_updates: true,
};

const SECTIONS = [
  {
    title: 'General',
    rows: [
      { key: 'push_enabled', label: 'Push Notifications', sublabel: 'Receive push notifications on this device', icon: Bell, iconBg: 'bg-purple-50 dark:bg-gray-800', iconColor: 'text-purple-500' },
    ],
  },
  {
    title: 'Interactions',
    rows: [
      { key: 'likes', label: 'Likes', sublabel: 'Someone likes your post or comment', icon: Heart, iconBg: 'bg-red-50 dark:bg-gray-800', iconColor: 'text-red-500' },
      { key: 'comments', label: 'Comments', sublabel: 'Someone comments on your post', icon: MessageCircle, iconBg: 'bg-blue-50 dark:bg-gray-800', iconColor: 'text-blue-500' },
      { key: 'follows', label: 'New Followers', sublabel: 'Someone follows you or sends a request', icon: UserPlus, iconBg: 'bg-green-50 dark:bg-gray-800', iconColor: 'text-green-500' },
      { key: 'mentions', label: 'Mentions', sublabel: 'Someone mentions you in a post or comment', icon: AtSign, iconBg: 'bg-orange-50 dark:bg-gray-800', iconColor: 'text-orange-500' },
      { key: 'direct_messages', label: 'Direct Messages', sublabel: 'Someone sends you a message', icon: MessageCircle, iconBg: 'bg-teal-50 dark:bg-gray-800', iconColor: 'text-teal-500' },
    ],
  },
  {
    title: 'From bSmart',
    rows: [
      { key: 'promotions', label: 'Promotions & Offers', sublabel: 'Deals, rewards, and special offers', icon: Megaphone, iconBg: 'bg-pink-50 dark:bg-gray-800', iconColor: 'text-pink-500' },
      { key: 'product_updates', label: 'Product Updates', sublabel: 'New features and app improvements', icon: ShoppingBag, iconBg: 'bg-indigo-50 dark:bg-gray-800', iconColor: 'text-indigo-500' },
    ],
  },
];

const NotificationSettings = () => {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [saveError, setSaveError] = useState('');

  const fetchPrefs = async () => {
    setPageLoading(true);
    setPageError('');
    try {
      const res = await api.get('/settings/notifications');
      const data = res.data?.settings || res.data || {};
      setPrefs({ ...DEFAULT_PREFS, ...data });
    } catch (e) {
      setPageError(e?.response?.data?.message || 'Failed to load notification settings.');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { fetchPrefs(); }, []);

  const handleToggle = async (key, checked) => {
    const prev = prefs[key];
    setPrefs(p => ({ ...p, [key]: checked }));
    setSaveError('');
    setSavingKey(key);
    try {
      const res = await api.patch('/settings/notifications', { [key]: checked });
      const saved = res.data?.settings || {};
      if (Object.keys(saved).length > 0) setPrefs(p => ({ ...p, ...saved }));
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch (e) {
      setPrefs(p => ({ ...p, [key]: prev }));
      setSaveError(e?.response?.data?.message || 'Failed to save. Try again.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-24 max-w-[1100px] mx-auto">

      <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between z-40">
        <Link to="/settings" className="text-gray-800 dark:text-white p-1">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-base font-semibold dark:text-white">Notification Settings</h1>
        <button
          onClick={fetchPrefs}
          disabled={pageLoading}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={pageLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">

        {saveError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={14} className="shrink-0" />
            <span className="flex-1">{saveError}</span>
            <button onClick={() => setSaveError('')} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {pageLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="animate-spin text-gray-300 dark:text-gray-700" />
            <span className="text-sm text-gray-400">Loading settings…</span>
          </div>
        ) : pageError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{pageError}</p>
            <button
              onClick={fetchPrefs}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#fa3f5e] text-white text-sm font-semibold"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : (
          SECTIONS.map(({ title, rows }) => (
            <div key={title}>
              <SectionTitle title={title} />
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                {rows.map(({ key, label, sublabel, icon: Icon, iconBg, iconColor }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        <Icon size={16} className={iconColor} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {savingKey === key && <Loader2 size={13} className="animate-spin text-gray-400" />}
                      {savedKey === key && savingKey !== key && <Check size={13} className="text-green-500" />}
                      <Toggle
                        on={prefs[key]}
                        disabled={savingKey === key}
                        onChange={e => handleToggle(key, e.target.checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {!pageLoading && !pageError && (
          <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
            Changes are saved automatically. You can also manage per-user notification preferences from their profile.
          </p>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;
