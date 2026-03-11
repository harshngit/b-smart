import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import CreatePostModal from './CreatePostModal';
import api from '../lib/api';
import { fetchMe, setUser } from '../store/authSlice';

const Layout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { userObject } = useSelector((state) => state.auth);
  const isExcludedPage = ['/profile', '/settings', '/reels', '/promote', '/ads'].includes(location.pathname);
  const isFullScreenPage = ['/reels', '/promote', '/ads'].includes(location.pathname);
  // Show TopBar on mobile for all pages except profile, settings, reels, and promote
  const showTopBar = !isExcludedPage;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState('post');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [savingProfileSetup, setSavingProfileSetup] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState('');

  const userId = userObject?._id || userObject?.id || '';
  const initialSetupState = useMemo(() => {
    const rawGender = (userObject?.gender || userObject?.sex || '').toString().toLowerCase();
    const gender = rawGender === 'male' || rawGender === 'female' ? rawGender : '';
    const a = userObject?.address || {};
    return {
      gender,
      address_line1: a.address_line1 || a.addressLine1 || '',
      address_line2: a.address_line2 || a.addressLine2 || '',
      pincode: a.pincode || '',
      city: a.city || '',
      state: a.state || '',
      country: a.country || '',
    };
  }, [userObject?.address, userObject?.gender, userObject?.sex]);
  const [profileSetupForm, setProfileSetupForm] = useState(initialSetupState);

  useEffect(() => {
    setProfileSetupForm(initialSetupState);
  }, [initialSetupState]);

  const needsProfileSetup = useMemo(() => {
    if (!userObject) return false;
    const g = (userObject?.gender || '').toString().toLowerCase();
    const a = userObject?.address || {};
    const addressLine1 = a.address_line1 || a.addressLine1 || '';
    const pincode = a.pincode || '';
    const city = a.city || '';
    const state = a.state || '';
    const country = a.country || '';
    return !g || !addressLine1 || !pincode || !city || !state || !country;
  }, [userObject]);

  useEffect(() => {
    if (!userObject) return;
    if (!needsProfileSetup) return;
    const key = userId ? `profile_setup_dismissed_${userId}` : 'profile_setup_dismissed';
    const dismissed = sessionStorage.getItem(key) === '1';
    if (!dismissed) setShowProfileSetup(true);
  }, [needsProfileSetup, userId, userObject]);

  const closeProfileSetup = useCallback(() => {
    const key = userId ? `profile_setup_dismissed_${userId}` : 'profile_setup_dismissed';
    sessionStorage.setItem(key, '1');
    setShowProfileSetup(false);
    setProfileSetupError('');
  }, [userId]);

  const saveProfileSetup = useCallback(async () => {
    const gender = (profileSetupForm.gender || '').toLowerCase();
    const address = {
      address_line1: profileSetupForm.address_line1 || '',
      address_line2: profileSetupForm.address_line2 || '',
      pincode: profileSetupForm.pincode || '',
      city: profileSetupForm.city || '',
      state: profileSetupForm.state || '',
      country: profileSetupForm.country || '',
    };

    if (!gender || !address.address_line1 || !address.pincode || !address.city || !address.state || !address.country) {
      setProfileSetupError('Please fill gender and all required address fields.');
      return;
    }

    setSavingProfileSetup(true);
    setProfileSetupError('');

    const payload = { gender, address };
    const endpoints = ['/users/me', '/auth/me', '/users/profile', '/auth/profile', '/users/update'];
    const methods = ['patch', 'put'];

    const tryRequest = async () => {
      for (const endpoint of endpoints) {
        for (const method of methods) {
          try {
            const res = await api[method](endpoint, payload);
            const data = res?.data?.user ?? res?.data?.data ?? res?.data;
            if (data && typeof data === 'object') {
              dispatch(setUser(data));
            } else {
              dispatch(fetchMe());
            }
            return true;
          } catch {
            continue;
          }
        }
      }

      if (userId) {
        const endpoint = `/users/${userId}`;
        for (const method of methods) {
          try {
            const res = await api[method](endpoint, payload);
            const data = res?.data?.user ?? res?.data?.data ?? res?.data;
            if (data && typeof data === 'object') {
              dispatch(setUser(data));
            } else {
              dispatch(fetchMe());
            }
            return true;
          } catch {
            continue;
          }
        }
      }

      return false;
    };

    const ok = await tryRequest();
    if (!ok) {
      setProfileSetupError('Failed to save. Please try again.');
      setSavingProfileSetup(false);
      return;
    }

    setSavingProfileSetup(false);
    setShowProfileSetup(false);
  }, [dispatch, profileSetupForm, userId]);

  const handleOpenCreateModal = (type = 'post') => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-black md:pb-0 ${isFullScreenPage ? 'pb-0' : 'pb-16'}`}>
      <Sidebar onOpenCreateModal={handleOpenCreateModal} />

      <div className="md:pl-20 min-h-screen transition-all duration-300">
        {showTopBar && <TopBar />}

        {/* Main Content Container with Gaps on Desktop */}
        <div className={`
          ${showTopBar ? 'pt-16 md:pt-4' : 'pt-0 md:pt-4'} 
          w-full 
          md:max-w-[calc(100%-80px)] 
          lg:max-w-4xl 
          mx-auto 
          px-0 
          md:px-8
        `}>
          <Outlet />
        </div>
      </div>

      <BottomNav onOpenCreateModal={handleOpenCreateModal} />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialType={createType}
      />

      {showProfileSetup && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#262626] rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-base font-bold text-gray-900 dark:text-white truncate">Complete your profile</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Add gender and address to continue.</div>
              </div>
              <button
                type="button"
                onClick={closeProfileSetup}
                className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {profileSetupError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-300 text-sm">
                  {profileSetupError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Gender</label>
                <select
                  value={profileSetupForm.gender}
                  onChange={(e) => setProfileSetupForm((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white"
                >
                  <option value="" disabled>Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Address Line 1</label>
                <input
                  value={profileSetupForm.address_line1}
                  onChange={(e) => setProfileSetupForm((p) => ({ ...p, address_line1: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  placeholder="Address line 1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Address Line 2</label>
                <input
                  value={profileSetupForm.address_line2}
                  onChange={(e) => setProfileSetupForm((p) => ({ ...p, address_line2: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  placeholder="Address line 2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Pincode</label>
                  <input
                    value={profileSetupForm.pincode}
                    onChange={(e) => setProfileSetupForm((p) => ({ ...p, pincode: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    placeholder="560001"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">City</label>
                  <input
                    value={profileSetupForm.city}
                    onChange={(e) => setProfileSetupForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    placeholder="Bengaluru"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">State</label>
                  <input
                    value={profileSetupForm.state}
                    onChange={(e) => setProfileSetupForm((p) => ({ ...p, state: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    placeholder="Karnataka"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Country</label>
                  <input
                    value={profileSetupForm.country}
                    onChange={(e) => setProfileSetupForm((p) => ({ ...p, country: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    placeholder="India"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeProfileSetup}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                disabled={savingProfileSetup}
              >
                Later
              </button>
              <button
                type="button"
                onClick={saveProfileSetup}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange text-white font-bold shadow-lg shadow-insta-pink/20 disabled:opacity-70"
                disabled={savingProfileSetup}
              >
                {savingProfileSetup ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Wallet for Desktop */}
      {!isExcludedPage && (
        <Link to="/wallet" className="hidden md:flex fixed bottom-8 right-8 z-50 bg-white dark:bg-[#262626] rounded-full shadow-lg p-1 pr-4 items-center gap-2 border border-gray-100 dark:border-gray-800 animate-fade-in hover:scale-105 transition-transform cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-insta-yellow via-insta-orange to-insta-pink flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Balance</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              Coins {userObject?.wallet?.balance ? Math.floor(Number(userObject.wallet.balance)) : 0}
            </span>
          </div>
        </Link>
      )}
    </div>
  );
};

export default Layout;
