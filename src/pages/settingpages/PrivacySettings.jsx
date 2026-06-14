import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, Lock, Users, Clock, ChevronRight, Loader2, UserCheck, X, Check,
  Eye, MessageCircle, Search, Pencil,
} from 'lucide-react';
import api from '../../lib/api';
import {
  getPrivacyStatus, setAccountPrivacy,
  getFollowRequests, acceptFollowRequest, declineFollowRequest,
} from '../../services/followService';

/* ── helpers ─────────────────────────────────────────────────── */
const fmt = (n = 0) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
};

const VISIBILITY_OPTIONS = ['Everyone', 'Followers Only', 'Nobody'];
const VISIBILITY_FIELDS = [
  { key: 'profile',        label: 'Profile' },
  { key: 'posts',          label: 'Posts' },
  { key: 'stories',        label: 'Stories' },
  { key: 'pulse',          label: 'Pulse' },
  { key: 'followers_list', label: 'Followers List' },
  { key: 'following_list', label: 'Following List' },
];
const DISCOVERY_FIELDS = [
  { key: 'search_by_username',   label: 'Allow Search by Username' },
  { key: 'search_by_email',      label: 'Allow Search by Email' },
  { key: 'search_by_mobile',     label: 'Allow Search by Mobile' },
  { key: 'appear_in_suggestions', label: 'Appear in Suggestions' },
  { key: 'indexable',            label: 'Allow Search Engine Indexing' },
  { key: 'tag_suggestions',      label: 'Show in Tag Suggestions' },
];
const DEFAULT_PRIVACY = {
  visibility: {
    profile: 'Everyone', posts: 'Everyone', stories: 'Everyone',
    pulse: 'Everyone', followers_list: 'Everyone', following_list: 'Everyone',
  },
  activity: { show_online_status: true, show_last_seen: true, show_read_receipts: true },
  follow: { allow_follow_requests: true, auto_approve: false },
  messaging: 'Everyone',
  discovery: {
    search_by_username: true, search_by_email: false, search_by_mobile: false,
    appear_in_suggestions: true, indexable: true, tag_suggestions: true,
  },
};

/* ── sub-components ──────────────────────────────────────────── */
const SectionTitle = ({ title }) => (
  <p className="text-[11px] font-bold text-[#fa3f5e] uppercase tracking-widest mb-2 px-1">{title}</p>
);

const Toggle = ({ on, onChange, disabled }) => (
  <label className={`relative inline-flex items-center flex-shrink-0 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
    <input type="checkbox" checked={on} onChange={onChange} disabled={disabled} className="sr-only peer" />
    <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-[#fa3f5e]' : 'bg-gray-300 dark:bg-gray-700'}`} />
    <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
  </label>
);

