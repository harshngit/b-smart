import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Briefcase, Package, Calendar, ShoppingBag, Download,
  CheckCircle2, ChevronRight,
  Sparkles, ArrowRight, Pin,
} from 'lucide-react';
import { Dropdown } from '../../components/productForm/ProductFormFields';
import orderService from '../../services/orderService';
import serviceBookingService from '../../services/serviceBookingService';
import influencerProductService from '../../services/influencerProductService';
import influencerServiceService from '../../services/influencerServiceService';
import { localDate, bookingDate, bookingTime } from '../data/bookingHelpers';
import { money } from '../data/orderFilters';
import { BookingBadge } from '../components/BookingUI';
import { StatusBadge } from '../components/OrderUI';
import StoreSubscriptionCard from '../../components/StoreSubscriptionCard';

// Deterministic mock daily-earnings series for the "This month" sparkline stat card.
const EARNINGS_DATA = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  const trend = 380 + day * 24;
  const wave = Math.sin(day / 3) * 130;
  return { day, label: `May ${day}`, value: Math.max(50, Math.round(trend + wave)) };
});
const THIS_MONTH_TOTAL = EARNINGS_DATA[EARNINGS_DATA.length - 1].value;

// ── Earnings overview chart: mock series per selectable period ─────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PERIOD_OPTIONS = ['This week', 'This month', 'Last 3 months', 'This year'];
const PERIOD_CONFIG = {
  'This week':      { points: 7,  trendStep: 60,  waveAmp: 40,  waveDiv: 1.2, xInterval: 0, label: (i) => `Day ${i + 1}` },
  'This month':     { points: 31, trendStep: 24,  waveAmp: 130, waveDiv: 3,   xInterval: 4, label: (i) => `May ${i + 1}` },
  'Last 3 months':  { points: 12, trendStep: 180, waveAmp: 260, waveDiv: 1.6, xInterval: 1, label: (i) => `Wk ${i + 1}` },
  'This year':      { points: 12, trendStep: 640, waveAmp: 900, waveDiv: 1.4, xInterval: 0, label: (i) => MONTH_NAMES[i] },
};
const buildEarningsSeries = (period) => {
  const cfg = PERIOD_CONFIG[period];
  return Array.from({ length: cfg.points }, (_, i) => {
    const trend = 380 + i * cfg.trendStep;
    const wave = Math.sin(i / cfg.waveDiv) * cfg.waveAmp;
    return { label: cfg.label(i), value: Math.max(50, Math.round(trend + wave)) };
  });
};

