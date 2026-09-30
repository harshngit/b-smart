import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { CATEGORY_STYLE } from '../../data/marketplaceCategoryStyle';
import { Dropdown } from '../../components/productForm/ProductFormFields';
import influencerProductService from '../../services/influencerProductService';
import RowActionsMenu from '../components/RowActionsMenu';

const TABS = [
  { key: 'Active',       label: 'Active' },
  { key: 'Draft',        label: 'Drafts' },
  { key: 'Out of Stock', label: 'Out of stock' },
];

const getStatus = (p) => p.status || (p.rating > 0 ? 'Active' : 'Draft');
const getStockState = (p) => {
  if (getStatus(p) === 'Out of Stock') return 'Out of stock';
  if (typeof p.stockQuantity === 'number' && p.stockQuantity <= 5) return 'Low stock';
  return 'In stock';
};

const StockCell = ({ product }) => {
  const state = getStockState(product);
  if (state === 'Low stock') return <span className="text-amber-500 font-semibold">● Low stock</span>;
  if (state === 'Out of stock') return <span className="text-red-500 font-semibold">● Out of stock</span>;
  return (
    <span className="text-gray-600 dark:text-gray-300">
      {typeof product.stockQuantity === 'number' ? `${product.stockQuantity} in stock` : '—'}
    </span>
  );
};

const ProductThumb = ({ product, style, Icon }) => {
  const [failed, setFailed] = useState(false);
  const src = product.images?.[0];
  if (!src || failed) {
    return Icon ? <Icon size={24} className={`${style?.text} opacity-70`} /> : null;
  }
  return <img src={src} alt="" onError={() => setFailed(true)} className="w-full h-full object-cover" />;
};

const VisibilityCell = ({ product }) => {
  const visible = getStatus(product) !== 'Draft';
  return (
    <span className={`flex items-center gap-1.5 font-medium ${visible ? 'text-green-600' : 'text-gray-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${visible ? 'bg-green-500' : 'bg-gray-400'}`} />
      {visible ? 'Visible' : 'Hidden'}
    </span>
  );
};

const PAGE_SIZE = 4;

const StoreProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Active');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [stockFilter, setStockFilter] = useState('All stock');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    influencerProductService.listMine()
      .then((items) => {
        if (!alive) return;
        setProducts(items);
        setError('');
      })
      .catch((err) => {
        if (alive) setError(err?.response?.data?.message || 'Could not load your products.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Remove "${name}" from your store?`)) {
      try {
        await influencerProductService.remove(id);
        setProducts((items) => items.filter((item) => String(item.id) !== String(id)));
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not delete this product.');
      }
    }
  };

  const filteredProducts = useMemo(() => products.filter((p) => {
    if (getStatus(p) !== activeTab) return false;
    if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (categoryFilter !== 'All categories' && p.category !== categoryFilter) return false;
    if (stockFilter !== 'All stock' && getStockState(p) !== stockFilter) return false;
    return true;
  }), [products, activeTab, search, categoryFilter, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedProducts = filteredProducts.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="max-w-[1280px] ml-auto px-4 md:px-8 pt-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Products</h1>
        <Link
          to="/market/add-product"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange"
        >
          <Plus size={16} /> Add Product
        </Link>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
        Manage products from your influencer catalog.
      </p>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-5 border-b border-gray-200 dark:border-gray-800 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#fa3f5e] text-gray-900 dark:text-white'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#fa3f5e]/20 focus:border-[#fa3f5e] dark:text-white"
          />
        </div>
        <Dropdown
          className="w-44 flex-shrink-0"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={['All categories', ...Object.keys(CATEGORY_STYLE)]}
        />
        <Dropdown
          className="w-40 flex-shrink-0"
          value={stockFilter}
          onChange={setStockFilter}
          options={['All stock', 'In stock', 'Low stock', 'Out of stock']}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-y-3 text-sm [&_tbody_tr>td:nth-child(2)]:border-y [&_tbody_tr>td:nth-child(2)]:border-gray-100 [&_tbody_tr>td:nth-child(2)]:bg-white [&_tbody_tr>td:nth-child(2)]:px-4 [&_tbody_tr>td:nth-child(2)]:py-3 [&_tbody_tr>td:nth-child(2)]:align-middle [&_tbody_tr>td:nth-child(2)]:text-sm [&_tbody_tr>td:nth-child(2)]:font-semibold [&_tbody_tr>td:nth-child(2)]:text-gray-800 dark:[&_tbody_tr>td:nth-child(2)]:border-gray-800 dark:[&_tbody_tr>td:nth-child(2)]:bg-gray-900 dark:[&_tbody_tr>td:nth-child(2)]:text-gray-200">
          <colgroup>
            <col className="w-[48%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[16%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500">
              <th className="px-5 py-3.5 font-medium">Product</th>
              <th className="px-5 py-3.5 font-medium">Price</th>
              <th className="px-5 py-3.5 font-medium">Stock</th>
              <th className="px-5 py-3.5 font-medium">Visibility</th>
              <th className="px-5 py-3.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">
                  <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading products...</span>
                </td>
              </tr>
            )}
            {!loading && pagedProducts.map((p) => {
              const style = CATEGORY_STYLE[p.category];
              const Icon = style?.icon;
              return (
                <tr key={p.id}>
                  <td className="rounded-l-xl border-y border-l border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${style?.bg || 'bg-gray-50 dark:bg-gray-800'}`}>
                        <ProductThumb product={p} style={style} Icon={Icon} />
                      </div>
                      <div className="min-w-0 flex-1 py-1">
                        <span className={`mb-1 inline-flex rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide dark:bg-gray-800 ${style?.text || 'text-[#fa3f5e]'}`}>
                          {p.category || 'Product'}
                        </span>
                        <Link to={`/market/product/${p.id}?from=products`} title={p.name} className="block whitespace-normal break-words text-[15px] font-bold leading-snug text-gray-900 transition-colors hover:text-[#fa3f5e] dark:text-white">
                          {p.name || 'Untitled product'}
                        </Link>
                        <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">{p.brand || p.sellerSku || 'Influencer product'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-gray-300">₹{p.price.toFixed(2)}</td>
                  <td className="border-y border-gray-100 bg-white px-4 py-3 align-middle dark:border-gray-800 dark:bg-gray-900"><StockCell product={p} /></td>
                  <td className="border-y border-gray-100 bg-white px-4 py-3 align-middle dark:border-gray-800 dark:bg-gray-900"><VisibilityCell product={p} /></td>
                  <td className="rounded-r-xl border-y border-r border-gray-100 bg-white px-4 py-3 text-right align-middle dark:border-gray-800 dark:bg-gray-900">
                    <RowActionsMenu ariaLabel={`Actions for ${p.name}`} menuClassName="w-36">
                      {(close) => (
                        <>
                          <Link
                            role="menuitem"
                            to={`/market/product/${p.id}?from=products`}
                            onClick={close}
                            className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            <Eye size={13} /> View
                          </Link>
                          <Link
                            role="menuitem"
                            to={`/market/edit-product/${p.id}`}
                            onClick={close}
                            className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            <Pencil size={13} /> Edit
                          </Link>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { close(); handleDelete(p.id, p.name); }}
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </>
                      )}
                    </RowActionsMenu>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">
                  No products match this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Showing {filteredProducts.length ? pageStart + 1 : 0}–{Math.min(pageStart + PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length} products
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                  n === currentPage
                    ? 'bg-[#fa3f5e] text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreProducts;
