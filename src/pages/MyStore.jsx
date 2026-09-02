import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, ArrowLeft, Star, Pencil, Trash2 } from 'lucide-react';
import { CATEGORY_STYLE } from './Market';
import { deleteProduct } from '../store/productsSlice';

const STATUS_STYLE = {
  Active:         'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  Draft:          'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  'Out of Stock': 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
};

const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.Draft}`}>
    {status}
  </span>
);

const MyStore = () => {
  const products = useSelector((state) => state.products.items);
  const dispatch = useDispatch();

  const handleDelete = (id, name) => {
    if (window.confirm(`Remove "${name}" from your store?`)) {
      dispatch(deleteProduct(id));
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 max-w-[1100px] mx-auto px-4 pt-6">
      <Link to="/market" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#fa3f5e] mb-3">
        <ArrowLeft size={14} /> Back to Marketplace
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Store</h1>
        <Link
          to="/market/add-product"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange"
        >
          <Plus size={16} /> Add Product
        </Link>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
        Mock only — showing all products as a placeholder for your store, not filtered by vendor yet.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 font-semibold">Views</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {products.map((p) => {
              const style = CATEGORY_STYLE[p.category];
              const Icon = style?.icon;
              const status = p.status || (p.rating > 0 ? 'Active' : 'Draft');
              return (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${style?.bg}`}>
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                          : Icon && <Icon size={20} className={`${style.text} opacity-70`} />}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/market/product/${p.id}`} className="font-medium text-gray-900 dark:text-white hover:text-[#fa3f5e] transition-colors truncate block">
                          {p.name}
                        </Link>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{p.category} · {p.vendor}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {p.rating > 0 ? (
                      <span className="flex items-center gap-1">
                        <Star size={13} className="fill-amber-400 text-amber-400" /> {p.rating} <span className="text-gray-400">({p.reviews})</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">No reviews yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.views ?? 0}</td>
                  <td className="px-4 py-3 font-semibold text-[#fa3f5e]">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/market/edit-product/${p.id}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyStore;
