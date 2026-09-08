import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Package, ClipboardList, IndianRupee, TrendingUp, ArrowRight } from 'lucide-react';
import { MOCK_ORDERS } from '../data/mockOrders';

const STATUS_STYLE = {
  Pending:    'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  Processing: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  Shipped:    'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  Delivered:  'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  Cancelled:  'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
};

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
      <Icon size={19} />
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
  </div>
);

const StoreDashboard = () => {
  const products = useSelector((state) => state.products.items);

  const activeProducts = products.filter((p) => (p.status || (p.rating > 0 ? 'Active' : 'Draft')) === 'Active').length;
  const totalRevenue = MOCK_ORDERS.filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.amount, 0);
  const pendingOrders = MOCK_ORDERS.filter((o) => o.status === 'Pending' || o.status === 'Processing').length;
  const recentOrders = [...MOCK_ORDERS].slice(-5).reverse();

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Store Dashboard</h1>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
        Mock only — an overview placeholder for your store, not wired to real sales data yet.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Total Products" value={products.length} accent="bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e]" />
        <StatCard icon={TrendingUp} label="Active Listings" value={activeProducts} accent="bg-green-50 dark:bg-green-900/20 text-green-600" />
        <StatCard icon={ClipboardList} label="Pending Orders" value={pendingOrders} accent="bg-amber-50 dark:bg-amber-900/20 text-amber-600" />
        <StatCard icon={IndianRupee} label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} accent="bg-blue-50 dark:bg-blue-900/20 text-blue-600" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">Recent Orders</h2>
          <Link to="/market/my-store/orders" className="flex items-center gap-1 text-sm font-semibold text-[#fa3f5e] hover:opacity-80 transition-opacity">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {recentOrders.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{o.id} · {o.customer}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{o.product}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">${o.amount.toFixed(2)}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[o.status]}`}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoreDashboard;
