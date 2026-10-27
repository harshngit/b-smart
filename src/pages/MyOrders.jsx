import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Briefcase, Calendar, ClipboardList, Download, Loader2, Package, RefreshCw, Search, ShoppingBag, Wallet, XCircle } from 'lucide-react';
import { money } from '../myStore/data/orderFilters';
import orderService from '../services/orderService';
import serviceBookingService from '../services/serviceBookingService';
import { fetchWallet } from '../store/walletSlice';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';
const canCancel = (status) => ['New', 'Pending', 'Confirmed', 'Processing'].includes(status);
const ACTIVE_STATUSES = ['New', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'In Progress'];
const orderTotal = ({ type, record }) => (type === 'product' ? Number(record.amount || 0) - Number(record.coinsDiscount || 0) : Number(record.amount || 0));
const orderLabel = ({ type, record }) => (type === 'product' ? (record.items || []).map((item) => item.name).join(', ') : record.service);

export default function MyOrders() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.userObject);
  const productOrders = useSelector((state) => state.orders.items);
  const bookings = useSelector((state) => state.bookings.items);
  const [apiOrders, setApiOrders] = useState([]);
  const [apiBookings, setApiBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateRange, setDateRange] = useState('All time');
  const buyerId = user?._id || user?.id;
  const belongsToBuyer = (record) => buyerId && record.buyerId && String(record.buyerId) === String(buyerId);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const [orders, liveBookings] = await Promise.all([
        orderService.listBuyer(),
        serviceBookingService.listBuyer(),
      ]);
      setApiOrders(orders);
      setApiBookings(liveBookings);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load live orders. Showing local orders where available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const cancelOrder = async (orderId) => {
    setCancellingId(orderId);
    setError('');
    try {
      const updated = await orderService.cancel(orderId);
      setApiOrders((current) => current.map((order) => order.id === orderId ? updated : order));
      dispatch(fetchWallet());
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not cancel this order.');
    } finally {
      setCancellingId('');
    }
  };

  const cancelBooking = async (bookingId) => {
    setCancellingId(bookingId);
    setError('');
    try {
      const updated = await serviceBookingService.cancel(bookingId);
      setApiBookings((current) => current.map((booking) => booking.id === bookingId ? updated : booking));
      dispatch(fetchWallet());
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not cancel this booking.');
    } finally {
      setCancellingId('');
    }
  };

  const liveProductOrders = apiOrders.map((order) => ({ type: 'product', date: order.createdAt || order.date, record: order }));
  const fallbackProductOrders = productOrders.filter(belongsToBuyer).map((order) => ({ type: 'product', date: order.createdAt || order.date, record: order }));
  const liveServiceOrders = apiBookings.map((booking) => ({ type: 'service', date: booking.requestedAt || booking.date, record: booking }));
  const fallbackServiceOrders = bookings.filter(belongsToBuyer).map((booking) => ({ type: 'service', date: booking.requestedAt, record: booking }));
  const orders = [
    ...(apiOrders.length ? liveProductOrders : fallbackProductOrders),
    ...(apiBookings.length ? liveServiceOrders : fallbackServiceOrders),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const productCount = orders.filter((order) => order.type === 'product').length;
  const serviceCount = orders.filter((order) => order.type === 'service').length;
  const activeCount = orders.filter((order) => ACTIVE_STATUSES.includes(order.record.status)).length;
  const totalSpent = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  const statusOptions = ['All statuses', ...new Set(orders.map((order) => order.record.status).filter(Boolean))];
  const query = search.trim().toLowerCase();
  const dateRangeDays = { 'Last 7 days': 7, 'Last 30 days': 30, 'Last 90 days': 90 }[dateRange];
  const filteredOrders = orders.filter((order) => {
    const matchesQuery = !query || String(order.record.id).toLowerCase().includes(query) || orderLabel(order).toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'All statuses' || order.record.status === statusFilter;
    const matchesType = typeFilter === 'All' || order.type === typeFilter;
    const matchesDate = !dateRangeDays || (Date.now() - new Date(order.date).getTime()) <= dateRangeDays * 24 * 60 * 60 * 1000;
    return matchesQuery && matchesStatus && matchesType && matchesDate;
  });

  const exportCsv = () => {
    const rows = [
      ['Order ID', 'Type', 'Item(s)', 'Status', 'Date', 'Total'],
      ...filteredOrders.map((order) => [order.record.id, order.type, orderLabel(order), order.record.status, formatDate(order.date), orderTotal(order).toFixed(2)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 max-w-[1300px] mx-auto px-4 pt-6">
      {/* Hero */}
      <section className="relative mb-6 overflow-hidden rounded-[28px] bg-gradient-to-r from-pink-50 via-purple-50/70 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#9f1239] dark:text-[#fb7185]">
              <ClipboardList size={13} /> Buyer Center
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">My Orders &amp; Purchases</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Track, manage, and review every product order and service booking you've made on the Marketplace.</p>
            <button type="button" onClick={fetchOrders} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#9f1239] dark:text-[#fb7185]"><RefreshCw size={13} />Refresh</button>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5 rounded-2xl bg-white dark:bg-gray-900 shadow-sm px-4 py-3">
              <span className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-[#9f1239] dark:text-[#fb7185] flex items-center justify-center shrink-0"><ShoppingBag size={17} /></span>
              <div><p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{orders.length} Total</p><p className="text-[11px] text-gray-500 dark:text-gray-400">Purchases made</p></div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-white dark:bg-gray-900 shadow-sm px-4 py-3">
              <span className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-insta-purple flex items-center justify-center shrink-0"><Briefcase size={17} /></span>
              <div><p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{activeCount} Active</p><p className="text-[11px] text-gray-500 dark:text-gray-400">Bookings &amp; orders</p></div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-white dark:bg-gray-900 shadow-sm px-4 py-3">
              <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shrink-0"><Wallet size={17} /></span>
              <div><p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{money(totalSpent)}</p><p className="text-[11px] text-gray-500 dark:text-gray-400">Total spent</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            aria-label="Search orders"
            placeholder="Search order ID, product, or service..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#fa3f5e] focus:bg-white dark:focus:bg-gray-900"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-11 rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none focus:border-[#fa3f5e]"
        >
          {statusOptions.map((status) => <option key={status} value={status}>{status === 'All statuses' ? 'Status: All Records' : status}</option>)}
        </select>
        <div className="relative">
          <Calendar size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            aria-label="Filter by date range"
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            className="h-11 rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 pl-9 pr-4 text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none focus:border-[#fa3f5e]"
          >
            {['All time', 'Last 7 days', 'Last 30 days', 'Last 90 days'].map((range) => <option key={range} value={range}>{range}</option>)}
          </select>
        </div>
        <button type="button" onClick={exportCsv} className="flex h-11 items-center gap-1.5 rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          { key: 'All', label: 'All Orders', count: orders.length },
          { key: 'product', label: 'Products', count: productCount, icon: ShoppingBag },
          { key: 'service', label: 'Services', count: serviceCount, icon: Briefcase },
        ].map(({ key, label, count, icon: TabIcon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTypeFilter(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              typeFilter === key ? 'bg-[#9f1239] text-white' : 'bg-indigo-50/60 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800'
            }`}
          >
            {TabIcon && <TabIcon size={14} />} {label} ({count})
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-gray-500 mb-4"><Loader2 size={16} className="animate-spin" />Loading orders...</div>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-16 text-center shadow-sm">
          <Package size={36} className="mx-auto text-[#fa3f5e] mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{orders.length === 0 ? "You haven't placed any orders yet." : 'No orders match your search or filters.'}</p>
          <Link to="/market" className="inline-block mt-5 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange">Browse Marketplace</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(({ type, date, record }) => (
            <article key={`${type}-${record.id}`} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{type === 'service' ? 'Service booking' : 'Product order'} - {formatDate(date)}</p>
                  {type === 'product' ? (
                    <Link to={`/market/my-orders/${record.id}`} className="mt-1 block text-sm font-bold text-gray-900 hover:text-[#fa3f5e] dark:text-white break-all">Order #{record.id}</Link>
                  ) : (
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white mt-1 break-all">Order #{record.id}</h2>
                  )}
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e]">{record.status}</span>
              </div>
              <div className="px-4 sm:px-5 divide-y divide-gray-100 dark:divide-gray-800">
                {type === 'product' ? record.items.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex flex-wrap items-center gap-3 py-4">
                    <span className="w-10 h-10 shrink-0 rounded-lg bg-pink-50 dark:bg-gray-800 text-[#fa3f5e] flex items-center justify-center"><Package size={20} /></span>
                    <div className="min-w-0 flex-1"><Link to={`/market/product/${item.productId}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-[#fa3f5e] break-words">{item.name}</Link><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Qty: {item.quantity}</p></div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{money(item.unitPrice * item.quantity)}</span>
                  </div>
                )) : (
                  <div className="flex flex-wrap items-center gap-3 py-4">
                    <span className="w-10 h-10 shrink-0 rounded-lg bg-pink-50 dark:bg-gray-800 text-[#fa3f5e] flex items-center justify-center"><Briefcase size={20} /></span>
                    <div className="min-w-0 flex-1"><Link to={`/market/service/${record.serviceId}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-[#fa3f5e] break-words">{record.service}</Link><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Scheduled for {formatDate(record.date)}{record.time ? ` - ${record.time}` : ''}</p></div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{money(record.amount)}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
                {type === 'product' && canCancel(record.status) && <button type="button" disabled={cancellingId === record.id} onClick={() => cancelOrder(record.id)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 disabled:opacity-50"><XCircle size={14} />{cancellingId === record.id ? 'Cancelling...' : 'Cancel order'}</button>}
                {type === 'service' && canCancel(record.status) && <button type="button" disabled={cancellingId === record.id} onClick={() => cancelBooking(record.id)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 disabled:opacity-50"><XCircle size={14} />{cancellingId === record.id ? 'Cancelling...' : 'Cancel booking'}</button>}
                {type === 'product' && <Link to={`/market/my-orders/${record.id}`} className="text-xs font-semibold text-[#fa3f5e]">View details</Link>}
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <strong className="text-[#fa3f5e]">{money(type === 'product' ? record.amount - (record.coinsDiscount || 0) : record.amount)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
