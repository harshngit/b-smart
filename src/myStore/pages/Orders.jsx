import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, CalendarDays, X, Loader2, RefreshCw, Download, Printer, PackageCheck, TrendingUp, Receipt, XCircle } from 'lucide-react';
import { Dropdown, inputCls } from '../../components/productForm/ProductFormFields';
import OrderDetails from '../components/OrderDetails';
import { OrderProductImage, PaymentBadge, StatusBadge } from '../components/OrderUI';
import { filterOrders, ORDER_TABS, money, orderDate } from '../data/orderFilters';
import orderService from '../../services/orderService';
import influencerProductService from '../../services/influencerProductService';
import RowActionsMenu from '../components/RowActionsMenu';
import socketService from '../../services/socketService';

const PAGE_SIZE = 6;
const BASE = '/market/my-store/orders';

const Bar = ({ className = '' }) => <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`} />;

const OrderRowSkeleton = () => (
  <tr>
    <td className="pl-4 py-5"><Bar className="w-4 h-4 rounded" /></td>
    <td className="px-3 py-5"><div className="flex items-center gap-2.5"><Bar className="w-9 h-9 rounded-full flex-shrink-0" /><div className="min-w-[100px] space-y-2"><Bar className="h-3 w-20" /><Bar className="h-3 w-16" /></div></div></td>
    <td className="px-3 py-5"><Bar className="h-3 w-14 mb-2" /><div className="flex gap-1"><Bar className="w-9 h-9 rounded" /><Bar className="w-9 h-9 rounded" /></div></td>
    <td className="px-3 py-5"><Bar className="h-4 w-12" /></td>
    <td className="px-3 py-5"><Bar className="h-5 w-14 rounded-full" /></td>
    <td className="px-3 py-5"><Bar className="h-5 w-14 rounded-full" /></td>
    <td className="px-3 py-5"><Bar className="h-3 w-16 mb-2" /><Bar className="h-2.5 w-10" /></td>
    <td className="px-4 py-5 text-right"><Bar className="h-7 w-7 rounded-lg ml-auto" /></td>
  </tr>
);

export default function StoreOrders() {
  const fallbackOrders = useSelector((state) => state.orders.items);
  const products = useSelector((state) => state.products.items);
  const [apiOrders, setApiOrders] = useState([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const { orderId } = useParams();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const selectAllRef = useRef(null);
  const tab = ORDER_TABS.includes(params.get('tab')) ? params.get('tab') : 'New';
  const search = params.get('search') || '';
  const payment = params.get('payment') || 'All status';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const oldest = params.get('sort') === 'oldest';
  const setFilter = (key, value) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
    setPage(1);
    setSelected([]);
  };
  const orders = apiLoaded ? apiOrders : fallbackOrders;
  const filtered = filterOrders(orders, { tab, search, payment, from, to, oldest });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleOrders = filtered.slice(start, start + PAGE_SIZE);
  const allSelected = visibleOrders.length > 0 && visibleOrders.every((order) => selected.includes(order.id));
  const someSelected = visibleOrders.some((order) => selected.includes(order.id));
  const suffix = params.size ? `?${params.toString()}` : '';
  const closeTo = BASE + suffix;
  const activeOrder = orders.find((order) => order.id === orderId);
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  // Real catalog lookup (package weight/dimensions) for the order-detail panel —
  // not snapshotted onto orders, so it has to be looked up by product id.
  const [productCatalog, setProductCatalog] = useState({});
  useEffect(() => {
    influencerProductService.listMine()
      .then((list) => setProductCatalog(Object.fromEntries(list.map((item) => [String(item.id), item]))))
      .catch(() => {});
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const readyToShip = orders.filter((order) => ['Confirmed', 'Processing'].includes(order.status)).length;
  const todaysVolume = orders.filter((order) => order.date === today).reduce((sum, order) => sum + order.amount, 0);
  const avgOrderValue = orders.length ? orders.reduce((sum, order) => sum + order.amount, 0) / orders.length : 0;
  const cancelledCount = orders.filter((order) => order.status === 'Cancelled').length;

  const toCsv = (rows) => rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportOrdersCsv = (list) => {
    const rows = [
      ['Order', 'Customer', 'Items', 'Total', 'Status', 'Payment', 'Date'],
      ...list.map((order) => [order.orderNumber || order.id, order.customer, order.items.map((item) => item.name).join('; '), order.amount.toFixed(2), order.status, order.paymentStatus, order.date]),
    ];
    downloadBlob(toCsv(rows), `orders-${today}.csv`, 'text/csv;charset=utf-8;');
  };
  const printPackingSlips = (list) => {
    const lines = list.flatMap((order) => [
      `Order ${order.orderNumber || order.id}`,
      `Customer: ${order.customer}`,
      `Ship to: ${[order.address?.street, order.address?.city, order.address?.region, order.address?.postalCode].filter(Boolean).join(', ')}`,
      order.courier ? `Courier: ${order.courier}` : null,
      order.trackingNumber ? `Tracking: ${order.trackingNumber}` : null,
      'Items:',
      ...order.items.map((item) => `  - ${item.name} x${item.quantity}`),
      `Total: ${money(order.amount)}`,
      '----------------------------------------',
    ].filter((line) => line !== null));
    downloadBlob(lines.join('\n'), `packing-slips-${today}.txt`, 'text/plain;charset=utf-8;');
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      setApiOrders(await orderService.listSeller());
      setApiLoaded(true);
    } catch (err) {
      setApiLoaded(false);
      setError(err?.response?.data?.message || 'Could not load live seller orders. Showing local orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    if (orderId) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !apiLoaded) return;
    let alive = true;
    orderService.get(orderId)
      .then((fresh) => {
        if (!alive) return;
        setApiOrders((current) => current.some((order) => order.id === fresh.id)
          ? current.map((order) => order.id === fresh.id ? fresh : order)
          : [fresh, ...current]);
      })
      .catch((err) => {
        if (alive) setError(err?.response?.data?.message || 'Could not load order details.');
      });
    return () => { alive = false; };
  }, [orderId, apiLoaded]);

  // Live updates — another tab/device (or the customer's own view) changing this
  // order's status pushes here instantly via the backend's order-status-updated event.
  useEffect(() => {
    if (!apiLoaded) return;
    const handleLiveUpdate = (payload) => {
      const id = payload?.order_id;
      if (!id) return;
      // Pull the authoritative full order rather than trusting the partial socket payload.
      orderService.get(id)
        .then((fresh) => {
          setApiOrders((current) => current.map((order) => (String(order.id) === String(id) ? fresh : order)));
        })
        .catch(() => {});
    };
    socketService.on('order-status-updated', handleLiveUpdate);
    return () => socketService.off('order-status-updated', handleLiveUpdate);
  }, [apiLoaded]);

  const updateOrderStatus = async (id, status, extra = {}) => {
    setUpdatingId(id);
    setError('');
    try {
      const updated = await orderService.updateStatus(id, status, extra);
      setApiOrders((current) => current.map((order) => order.id === id ? updated : order));
      setApiLoaded(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update order status.');
    } finally {
      setUpdatingId('');
    }
  };

  // Local-only draft edits (courier / tracking number / notify toggle) before a
  // status-change button actually persists them to the server.
  const updateOrderFulfillmentLocal = (id, changes) => {
    setApiOrders((current) => current.map((order) => (order.id === id ? { ...order, ...changes } : order)));
  };

  if (orderId) {
    return (
      <div className="max-w-[1280px] ml-auto px-4 md:px-8 pb-10">
        <div className="mb-5 pt-6">
          <Link to={closeTo} className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-xs font-bold text-[#d90445] transition hover:text-[#fa3f5e]">
            <ChevronLeft size={14} />
            Back to Orders
          </Link>
        </div>
        {loading && !activeOrder && <div className="mb-4 flex items-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" />Loading order details...</div>}
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
        <OrderDetails
          key={orderId}
          order={activeOrder}
          allOrders={orders}
          productCatalog={productCatalog}
          closeTo={closeTo}
          onStatusChange={updateOrderStatus}
          onFulfillmentChange={updateOrderFulfillmentLocal}
          updating={updatingId === orderId}
          apiEnabled={apiLoaded}
          onPrintSlip={() => printPackingSlips([activeOrder])}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] ml-auto px-4 md:px-8 pt-6 pb-10">
      <div>
        <section className="min-w-0" aria-label="Orders">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage fulfillment, shipping, and customer orders for your store.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={fetchOrders} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fa3f5e]"><RefreshCw size={13} />Refresh</button>
              <button type="button" onClick={() => exportOrdersCsv(filtered)} className="flex items-center gap-1.5 rounded-full border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                <Download size={14} /> Export Orders (CSV)
              </button>
              <button type="button" onClick={() => printPackingSlips(filtered)} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity">
                <Printer size={14} /> Print Packing Slips
              </button>
            </div>
          </div>
          {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">{error}</p>}

          {/* Stat cards — all computed from the live seller order list */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
              <div className="flex items-center gap-2 mb-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600"><PackageCheck size={15} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Ready to ship</p></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{readyToShip}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
              <div className="flex items-center gap-2 mb-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e]"><TrendingUp size={15} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Today's volume</p></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{money(todaysVolume)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
              <div className="flex items-center gap-2 mb-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-900/20 text-purple-600"><Receipt size={15} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Avg. order value</p></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{money(avgOrderValue)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
              <div className="flex items-center gap-2 mb-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-red-50 dark:bg-red-900/20 text-red-500"><XCircle size={15} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Cancelled</p></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{cancelledCount}</p>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-800 mb-5">
            {ORDER_TABS.map((value) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setFilter('tab', value)} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${tab === value ? 'border-[#fa3f5e] text-[#fa3f5e]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}>{value}</button>)}
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[170px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input aria-label="Search orders" value={search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Search by order #, customer name..." className={`${inputCls} pl-9 pr-8`} />
              {search && <button type="button" aria-label="Clear search" onClick={() => setFilter('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
            </div>
            <Dropdown className="w-36" value={payment} options={['All status', 'Paid', 'Unpaid', 'Refunded']} onChange={(value) => setFilter('payment', value)} />
            <details className="relative">
              <summary className="list-none cursor-pointer flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400"><CalendarDays size={15} />{from || to ? `${from || 'Start'} – ${to || 'End'}` : 'All dates'}</summary>
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 p-4 w-64 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl space-y-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400">From<input type="date" aria-label="Orders from date" value={from} max={to || undefined} onChange={(event) => setFilter('from', event.target.value)} className={`${inputCls} mt-1`} /></label>
                <label className="block text-xs text-gray-500 dark:text-gray-400">To<input type="date" aria-label="Orders to date" value={to} min={from || undefined} onChange={(event) => setFilter('to', event.target.value)} className={`${inputCls} mt-1`} /></label>
                {from && to && from > to && <p role="alert" className="text-xs text-red-500">The end date must be after the start date.</p>}
                <button type="button" onClick={() => { setParams((current) => { const next = new URLSearchParams(current); next.delete('from'); next.delete('to'); return next; }, { replace: true }); setPage(1); setSelected([]); }} className="text-xs font-semibold text-[#fa3f5e]">Clear dates</button>
              </div>
            </details>
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-3 rounded-xl bg-pink-50 dark:bg-pink-900/10 px-4 py-2.5">
              <p className="text-xs font-semibold text-[#fa3f5e]" role="status">{selected.length} order{selected.length === 1 ? '' : 's'} selected</p>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={() => exportOrdersCsv(orders.filter((order) => selected.includes(order.id)))} className="flex items-center gap-1.5 rounded-full border border-[#fa3f5e]/30 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-[#fa3f5e]"><Download size={12} /> Export selected</button>
                <button type="button" onClick={() => printPackingSlips(orders.filter((order) => selected.includes(order.id)))} className="flex items-center gap-1.5 rounded-full border border-[#fa3f5e]/30 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-[#fa3f5e]"><Printer size={12} /> Print slips</button>
                <button type="button" onClick={() => setSelected([])} className="text-xs font-semibold text-gray-500 dark:text-gray-400 underline">Clear</button>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-xs">
                <thead><tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-left">
                  <th className="pl-4 py-3.5 w-9"><input ref={(node) => { selectAllRef.current = node; if (node) node.indeterminate = someSelected && !allSelected; }} type="checkbox" aria-label="Select all visible orders" checked={allSelected} disabled={!visibleOrders.length} onChange={() => setSelected((current) => allSelected ? current.filter((id) => !visibleOrders.some((order) => order.id === id)) : [...new Set([...current, ...visibleOrders.map((order) => order.id)])])} className="accent-[#fa3f5e] rounded" /></th>
                  <th className="px-3 py-3.5 font-medium">Order</th><th className="px-3 py-3.5 font-medium">Items</th><th className="px-3 py-3.5 font-medium">Total</th><th className="px-3 py-3.5 font-medium">Status</th><th className="px-3 py-3.5 font-medium">Payment</th>
                  <th className="px-3 py-3.5 font-medium" aria-sort={oldest ? 'ascending' : 'descending'}><button type="button" onClick={() => setFilter('sort', oldest ? '' : 'oldest')} className="flex items-center gap-1.5">Date{oldest ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</button></th>
                  <th className="px-4 py-3.5 font-medium text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading && Array.from({ length: PAGE_SIZE }, (_, i) => <OrderRowSkeleton key={i} />)}
                  {!loading && visibleOrders.map((order) => <tr key={order.id} className={orderId === order.id || selected.includes(order.id) ? 'bg-pink-50/60 dark:bg-pink-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}>
                    <td className="pl-4 py-5"><input type="checkbox" aria-label={`Select ${order.id}`} checked={selected.includes(order.id)} onChange={() => toggle(order.id)} className="accent-[#fa3f5e] rounded" /></td>
                    <td className="px-3 py-5"><div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-full bg-gradient-to-br from-insta-purple/15 to-insta-pink/15 text-[#fa3f5e] flex items-center justify-center flex-shrink-0 text-xs font-bold">{String(order.customer || 'C').split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div className="min-w-[100px]"><Link to={`${BASE}/${order.id}${suffix}`} className="font-semibold text-[#fa3f5e]">#{order.orderNumber || order.id}</Link><p className="text-gray-600 dark:text-gray-300 mt-1">{order.customer}</p>{order.address?.city && <p className="text-gray-400 dark:text-gray-500 text-[11px] mt-0.5">{[order.address.city, order.address.region].filter(Boolean).join(', ')}</p>}{order.status === 'Cancelled' && <p className="text-red-500 mt-1">Cancelled</p>}</div></div></td>
                    <td className="px-3 py-5"><p className="text-gray-500 dark:text-gray-400 mb-2">{order.items.reduce((sum, item) => sum + item.quantity, 0)} item{order.qty === 1 ? '' : 's'}</p><div className="flex gap-1">{order.items.slice(0, 3).map((item) => <OrderProductImage key={item.productId} item={item} products={products} className="w-9 h-9" />)}</div></td>
                    <td className="px-3 py-5 font-semibold text-gray-800 dark:text-gray-200">{money(order.amount)}</td>
                    <td className="px-3 py-5"><StatusBadge status={order.status} /></td>
                    <td className="px-3 py-5"><PaymentBadge status={order.paymentStatus} /></td>
                    <td className="px-3 py-5 text-gray-600 dark:text-gray-300 whitespace-nowrap">{orderDate(order.date)}<p className="text-[10px] text-gray-400 mt-1">{order.time}</p></td>
                    <td className="px-4 py-5 text-right">
                      <RowActionsMenu ariaLabel={`Actions for order ${order.id}`} menuClassName="w-40">
                        {(close) => (
                          <Link role="menuitem" to={`${BASE}/${order.id}${suffix}`} onClick={close} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-[#fa3f5e] dark:text-gray-300 dark:hover:bg-gray-800">
                            View order
                          </Link>
                        )}
                      </RowActionsMenu>
                    </td>
                  </tr>)}
                  {!loading && !visibleOrders.length && <tr><td colSpan={8} className="py-14 text-center text-gray-400">No orders match this view.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[11px] text-gray-400">Showing {filtered.length ? start + 1 : 0}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} orders</p>
              <div className="flex items-center gap-2"><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="p-1 text-gray-400 disabled:opacity-30"><ChevronLeft size={15} /></button><span className="border border-[#fa3f5e]/40 text-[#fa3f5e] px-2 py-1 rounded text-xs">{currentPage}</span><button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="p-1 text-gray-400 disabled:opacity-30"><ChevronRight size={15} /></button></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