const StatCard = ({ icon: Icon, label, value, sub, accent, sparkline, to }) => {
  const Component = to ? Link : 'div';

  return (
  <Component
    {...(to ? { to, 'aria-label': `View ${label.toLowerCase()}` } : {})}
    className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0 ${to ? 'block transition-colors hover:border-[#fa3f5e] dark:hover:border-[#fa3f5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fa3f5e] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black' : ''}`}
  >
    <div className="flex items-center gap-2 mb-2">
      {Icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon size={15} />
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
    </div>
    <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    {sparkline && (
      <div className="h-8 -mx-1 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={EARNINGS_DATA}>
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fa3f5e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#fa3f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="#fa3f5e" strokeWidth={2} fill="url(#sparkFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
  </Component>
  );
};

const HealthItem = ({ title, sub, done }) => (
  <div className="flex items-start gap-3 py-2.5">
    {done ? (
      <CheckCircle2 size={18} className="text-[#fa3f5e] flex-shrink-0 mt-0.5" />
    ) : (
      <div className="w-[18px] h-[18px] mt-0.5 rounded-full border-2 border-gray-200 dark:border-gray-700 flex-shrink-0" />
    )}
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
        {title}
        {!done && <span className="rounded-full bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Pending</span>}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
    </div>
  </div>
);

const StoreDashboard = () => {
  const currentUser = useSelector((state) => state.auth.userObject);
  const fallbackProducts = useSelector((state) => state.products.items);
  const fallbackServices = useSelector((state) => state.services.items);
  const fallbackOrders = useSelector((state) => state.orders.items);
  const fallbackBookings = useSelector((state) => state.bookings.items);

  // Live seller data, same fetch-with-fallback pattern as Orders/Bookings/
  // Products/Services — falls back to the mock Redux slices on error.
  const [apiProducts, setApiProducts] = useState(null);
  const [apiServices, setApiServices] = useState(null);
  const [apiOrders, setApiOrders] = useState(null);
  const [apiBookings, setApiBookings] = useState(null);

  useEffect(() => {
    influencerProductService.listMine().then(setApiProducts).catch(() => setApiProducts(null));
    influencerServiceService.listMine().then(setApiServices).catch(() => setApiServices(null));
    orderService.listSeller().then(setApiOrders).catch(() => setApiOrders(null));
    serviceBookingService.listSeller().then(setApiBookings).catch(() => setApiBookings(null));
  }, []);

  const products = apiProducts ?? fallbackProducts;
  const services = apiServices ?? fallbackServices;
  const orders = apiOrders ?? fallbackOrders;
  const bookings = apiBookings ?? fallbackBookings;

  const [earningsPeriod, setEarningsPeriod] = useState('This month');
  const earningsData = useMemo(() => buildEarningsSeries(earningsPeriod), [earningsPeriod]);
  const earningsTotal = earningsData[earningsData.length - 1].value;
  const platformFee = Math.round(earningsTotal * 0.1);
  const netTakeHome = earningsTotal - platformFee;

  const activeProducts = products.filter((p) => (p.status || (p.rating > 0 ? 'Active' : 'Draft')) === 'Active').length;
  const lowStockProducts = products.filter((p) => (p.status || 'Active') !== 'Draft' && Number(p.stockQuantity) > 0 && Number(p.stockQuantity) <= 5).length;
  const activeServices = services.filter((s) => s.status === 'Published').length;
  const today = localDate();
  const bookedToday = bookings.filter((b) => b.date === today).length;
  const openOrders = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)).length;
  const newBookings = bookings.filter((b) => b.status === 'New').length;
  const availableBalance = Math.round(THIS_MONTH_TOTAL * 0.7);
  const firstName = (currentUser?.full_name || currentUser?.name || currentUser?.username || '').split(' ')[0];
  const activeListings = activeProducts + activeServices;
  const healthChecks = [
    { title: 'Complete your profile', sub: 'Add store information and profile photo', done: true },
    { title: 'Add a service or product', sub: activeListings > 0 ? `${activeListings} active item${activeListings === 1 ? '' : 's'} currently listed in catalog` : 'List at least one service or product', done: activeListings > 0 },
    { title: 'Set up payments', sub: 'Connect a payout method', done: true },
    { title: 'Respond to messages', sub: 'Keep your response rate high', done: true },
  ];
  const healthDoneCount = healthChecks.filter((check) => check.done).length;
  const healthPercent = Math.round((healthDoneCount / healthChecks.length) * 100);
  const healthTagline = healthPercent === 100 ? 'All set' : healthPercent >= 75 ? 'Ready to scale' : healthPercent >= 50 ? 'Almost there' : 'Let\'s get started';

  const exportSummary = () => {
    const rows = [
      ['Metric', 'Value'],
      ['This month (illustrative)', `Rs ${THIS_MONTH_TOTAL}`],
      ['Available balance', `Rs ${availableBalance}`],
      ['Services active', activeServices],
      ['Products active', activeProducts],
      ['Products low stock', lowStockProducts],
      ['Bookings pending', newBookings],
      ['Orders open', openOrders],
      [`Earnings (${earningsPeriod}) gross`, `Rs ${earningsTotal}`],
      ['Platform fee (10%)', `Rs ${platformFee}`],
      ['Net take-home', `Rs ${netTakeHome}`],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `store-dashboard-summary-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const recentActivity = [
    ...bookings.slice(-3).reverse().map((b) => ({
      type: 'booking', icon: Calendar, iconBg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500',
      customer: b.customer || 'Customer', detail: b.service,
      status: b.status, amount: b.amount,
      time: b.date ? `${bookingDate(b.date)}${b.time ? ` · ${bookingTime(b.time)}` : ''}` : '',
    })),
    ...orders.slice(-3).reverse().map((o) => ({
      type: 'order', icon: ShoppingBag, iconBg: 'bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e]',
      customer: o.customer || 'Customer', detail: `Order ${o.id} · ${o.qty} item${o.qty === 1 ? '' : 's'}`,
      status: o.status, amount: o.amount,
      time: o.date,
    })),
  ].slice(0, 5);

  return (
    <div className="max-w-[1280px] ml-auto px-4 md:px-8 pt-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Store</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 dark:bg-pink-900/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#fa3f5e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fa3f5e]" /> Live status
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Welcome back{firstName ? `, ${firstName}` : ''}! Here's what's happening across your products &amp; bookings today.
          </p>
        </div>
        <button
          type="button"
          onClick={exportSummary}
          className="flex items-center gap-1.5 rounded-full border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
        >
          <Download size={14} /> Quick Export
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <StatCard label="This month" value={`₹${THIS_MONTH_TOTAL.toLocaleString()}`} sparkline />
        <StatCard label="Available balance" value={`₹${availableBalance.toLocaleString()}`} />
        <StatCard to="/market/my-store/services" icon={Briefcase} accent="bg-teal-50 dark:bg-teal-900/20 text-teal-600" label="Services" value={activeServices} sub={`Active${bookedToday ? ` · ${bookedToday} booked today` : ''}`} />
        <StatCard to="/market/my-store/products" icon={Package} accent="bg-purple-50 dark:bg-purple-900/20 text-purple-600" label="Products" value={activeProducts} sub={`Active${lowStockProducts ? ` · ${lowStockProducts} low stock` : ''}`} />
        <StatCard to="/market/my-store/bookings" icon={Calendar} accent="bg-blue-50 dark:bg-blue-900/20 text-blue-600" label="Bookings" value={newBookings} sub={newBookings ? 'Pending · Action req.' : 'Pending'} />
        <StatCard to="/market/my-store/orders" icon={ShoppingBag} accent="bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e]" label="Orders" value={openOrders} sub={openOrders ? 'Open · Fulfillment queue' : 'Open'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Left column */}
        <div className="space-y-5 min-w-0">
          {/* Earnings overview */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Earnings overview</h2>
              <Dropdown className="w-40" value={earningsPeriod} onChange={setEarningsPeriod} options={PERIOD_OPTIONS} />
            </div>
            <p className="text-2xl font-bold text-[#fa3f5e] mb-3">
              ₹{earningsTotal.toLocaleString()} <span className="text-xs font-medium text-gray-400">{earningsPeriod}</span>
            </p>
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Gross Volume</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">₹{earningsTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Platform Fee (10%)</p>
                <p className="text-sm font-bold text-red-500 mt-0.5">-₹{platformFee.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Net Take-home</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{netTakeHome.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-56 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fa3f5e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#fa3f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                  <XAxis dataKey="label" interval={PERIOD_CONFIG[earningsPeriod].xInterval} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(v) => [`₹${v}`, 'Earnings']} contentStyle={{ borderRadius: 10, border: '1px solid #f3f4f6', fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="#fa3f5e" strokeWidth={2.5} fill="url(#earningsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">Recent activity</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Merged live feed of bookings &amp; product orders</p>
              </div>
              <Link to="/market/my-store/orders" className="flex items-center gap-1 text-xs font-bold text-[#fa3f5e] hover:opacity-80 transition-opacity shrink-0">
                View all <ChevronRight size={13} />
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-gray-400 dark:text-gray-500">No recent activity yet.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentActivity.map((a, i) => (
                  <Link
                    key={i}
                    to={a.type === 'booking' ? '/market/my-store/bookings' : '/market/my-store/orders'}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.iconBg}`}>
                      <a.icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {a.customer} <span className="text-gray-400 dark:text-gray-500 font-normal">· {a.detail}</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{a.time}</p>
                    </div>
                    {a.status && (a.type === 'booking' ? <BookingBadge status={a.status} /> : <StatusBadge status={a.status} />)}
                    {a.amount != null && <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0 w-20 text-right">{money(a.amount)}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick actions */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              Quick actions <Pin size={12} className="text-[#fa3f5e] rotate-45" />
            </h2>
            <div className="space-y-2.5">
              <Link
                to="/market/add-service"
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-insta-purple to-insta-pink p-4 text-white shadow-md hover:opacity-95 transition-opacity"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Sparkles size={18} />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-bold text-sm">+ Add Service <ArrowRight size={13} /></p>
                  <p className="text-xs text-white/80 mt-0.5">Offer 1-on-1 calls, consulting, shoots</p>
                </div>
              </Link>
              <Link
                to="/market/add-product"
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#9f1239] to-[#fa3f5e] p-4 text-white shadow-md hover:opacity-95 transition-opacity"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <ShoppingBag size={18} />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-bold text-sm">+ Add Product <ArrowRight size={13} /></p>
                  <p className="text-xs text-white/80 mt-0.5">Physical goods, apparel &amp; merch</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Store health */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0">
                  <svg viewBox="0 0 40 40" className="h-12 w-12 -rotate-90">
                    <circle cx="20" cy="20" r="17" fill="none" strokeWidth="4" className="stroke-gray-100 dark:stroke-gray-800" />
                    <circle
                      cx="20" cy="20" r="17" fill="none" strokeWidth="4" stroke="#fa3f5e" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 17}
                      strokeDashoffset={2 * Math.PI * 17 * (1 - healthPercent / 100)}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-900 dark:text-white">{healthPercent}%</span>
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white text-sm">Store health</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{healthTagline}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-pink-50 dark:bg-pink-900/20 px-2.5 py-1 text-[10px] font-bold text-[#fa3f5e]">
                {healthDoneCount} of {healthChecks.length} done
              </span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {healthChecks.map((check) => <HealthItem key={check.title} {...check} />)}
            </div>
          </div>

          {/* Subscription / free trial status — real trial countdown, active
              confirmation, or payment-failed warning; renders nothing otherwise. */}
          <StoreSubscriptionCard />
        </div>
      </div>
    </div>
  );
};

export default StoreDashboard;