const ToggleRow = ({ label, sublabel, on, onChange, disabled }) => (
  <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <div className="flex-1 min-w-0 pr-3">
      <p className={`text-sm font-medium ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{label}</p>
      {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
    <Toggle on={on} onChange={onChange} disabled={disabled} />
  </div>
);

const SelectRow = ({ label, value, onChange, options, disabled }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <p className={`text-sm font-medium flex-1 ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{label}</p>
    {disabled ? (
      <span className="ml-3 text-xs font-semibold text-gray-400 dark:text-gray-500 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-transparent max-w-[130px] text-right">
        {value}
      </span>
    ) : (
      <select value={value} onChange={e => onChange(e.target.value)}
        className="ml-3 text-xs font-semibold text-[#fa3f5e] bg-[#fa3f5e]/8 border border-[#fa3f5e]/20 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer appearance-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 max-w-[130px]">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )}
  </div>
);

/* ── main ────────────────────────────────────────────────────── */
const PrivacySettings = () => {
  const { userObject } = useSelector((state) => state.auth);
  const userId = userObject?._id || userObject?.id;

  const [isEditing, setIsEditing] = useState(false);
  const snapshot = useRef(null);

  // Public/private (always interactive via its own modal)
  const [isPrivate, setIsPrivate] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingBase, setLoadingBase] = useState(true);
  const [toggling, setToggling] = useState(false);

  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    Promise.allSettled([
      getPrivacyStatus(),
      api.get(`/users/${userId}/privacy-settings`),
    ]).then(([privRes, settingsRes]) => {
      if (privRes.status === 'fulfilled') {
        setIsPrivate(privRes.value.isPrivate);
        setPendingCount(privRes.value.pendingRequestsCount || 0);
      }
      let loaded = DEFAULT_PRIVACY;
      if (settingsRes.status === 'fulfilled') {
        const d = settingsRes.value.data?.privacy_settings || settingsRes.value.data;
        if (d && typeof d === 'object') {
          loaded = {
            visibility: { ...DEFAULT_PRIVACY.visibility, ...(d.visibility || {}) },
            activity:   { ...DEFAULT_PRIVACY.activity,   ...(d.activity   || {}) },
            follow:     { ...DEFAULT_PRIVACY.follow,     ...(d.follow     || {}) },
            messaging:  d.messaging  ?? DEFAULT_PRIVACY.messaging,
            discovery:  { ...DEFAULT_PRIVACY.discovery,  ...(d.discovery  || {}) },
          };
        }
      }
      setPrivacy(loaded);
      snapshot.current = loaded;
    }).finally(() => setLoadingBase(false));
  }, [userId]);

  const handleCancel = () => {
    if (snapshot.current) setPrivacy(snapshot.current);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${userId}/privacy-settings`, { privacy_settings: privacy });
      snapshot.current = privacy;
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
      showToast('Privacy settings saved.');
    } catch { showToast('Failed to save settings.', 'error'); }
    finally { setSaving(false); }
  };

  const updateVisibility = (key, val) => setPrivacy(p => ({ ...p, visibility: { ...p.visibility, [key]: val } }));
  const updateActivity   = (key, val) => setPrivacy(p => ({ ...p, activity:   { ...p.activity,   [key]: val } }));
  const updateFollow     = (key, val) => setPrivacy(p => ({ ...p, follow:     { ...p.follow,     [key]: val } }));
  const updateDiscovery  = (key, val) => setPrivacy(p => ({ ...p, discovery:  { ...p.discovery,  [key]: val } }));

  const handleTogglePrivacy = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const result = await setAccountPrivacy(!isPrivate);
      setIsPrivate(result.isPrivate);
      if (!result.isPrivate) { setPendingCount(0); setRequests([]); }
      showToast(result.message || `Account is now ${result.isPrivate ? 'private' : 'public'}`);
    } catch { showToast('Failed to update privacy.', 'error'); }
    finally { setToggling(false); }
  };

  const handleLoadRequests = async () => {
    if (showRequests) { setShowRequests(false); return; }
    setLoadingRequests(true); setShowRequests(true);
    try {
      const data = await getFollowRequests();
      setRequests(data.requests || []);
      setPendingCount(data.count || 0);
    } catch { showToast('Failed to load follow requests.', 'error'); }
    finally { setLoadingRequests(false); }
  };

  const handleAccept = async (reqId) => {
    setActionLoading(p => ({ ...p, [reqId]: 'accept' }));
    try {
      await acceptFollowRequest(reqId);
      setRequests(p => p.filter(r => (r._id || r.id) !== reqId));
      setPendingCount(p => Math.max(0, p - 1));
      showToast('Follow request accepted.');
    } catch { showToast('Failed to accept request.', 'error'); }
    finally { setActionLoading(p => { const n = { ...p }; delete n[reqId]; return n; }); }
  };

  const handleDecline = async (reqId) => {
    setActionLoading(p => ({ ...p, [reqId]: 'decline' }));
    try {
      await declineFollowRequest(reqId);
      setRequests(p => p.filter(r => (r._id || r.id) !== reqId));
      setPendingCount(p => Math.max(0, p - 1));
      showToast('Follow request declined.');
    } catch { showToast('Failed to decline request.', 'error'); }
    finally { setActionLoading(p => { const n = { ...p }; delete n[reqId]; return n; }); }
  };

  const getInitials = (name) => (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-[80] rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
          toast.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between z-40">
        <Link to="/settings" className="text-gray-800 dark:text-white p-1"><ArrowLeft size={22} /></Link>
        <h1 className="text-base font-semibold dark:text-white">Privacy</h1>

        {!isEditing ? (
          <button onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <Pencil size={13} /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
              <X size={13} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving || loadingBase}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#fa3f5e] text-white text-sm font-bold disabled:opacity-60 min-w-[68px] justify-center">
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">

        {isEditing && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#fa3f5e]/8 border border-[#fa3f5e]/20 text-[#fa3f5e] text-xs font-semibold">
            <Pencil size={12} /> Editing — tap Save when you're done
          </div>
        )}

        {/* ── Account Privacy ─────────────── always interactive ── */}
        <div>
          <SectionTitle title="Account Privacy" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-pink-50 dark:bg-gray-800 flex items-center justify-center text-[#fa3f5e] flex-shrink-0">
                  <Lock size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Private Account</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {loadingBase ? 'Loading…' : isPrivate ? 'Only approved followers can see your posts' : 'Anyone can see your posts'}
                  </p>
                </div>
              </div>
              {toggling
                ? <Loader2 size={16} className="animate-spin text-gray-400 flex-shrink-0" />
                : <Toggle on={isPrivate} onChange={handleTogglePrivacy} disabled={loadingBase} />
              }
            </div>

            {isPrivate && (
              <>
                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                <button onClick={handleLoadRequests}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-pink-50 dark:bg-gray-800 flex items-center justify-center text-[#fa3f5e] flex-shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Follow Requests</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {pendingCount > 0 ? `${pendingCount} pending` : 'No pending requests'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingCount > 0 && (
                      <span className="text-[11px] font-bold bg-[#fa3f5e] text-white w-5 h-5 rounded-full flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                    <ChevronRight size={16} className={`text-gray-400 transition-transform ${showRequests ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {showRequests && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {loadingRequests ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                        <Loader2 size={16} className="animate-spin" /> <span className="text-sm">Loading…</span>
                      </div>
                    ) : requests.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                          <UserCheck size={22} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No pending requests</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {requests.map((req) => {
                          const reqId = req._id || req.id;
                          const isActing = actionLoading[reqId];
                          return (
                            <div key={reqId} className="flex items-center gap-3 px-4 py-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex-shrink-0">
                                {req.profilePicture
                                  ? <img src={req.profilePicture} alt={req.username} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">{getInitials(req.username)}</div>
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{req.username}</p>
                                <p className="text-[11px] text-gray-400">{fmt(req.followers_count || 0)} followers</p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button onClick={() => handleAccept(reqId)} disabled={!!isActing}
                                  className="px-3 py-1.5 bg-[#fa3f5e] text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                                  {isActing === 'accept' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Confirm
                                </button>
                                <button onClick={() => handleDecline(reqId)} disabled={!!isActing}
                                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1">
                                  {isActing === 'decline' ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Profile Visibility ────────────────────────────── */}
        <div>
          <SectionTitle title="Profile Visibility" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <Eye size={16} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose who can view each part of your profile</p>
            </div>
            {VISIBILITY_FIELDS.map(({ key, label }) => (
              <SelectRow key={key} label={label}
                value={privacy.visibility[key] || 'Everyone'}
                onChange={val => updateVisibility(key, val)}
                options={VISIBILITY_OPTIONS}
                disabled={!isEditing} />
            ))}
          </div>
        </div>

        {/* ── Activity Status ───────────────────────────────── */}
        <div>
          <SectionTitle title="Activity Status" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <ToggleRow label="Show Online Status"
              sublabel="Let others see when you're active"
              on={privacy.activity.show_online_status}
              onChange={e => updateActivity('show_online_status', e.target.checked)}
              disabled={!isEditing} />
            <ToggleRow label="Show Last Seen"
              sublabel="Display when you were last active"
              on={privacy.activity.show_last_seen}
              onChange={e => updateActivity('show_last_seen', e.target.checked)}
              disabled={!isEditing} />
            <ToggleRow label="Show Read Receipts"
              sublabel="Let others know when you've read their messages"
              on={privacy.activity.show_read_receipts}
              onChange={e => updateActivity('show_read_receipts', e.target.checked)}
              disabled={!isEditing} />
          </div>
        </div>

        {/* ── Follow Settings ───────────────────────────────── */}
        <div>
          <SectionTitle title="Follow Settings" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <ToggleRow label="Allow Follow Requests"
              sublabel="Let people send you follow requests"
              on={privacy.follow.allow_follow_requests}
              onChange={e => updateFollow('allow_follow_requests', e.target.checked)}
              disabled={!isEditing} />
            <ToggleRow label="Auto Approve Follow Requests"
              sublabel="Automatically accept all follow requests"
              on={privacy.follow.auto_approve}
              onChange={e => updateFollow('auto_approve', e.target.checked)}
              disabled={!isEditing || !privacy.follow.allow_follow_requests} />
          </div>
        </div>

        {/* ── Messaging Privacy ─────────────────────────────── */}
        <div>
          <SectionTitle title="Messaging Privacy" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <MessageCircle size={16} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Who can send you messages</p>
            </div>
            <SelectRow label="Allow Messages From"
              value={privacy.messaging}
              onChange={val => setPrivacy(p => ({ ...p, messaging: val }))}
              options={VISIBILITY_OPTIONS}
              disabled={!isEditing} />
          </div>
        </div>

        {/* ── Search & Discovery ────────────────────────────── */}
        <div>
          <SectionTitle title="Search & Discovery" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Control how people can find you</p>
            </div>
            {DISCOVERY_FIELDS.map(({ key, label }) => (
              <ToggleRow key={key} label={label}
                on={privacy.discovery[key] ?? true}
                onChange={e => updateDiscovery(key, e.target.checked)}
                disabled={!isEditing} />
            ))}
          </div>
        </div>

        {/* Save Button — only when editing */}
        {isEditing && (
          <button onClick={handleSave} disabled={saving || loadingBase}
            className="w-full py-3.5 rounded-2xl bg-[#fa3f5e] text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-[#fa3f5e]/20">
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
              : 'Save Privacy Settings'
            }
          </button>
        )}

      </div>
    </div>
  );
};

export default PrivacySettings;
