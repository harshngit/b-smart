import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import CreatePostModal from './CreatePostModal';
import api from '../lib/api';
import { fetchMe, setUser } from '../store/authSlice';
import { fetchWallet } from '../store/walletSlice';

const BASE_URL = 'https://api.bebsmart.in';

const adAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const normalizeArr = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== 'object') return [];
  const keys = ['data','users','suggestions','results','items'];
  for (const k of keys) { if (Array.isArray(v[k])) return v[k]; if (v.data && Array.isArray(v.data[k])) return v.data[k]; }
  return [];
};

// ── Right Sidebar — desktop only ──────────────────────────────────────────────
const RightSidebar = ({ userObject }) => {
  const navigate = useNavigate();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`${BASE_URL}/api/suggestions/users`, { headers: adAuthHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (active) { setSuggestedUsers(normalizeArr(d).slice(0, 5)); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const username = userObject?.username || 'User';
  const avatar = userObject?.avatar_url || userObject?.profile_picture || null;
  const fullName = userObject?.full_name || userObject?.name || '';

  return (
    <div className="hidden lg:flex flex-col w-[320px] flex-shrink-0 pt-0 pl-8 sticky top-0 h-screen overflow-y-auto">
      {/* Current user */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center cursor-pointer ring-1 ring-offset-2 ring-pink-400/40"
            onClick={() => navigate(`/profile/${username}`)}
          >
            {avatar
              ? <img src={avatar} alt={username} className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-sm">{username.slice(0,1).toUpperCase()}</span>
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:underline" onClick={() => navigate(`/profile/${username}`)}>{username}</p>
            {fullName && <p className="text-xs text-gray-400 truncate">{fullName}</p>}
          </div>
        </div>
        <button className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">Switch</button>
      </div>

      {/* Suggested for you */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Suggested for you</span>
        <button className="text-xs font-bold text-gray-900 dark:text-white hover:text-gray-600 transition-colors">See all</button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="w-28 h-2.5 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="w-20 h-2 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : suggestedUsers.length === 0 ? null : (
        <div className="flex flex-col gap-3">
          {suggestedUsers.map((user, i) => {
            const u = user.user || user;
            const uname = u.username || u.name || 'User';
            const uavatar = u.avatar_url || u.avatar || u.profile_picture || null;
            const reason = u.mutual_friends_count
              ? `${u.mutual_friends_count} mutual`
              : u.followed_by ? `Followed by ${u.followed_by}` : 'Suggested for you';
            return (
              <div key={u._id || u.id || i} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center cursor-pointer"
                  onClick={() => navigate(`/profile/${uname}`)}
                >
                  {uavatar
                    ? <img src={uavatar} alt={uname} className="w-full h-full object-cover" />
                    : <span className="text-white text-xs font-bold">{uname.slice(0,1).toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:underline" onClick={() => navigate(`/profile/${uname}`)}>{uname}</p>
                  <p className="text-xs text-gray-400 truncate">{reason}</p>
                </div>
                <button className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors flex-shrink-0">Follow</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer links */}
      <div className="mt-6 text-[10px] text-gray-400 leading-relaxed">
        About · Help · Press · API · Jobs · Privacy · Terms · Locations · Language
        <br /><br />
        © 2026 B-SMART
      </div>
    </div>
  );
};

const Layout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { userObject } = useSelector((state) => state.auth);
  const walletBalance = useSelector((state) => state.wallet.balance);
  const isMessagesPage = location.pathname.startsWith('/messages');
  const isExcludedPage = ['/profile', '/settings', '/promote'].includes(location.pathname) || isMessagesPage;
  const isFullScreenPage = ['/reels', '/promote', '/ads'].includes(location.pathname) || isMessagesPage;
  const showTopBar = !isExcludedPage && !isFullScreenPage;

  // Fetch wallet on mount and poll every 30s to keep balance live
  useEffect(() => {
    dispatch(fetchWallet());
    const interval = setInterval(() => dispatch(fetchWallet()), 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState('post');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [savingProfileSetup, setSavingProfileSetup] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const userId = userObject?._id || userObject?.id || '';

  const initialSetupState = useMemo(() => {
    const rawGender = (userObject?.gender || userObject?.sex || '').toString().toLowerCase();
    const gender = rawGender === 'male' || rawGender === 'female' ? rawGender : '';
    const a = userObject?.address || {};
    return {
      gender,
      age: userObject?.age ? String(userObject.age) : '',
      address_line1: a.address_line1 || a.addressLine1 || '',
      address_line2: a.address_line2 || a.addressLine2 || '',
      pincode: a.pincode || '',
      city: a.city || '',
      state: a.state || '',
      country: a.country || '',
    };
  }, [userObject?.address, userObject?.gender, userObject?.sex, userObject?.age]);

  const [profileSetupForm, setProfileSetupForm] = useState(initialSetupState);

  useEffect(() => {
    setProfileSetupForm(initialSetupState);
  }, [initialSetupState]);

  // Check if profile still needs setup (gender OR age OR any address field missing)
  const needsProfileSetup = useMemo(() => {
    if (!userObject) return false;
    const g = (userObject?.gender || '').toString().toLowerCase();
    const age = userObject?.age;
    const a = userObject?.address || {};
    const addressLine1 = a.address_line1 || a.addressLine1 || '';
    const pincode = a.pincode || '';
    const city = a.city || '';
    const state = a.state || '';
    const country = a.country || '';
    return !g || !age || !addressLine1 || !pincode || !city || !state || !country;
  }, [userObject]);

  // Show modal on login if profile is incomplete and not dismissed this session
  useEffect(() => {
    if (!userObject) return;
    if (!needsProfileSetup) {
      setShowProfileSetup(false);
      return;
    }
    const key = userId ? `profile_setup_dismissed_${userId}` : 'profile_setup_dismissed';
    const dismissed = sessionStorage.getItem(key) === '1';
    if (!dismissed) setShowProfileSetup(true);
  }, [needsProfileSetup, userId, userObject]);

  const closeProfileSetup = useCallback(() => {
    const key = userId ? `profile_setup_dismissed_${userId}` : 'profile_setup_dismissed';
    sessionStorage.setItem(key, '1');
    setShowProfileSetup(false);
    setProfileSetupError('');
    setSaveSuccess(false);
  }, [userId]);

  // ── Save handler: PATCH /api/users/{id} → then re-fetch /api/auth/me ──────
  const saveProfileSetup = useCallback(async () => {
    const gender = (profileSetupForm.gender || '').toLowerCase();
    const age = parseInt(profileSetupForm.age || '', 10);
    const address = {
      address_line1: profileSetupForm.address_line1 || '',
      address_line2: profileSetupForm.address_line2 || '',
      pincode: profileSetupForm.pincode || '',
      city: profileSetupForm.city || '',
      state: profileSetupForm.state || '',
      country: profileSetupForm.country || '',
    };

    if (!gender) {
      setProfileSetupError('Please select your gender.');
      return;
    }
    if (!age || age < 13 || age > 100) {
      setProfileSetupError('Please enter a valid age (13–100).');
      return;
    }
    if (!address.address_line1 || !address.pincode || !address.city || !address.state || !address.country) {
      setProfileSetupError('Please fill all required address fields (Address Line 1, Pincode, City, State, Country).');
      return;
    }

    if (!userId) {
      setProfileSetupError('User session not found. Please log in again.');
      return;
    }

    setSavingProfileSetup(true);
    setProfileSetupError('');
    setSaveSuccess(false);

    const payload = {
      gender,
      age,
      address,
      // Also derive location string from city + country for convenience
      location: [address.city, address.country].filter(Boolean).join(', '),
    };

    try {
      // Step 1: PATCH /api/users/{id}
      await api.patch(`/users/${userId}`, payload);
    } catch {
      // Fallback: try PUT if PATCH not supported
      try {
        await api.put(`/users/${userId}`, payload);
      } catch {
        setSavingProfileSetup(false);
        setProfileSetupError('Failed to save profile. Please try again.');
        return;
      }
    }

    // Step 2: Re-fetch /api/auth/me to refresh Redux store with latest data
    try {
      const meRes = await api.get('/auth/me');
      const freshUser =
        meRes?.data?.user ??
        meRes?.data?.data ??
        meRes?.data;

      if (freshUser && typeof freshUser === 'object') {
        dispatch(setUser(freshUser));
      } else {
        // Fallback: use fetchMe thunk
        dispatch(fetchMe());
      }
    } catch {
      // Even if re-fetch fails, still dispatch fetchMe as fallback
      dispatch(fetchMe());
    }

    setSavingProfileSetup(false);
    setSaveSuccess(true);

    // Close after a short success flash
    setTimeout(() => {
      setShowProfileSetup(false);
      setSaveSuccess(false);
    }, 900);
  }, [dispatch, profileSetupForm, userId]);

  const handleOpenCreateModal = (type = 'post') => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  const field = (name, label, placeholder, type = 'text') => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {label}
        {['address_line1', 'pincode', 'city', 'state', 'country'].includes(name) && (
          <span className="text-red-400 ml-0.5">*</span>
        )}
      </label>
      <input
        type={type}
        value={profileSetupForm[name]}
        onChange={(e) => setProfileSetupForm((p) => ({ ...p, [name]: e.target.value }))}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-black md:pb-0 ${isFullScreenPage ? 'pb-0' : 'pb-16'}`}>
      <Sidebar onOpenCreateModal={handleOpenCreateModal} />

      <div className="md:pl-20 min-h-screen transition-all duration-300">
        {showTopBar && <TopBar />}

        <div className={`
          ${showTopBar ? 'pt-16 md:pt-0' : 'pt-0 md:pt-0'}
          w-full flex justify-center
          ${isMessagesPage ? 'md:max-w-none lg:max-w-none' : 'lg:max-w-[850px] mx-auto'}
          ${isMessagesPage ? 'px-0 md:px-0' : 'px-0 md:px-0'}
        `}>
          {/* Main content */}
          <div className={`
            flex-1 min-w-0
            ${!isExcludedPage && !isFullScreenPage ? 'max-w-[470px]' : ''}
            ${isMessagesPage ? 'w-full' : ''}
          `}>
            <Outlet />
          </div>

          {/* Right sidebar — only on home/feed pages */}
          {!isExcludedPage && !isFullScreenPage && !isMessagesPage && (
            <RightSidebar userObject={userObject} />
          )}
        </div>
      </div>

      <BottomNav onOpenCreateModal={handleOpenCreateModal} />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialType={createType}
      />

      {/* ── Profile Setup Modal ─────────────────────────────────────────── */}
      {showProfileSetup && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <div className="text-base font-bold text-gray-900 dark:text-white">Complete your profile</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Add your details to continue.{' '}
                  <span className="text-red-400">* required</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeProfileSetup}
                className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors shrink-0"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* Error */}
              {profileSetupError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-300 text-sm flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">⚠️</span>
                  <span>{profileSetupError}</span>
                </div>
              )}

              {/* Success */}
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-300 text-sm flex items-center gap-2">
                  <span>✅</span>
                  <span>Profile saved successfully!</span>
                </div>
              )}

              {/* Gender + Age row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Gender <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={profileSetupForm.gender}
                    onChange={(e) => setProfileSetupForm((p) => ({ ...p, gender: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white"
                  >
                    <option value="" disabled>Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Age */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Age <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="13"
                    max="100"
                    value={profileSetupForm.age}
                    onChange={(e) => setProfileSetupForm((p) => ({ ...p, age: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              {/* Address Line 1 */}
              {field('address_line1', 'Address Line 1', 'Flat / House No., Building, Street')}

              {/* Address Line 2 */}
              {field('address_line2', 'Address Line 2 (optional)', 'Area, Landmark')}

              {/* Pincode + City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('pincode', 'Pincode', '560001')}
                {field('city', 'City', 'Bengaluru')}
              </div>

              {/* State + Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('state', 'State', 'Karnataka')}
                {field('country', 'Country', 'India')}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closeProfileSetup}
                disabled={savingProfileSetup}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-200 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                Later
              </button>
              <button
                type="button"
                onClick={saveProfileSetup}
                disabled={savingProfileSetup}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange text-white font-bold shadow-lg shadow-insta-pink/20 disabled:opacity-70 flex items-center gap-2 transition-opacity"
              >
                {savingProfileSetup ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Wallet for Desktop — balance from Redux wallet slice */}
      {!isExcludedPage && (
        <Link
          to="/wallet"
          className="hidden md:flex fixed bottom-8 right-8 z-50 bg-white dark:bg-[#262626] rounded-full shadow-lg p-1 pr-4 items-center gap-2 border border-gray-100 dark:border-gray-800 animate-fade-in hover:scale-105 transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-insta-yellow via-insta-orange to-insta-pink flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Balance</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              Coins {walletBalance}
            </span>
          </div>
        </Link>
      )}
    </div>
  );
};

export default Layout;