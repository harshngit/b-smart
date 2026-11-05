import ServiceIcon from './ServiceIcon';
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LayoutDashboard, ClipboardList, Package, ArrowLeft, Calendar, UserRound, BadgeCheck, Moon, Sun } from 'lucide-react';
import bsmartIcon from '../../assets/bsmart_logo.png';
import bsmartWordmark from '../../assets/bsmart.png';
import listingSubscriptionService from '../../services/listingSubscriptionService';
import storeProfileService from '../../services/storeProfileService';
import { toggleTheme } from '../../store/themeSlice';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/market/my-store' },
  { icon: UserRound, label: 'Profile', path: '/market/my-store/profile' },
  { icon: Calendar,        label: 'Bookings', path: '/market/my-store/bookings', countKey: 'bookings' },
  { icon: ClipboardList,   label: 'Orders',    path: '/market/my-store/orders', countKey: 'orders' },
  { icon: Package,         label: 'Products',  path: '/market/my-store/products', extraActive: ['/market/add-product', '/market/edit-product'] },
  { icon: ServiceIcon,          label: 'Service',  path: '/market/my-store/services', extraActive: ['/market/add-service', '/market/edit-service'] },
];

const trialDaysLeft = (dateStr) => {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
};

// Desktop sidebar for the My Store module — always expanded (not a hover
// rail), with the seller's store identity up top and real nav badge counts.
const StoreSidebar = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.userObject);
  const { mode } = useSelector((state) => state.theme);
  const orders = useSelector((state) => state.orders.items);
  const bookings = useSelector((state) => state.bookings.items);
  const [trialDays, setTrialDays] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [storeName, setStoreName] = useState('');

  const newBookingsCount = bookings.filter((b) => b.status === 'New').length;
  const openOrdersCount = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)).length;
  const navCounts = { bookings: newBookingsCount, orders: openOrdersCount };

  useEffect(() => {
    if (currentUser?.role !== 'influencer') return;
    let active = true;
    listingSubscriptionService.getMyAccountSubscription()
      .then((sub) => {
        if (!active) return;
        setSubscription(sub);
        setTrialDays(sub?.status === 'trialing' ? trialDaysLeft(sub.trial_ends_at) : null);
      })
      .catch(() => { if (active) { setSubscription(null); setTrialDays(null); } });
    return () => { active = false; };
  }, [currentUser?.role]);

  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id;
    if (!userId) return undefined;
    let active = true;
    storeProfileService.get(userId)
      .then((profile) => { if (active) setStoreName(profile?.store_name || ''); })
      .catch(() => { if (active) setStoreName(''); });
    return () => { active = false; };
  }, [currentUser?._id, currentUser?.id]);

  const isActive = (item) =>
    (item.path === '/market/my-store' ? location.pathname === item.path : location.pathname.startsWith(item.path))
    || (item.extraActive || []).some((path) => location.pathname.startsWith(path));

  const getInitials = (name) => {
    const raw = (name || '').trim();
    if (!raw) return 'U';
    const parts = raw.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
  };

  const displayName = currentUser?.full_name || currentUser?.name || currentUser?.username || 'Your Store';
  const displayStoreName = storeName || `${displayName}'s Store`;
  const subscriptionLabel = trialDays != null ? `Trial · ${trialDays}d left`
    : subscription?.status === 'active' ? 'Active'
    : subscription?.status === 'past_due' ? 'Payment failed'
    : '';

  return (
    <div className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white dark:bg-black border-r border-gray-100 dark:border-gray-800 z-50">
      <Link to="/" className="h-14 flex-shrink-0 flex items-center gap-1.5 px-4 border-b border-gray-100 dark:border-gray-800">
        <img src={bsmartIcon} alt="" className="h-9 w-9 flex-shrink-0 object-contain" />
        <img src={bsmartWordmark} alt="b_smart" className="h-8 w-auto object-contain" />
      </Link>

      {/* Store identity */}
      <Link to="/market/my-store/profile" className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-50 dark:bg-pink-900/20">
          {currentUser?.avatar_url || currentUser?.profile_picture ? (
            <img src={currentUser.avatar_url || currentUser.profile_picture} alt={displayStoreName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-[#fa3f5e]">{getInitials(displayName)}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{displayStoreName}</p>
          <p className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
            {currentUser?.is_verified ? (<><BadgeCheck size={11} className="text-[#fa3f5e]" /> Verified Creator</>) : 'Creator store'}
          </p>
        </div>
      </Link>

      <div className="flex-1 flex flex-col gap-1 px-3 py-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          const count = item.countKey ? navCounts[item.countKey] : 0;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 ${
                active ? 'bg-[#fa3f5e] text-white shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-200'
              }`}
            >
              <Icon size={19} className={active ? 'text-white' : 'text-gray-500 dark:text-gray-400'} strokeWidth={active ? 2.5 : 2} />
              <span className={`flex-1 text-sm ${active ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
              {count > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${active ? 'bg-white/20 text-white' : 'bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e]'}`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-3 space-y-1">
        <Link to="/market" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          <ArrowLeft size={18} /> Back to Marketplace
        </Link>
        <button
          type="button"
          onClick={() => dispatch(toggleTheme())}
          className="flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <span className="flex items-center gap-3">{mode === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Dark Mode</span>
          <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${mode === 'dark' ? 'bg-[#fa3f5e]' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${mode === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </span>
        </button>
        <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            {currentUser?.avatar_url || currentUser?.profile_picture ? (
              <img src={currentUser.avatar_url || currentUser.profile_picture} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{getInitials(displayName)}</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{displayName}</p>
            {subscriptionLabel && <p className="truncate text-[10px] text-gray-400 dark:text-gray-500">{subscriptionLabel}</p>}
          </div>
        </Link>
      </div>
    </div>
  );
};

export default StoreSidebar;
