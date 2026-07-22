import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Loader2, AlertCircle, Gift, Coins,
  CheckCircle2, Clock, XCircle, RefreshCw, PackageSearch,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: '',           label: 'All'        },
  { key: 'pending',    label: 'Pending'    },
  { key: 'processing', label: 'Processing' },
  { key: 'completed',  label: 'Completed'  },
  { key: 'cancelled',  label: 'Cancelled'  },
];

const STATUS_STYLE = {
  pending:    { label: 'Pending',    color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-500/10',   border: 'border-amber-200 dark:border-amber-500/20',   Icon: Clock        },
  processing: { label: 'Processing', color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-500/10',     border: 'border-blue-200 dark:border-blue-500/20',     Icon: RefreshCw    },
  completed:  { label: 'Completed',  color: 'text-green-500',   bg: 'bg-green-50 dark:bg-green-500/10',   border: 'border-green-200 dark:border-green-500/20',   Icon: CheckCircle2 },
  cancelled:  { label: 'Cancelled',  color: 'text-red-400',     bg: 'bg-red-50 dark:bg-red-500/10',       border: 'border-red-200 dark:border-red-500/20',       Icon: XCircle      },
};

const getStatus = (status) =>
  STATUS_STYLE[status?.toLowerCase()] || {
    label: status || 'Unknown', color: 'text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', Icon: Clock,
  };

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ' · ' + new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Order card ───────────────────────────────────────────────────────────────
const OrderCard = ({ order, onCancel, onDelete, isCancelLoading, isDeleteLoading }) => {
  const st = getStatus(order.status);
  const StatusIcon = st.Icon;

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/[0.07] shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-500/30 transition-all group">
      {/* Image */}
      <div className="w-full bg-gray-950 flex-shrink-0 overflow-hidden relative" style={{ height: 130 }}>
        {order.media?.url ? (
          <img
            src={order.media.url}
            alt={order.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gift size={32} className="text-orange-400/60" />
          </div>
        )}
        
        {/* Status badge overlay */}
        <span className={`absolute top-3 right-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border ${st.color} ${st.bg} ${st.border} backdrop-blur-md`}>
          <StatusIcon size={10} />
          {st.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {order.vendor && (
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-wider">{order.vendor}</span>
        )}
        <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
          {order.title || 'Gift Card'}
        </p>

        <div className="flex items-center gap-1">
          <Coins size={11} className="text-orange-400 flex-shrink-0" />
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            From <span className="font-bold text-orange-500">{Number(order.bcoins || 0).toLocaleString('en-IN')}</span> bCoins
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-auto pt-2.5">
          {order.status?.toLowerCase() === 'pending' && (
            <button
              onClick={() => onCancel(order)}
              disabled={isCancelLoading}
              className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-500 text-xs font-bold transition-all hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelLoading ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
              Cancel Order
            </button>
          )}
          
          {order.status?.toLowerCase() === 'cancelled' && (
            <button
              onClick={() => onDelete(order)}
              disabled={isDeleteLoading}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold transition-all hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleteLoading ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
              Delete
            </button>
          )}
          
          {order.status?.toLowerCase() === 'completed' && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
              {formatDate(order.createdAt || order.created_at)}
            </p>
          )}
          
          {order.status?.toLowerCase() === 'processing' && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
              {formatDate(order.createdAt || order.created_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/[0.07] animate-pulse">
        <div className="w-full bg-gray-200 dark:bg-white/10" style={{ height: 130 }} />
        <div className="p-3 space-y-2 flex-1">
          <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded w-1/4" />
          <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
          <div className="h-2.5 bg-gray-100 dark:bg-white/[0.06] rounded w-1/2" />
          <div className="mt-auto pt-2.5 h-8 bg-gray-200 dark:bg-white/10 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GiftCardOrders() {
  const navigate = useNavigate();

  const [status,  setStatus]  = useState('');
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (status) params.status = status;
      const res = await api.get('/gift-card-orders/my', { params });
      const raw = res.data?.data || res.data?.orders || res.data || [];
      setOrders(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [status]);
  
  const handleCancel = useCallback(async (order) => {
    setIsCancelLoading(true);
    try {
      await api.patch(`/gift-card-orders/${order._id}`, { status: 'cancelled' });
      fetchOrders();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setIsCancelLoading(false);
    }
  }, [fetchOrders]);
  
  const handleDelete = useCallback(async (order) => {
    setIsDeleteLoading(true);
    try {
      await api.delete(`/gift-card-orders/${order._id}`);
      fetchOrders();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete order.');
    } finally {
      setIsDeleteLoading(false);
    }
  }, [fetchOrders]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] lg:max-w-[1100px]  lg:mx-auto w-[85%]  pb-28">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.06] px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} className="text-gray-700 dark:text-white" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Gift size={16} className="text-orange-400 flex-shrink-0" />
            <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">My Redemptions</h1>
          </div>
          <button
            onClick={fetchOrders}
            className={`w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Status filter chips */}
        <div className="relative -mx-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 px-4 scrollbar-hide snap-x">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatus(tab.key)}
                className={`flex-shrink-0 snap-start px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  status === tab.key
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-white/[0.07] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.07]'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="flex-shrink-0 w-2" />
          </div>
          <div className="absolute right-0 top-0 bottom-1 w-8 pointer-events-none bg-gradient-to-l from-white dark:from-[#0a0a0a] to-transparent" />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-4">
        {loading ? (
          <Skeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm text-red-500 text-center">{error}</p>
            <button onClick={fetchOrders} className="text-xs text-orange-500 font-semibold underline">Retry</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <PackageSearch size={28} className="text-orange-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-900 dark:text-white">No redemptions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                {status ? `No ${status} orders found` : 'Redeem a gift card to see your orders here'}
              </p>
            </div>
            <button
              onClick={() => navigate('/gift-cards')}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors shadow-sm shadow-orange-500/20"
            >
              Browse Gift Cards
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              {orders.length} order{orders.length !== 1 ? 's' : ''}
              {status ? ` · ${status}` : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((order, i) => (
                <OrderCard
                  key={order._id || i}
                  order={order}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                  isCancelLoading={isCancelLoading}
                  isDeleteLoading={isDeleteLoading}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
