import React, { useState } from 'react';
import { MOCK_ORDERS, ORDER_STATUSES } from '../data/mockOrders';

const STATUS_STYLE = {
  Pending:    'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  Processing: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  Shipped:    'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  Delivered:  'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  Cancelled:  'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
};

const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.Pending}`}>
    {status}
  </span>
);

const StoreOrders = () => {
  const [filter, setFilter] = useState('All');

  const orders = filter === 'All' ? MOCK_ORDERS : MOCK_ORDERS.filter((o) => o.status === filter);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Orders</h1>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
        Mock only — showing placeholder orders, not wired to a real checkout/payments flow yet.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {['All', ...ORDER_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filter === s
                ? 'bg-[#fa3f5e] text-white border-[#fa3f5e]'
                : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Qty</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{o.id}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{o.customer}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[220px] truncate">{o.product}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{o.qty}</td>
                <td className="px-4 py-3 font-semibold text-[#fa3f5e]">${o.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{o.date}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                  No orders in this status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StoreOrders;
