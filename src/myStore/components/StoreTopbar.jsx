import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Bell, ChevronDown, HelpCircle, Package, Plus, Search } from 'lucide-react';
import ServiceIcon from './ServiceIcon';
import { useNotificationSocket } from '../../hooks/useNotificationSocket';

// Desktop top bar for the My Store module — search across the seller's own
// products/services/orders/bookings, help, notifications, a "+ New Listing"
// shortcut, and the account avatar. Sits to the right of StoreSidebar.
const StoreTopbar = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.userObject);
  const products = useSelector((state) => state.products.items);
  const services = useSelector((state) => state.services.items);
  const orders = useSelector((state) => state.orders.items);
  const bookings = useSelector((state) => state.bookings.items);
  const { unreadCount } = useNotificationSocket({ limit: 10 });

  const [query, setQuery] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const [newListingOpen, setNewListingOpen] = useState(false);
  const searchRef = useRef(null);
  const newListingRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setResultsOpen(false);
      if (newListingRef.current && !newListingRef.current.contains(event.target)) setNewListingOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = (value) => String(value ?? '').toLowerCase().includes(q);
    return [
      ...products.filter((p) => matches(p.name) || matches(p.sku)).slice(0, 4).map((p) => ({
        key: `product-${p.id}`, icon: Package, label: p.name, meta: 'Product', to: `/market/my-store/products`,
      })),
      ...services.filter((s) => matches(s.name)).slice(0, 4).map((s) => ({
        key: `service-${s.id}`, icon: ServiceIcon, label: s.name, meta: 'Service', to: `/market/my-store/services`,
      })),
      ...orders.filter((o) => matches(o.id) || matches(o.customer)).slice(0, 4).map((o) => ({
        key: `order-${o.id}`, icon: Package, label: `Order ${o.id}`, meta: o.customer || 'Order', to: `/market/my-store/orders/${o.id}`,
      })),
      ...bookings.filter((b) => matches(b.service) || matches(b.customer)).slice(0, 4).map((b) => ({
        key: `booking-${b.id}`, icon: ServiceIcon, label: b.service, meta: b.customer || 'Booking', to: `/market/my-store/bookings/${b.id}`,
      })),
    ].slice(0, 8);
  }, [query, products, services, orders, bookings]);

  const submitSearch = (event) => {
    event.preventDefault();
    if (results[0]) navigate(results[0].to);
    setResultsOpen(false);
  };

  const getInitials = (name) => {
    const raw = (name || '').trim();
    if (!raw) return 'U';
    const parts = raw.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
  };

  return (
    <div className="hidden md:flex sticky top-0 z-30 h-16 items-center gap-3 border-b border-gray-100 bg-white px-6 dark:border-gray-800 dark:bg-black">
      <form onSubmit={submitSearch} ref={searchRef} className="relative flex-1 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setResultsOpen(true); }}
          onFocus={() => setResultsOpen(true)}
          placeholder="Search store listings, customer orders, bookings…"
          className="h-10 w-full rounded-full border border-gray-100 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#fa3f5e] focus:bg-white dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:bg-black"
        />
        {resultsOpen && query.trim() && (
          <div className="absolute left-0 right-0 top-full mt-1.5 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">No matches for "{query.trim()}".</p>
            ) : (
              results.map((result) => (
                <Link
                  key={result.key}
                  to={result.to}
                  onClick={() => { setResultsOpen(false); setQuery(''); }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <result.icon size={14} className="shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1 truncate font-medium text-gray-800 dark:text-gray-200">{result.label}</span>
                  <span className="shrink-0 text-xs text-gray-400">{result.meta}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <Link
          to="/settings/help"
          className="hidden lg:flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
        >
          <HelpCircle size={16} /> Help &amp; Support
        </Link>

        <button
          type="button"
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-0.5 bg-[#fa3f5e] rounded-full border-2 border-white dark:border-black flex items-center justify-center">
              <span className="text-[8px] font-black text-white leading-none">{unreadCount > 99 ? '99+' : unreadCount}</span>
            </span>
          )}
        </button>

        <div className="relative" ref={newListingRef}>
          <button
            type="button"
            onClick={() => setNewListingOpen((open) => !open)}
            aria-expanded={newListingOpen}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> New Listing <ChevronDown size={13} className={`transition-transform ${newListingOpen ? 'rotate-180' : ''}`} />
          </button>
          {newListingOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <Link to="/market/add-product" onClick={() => setNewListingOpen(false)} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                <Package size={15} /> Add Product
              </Link>
              <Link to="/market/add-service" onClick={() => setNewListingOpen(false)} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                <ServiceIcon size={15} /> Add Service
              </Link>
            </div>
          )}
        </div>

        <Link to="/profile" aria-label="Profile" className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
          {currentUser?.avatar_url || currentUser?.profile_picture ? (
            <img src={currentUser.avatar_url || currentUser.profile_picture} alt={currentUser?.username || 'Profile'} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">{getInitials(currentUser?.full_name || currentUser?.name || currentUser?.username)}</span>
          )}
        </Link>
      </div>
    </div>
  );
};

export default StoreTopbar;
