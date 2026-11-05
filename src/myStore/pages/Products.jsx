import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, Plus, Minus, Search, Pencil, Trash2, Eye, CheckCircle2, Archive, PackageX, Download, Package, Boxes, AlertTriangle, Trophy } from 'lucide-react';
import { CATEGORY_STYLE } from '../../data/marketplaceCategoryStyle';
import { Dropdown } from '../../components/productForm/ProductFormFields';
import influencerProductService from '../../services/influencerProductService';
import orderService from '../../services/orderService';
import { money } from '../data/orderFilters';
import RowActionsMenu from '../components/RowActionsMenu';
import CatalogRowSkeleton from '../components/CatalogRowSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';

const TABS = [
  { key: 'Active',       label: 'Active' },
  { key: 'Draft',        label: 'Drafts' },
  { key: 'Out of Stock', label: 'Out of stock' },
  { key: 'All',          label: 'All Products' },
];

const STATUS_ACTIONS = [
  { status: 'active',        label: 'Mark Active',        Icon: CheckCircle2, tabLabel: 'Active' },
  { status: 'draft',         label: 'Mark as Draft',       Icon: Archive,      tabLabel: 'Draft' },
  { status: 'out_of_stock',  label: 'Mark Out of Stock',   Icon: PackageX,     tabLabel: 'Out of Stock' },
];

const SORT_OPTIONS = ['Most recent', 'Price: high to low', 'Price: low to high', 'Name: A to Z'];

const getStatus = (p) => p.status || (p.rating > 0 ? 'Active' : 'Draft');
const getStockState = (p) => {
  if (getStatus(p) === 'Out of Stock') return 'Out of stock';
  if (typeof p.stockQuantity === 'number' && p.stockQuantity <= 5) return 'Low stock';
  return 'In stock';
};

const StockCell = ({ product, pending, onAdjust }) => {
  const state = getStockState(product);
  const qty = typeof product.stockQuantity === 'number' ? product.stockQuantity : 0;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onAdjust(product, -1)}
        disabled={pending || qty <= 0}
        aria-label={`Decrease stock for ${product.name}`}
        className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
      >
        <Minus size={12} />
      </button>
      {state === 'Low stock' ? (
        <span className="text-amber-500 font-semibold text-xs whitespace-nowrap">● {qty} left</span>
      ) : state === 'Out of stock' ? (
        <span className="text-red-500 font-semibold text-xs whitespace-nowrap">● Out of stock</span>
      ) : (
        <span className="text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">
          {typeof product.stockQuantity === 'number' ? `${product.stockQuantity} in stock` : '—'}
        </span>
      )}
      <button
        type="button"
        onClick={() => onAdjust(product, 1)}
        disabled={pending}
        aria-label={`Increase stock for ${product.name}`}
        className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
      </button>
    </div>
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

const PRODUCT_STATUS_STYLE = {
  Active: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  Draft: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  'Out of Stock': 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

const ProductStatusBadge = ({ product }) => {
  const status = getStatus(product);
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${PRODUCT_STATUS_STYLE[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{status}</span>;
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

const PAGE_SIZE = 7;

const StoreProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Active');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [stockFilter, setStockFilter] = useState('All stock');
  const [sortBy, setSortBy] = useState('Most recent');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);

  // Real per-product sales (units sold + revenue), aggregated from the
  // seller's own orders — used only for the "Top seller" stat card.
  const [productSales, setProductSales] = useState({});

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
    orderService.listSeller()
      .then((orders) => {
        if (!alive) return;
        const sales = {};
        orders.forEach((order) => {
          if (order.status === 'Cancelled') return;
          order.items.forEach((item) => {
            const key = String(item.productId);
            if (!sales[key]) sales[key] = { units: 0, revenue: 0 };
            sales[key].units += item.quantity;
            sales[key].revenue += item.unitPrice * item.quantity;
          });
        });
        setProductSales(sales);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await influencerProductService.remove(deleteTarget.id);
      setProducts((items) => items.filter((item) => String(item.id) !== String(deleteTarget.id)));
      setDeleteTarget(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not delete this product.');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await influencerProductService.update(id, { status });
      setProducts((items) => items.map((item) => (String(item.id) === String(id) ? updated : item)));
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update product status.');
    }
  };

  const [pendingStockId, setPendingStockId] = useState(null);

  const handleAdjustStock = async (product, delta) => {
    const current = product.stockQuantity || 0;
    const newQuantity = Math.max(0, current + delta);
    if (newQuantity === current) return;
    setPendingStockId(product.id);
    setError('');
    try {
      const payload = { stock_quantity: newQuantity };
      // Restocking brings it back into sellable state if it was marked Out of Stock.
      if (newQuantity > 0 && getStatus(product) === 'Out of Stock') payload.status = 'active';
      const updated = await influencerProductService.update(product.id, payload);
      setProducts((items) => items.map((item) => (String(item.id) === String(product.id) ? updated : item)));
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update stock.');
    } finally {
      setPendingStockId(null);
    }
  };

  // ── Real, store-wide stats (not filtered by the active tab) ───────────────
  const activeCount = products.filter((p) => getStatus(p) === 'Active').length;
  const draftCount = products.filter((p) => getStatus(p) === 'Draft').length;
  const outOfStockCount = products.filter((p) => getStatus(p) === 'Out of Stock').length;
  const sellableProducts = products.filter((p) => getStatus(p) !== 'Draft');
  const inventoryValue = sellableProducts.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.stockQuantity) || 0), 0);
  const inStockPercent = sellableProducts.length ? Math.round((sellableProducts.filter((p) => (p.stockQuantity || 0) > 0).length / sellableProducts.length) * 100) : 0;
  const lowStockProducts = products.filter((p) => getStockState(p) === 'Low stock');
  const topSeller = Object.entries(productSales).sort((a, b) => b[1].revenue - a[1].revenue)[0];
  const topSellerProduct = topSeller ? products.find((p) => String(p.id) === topSeller[0]) : null;

  const exportCatalog = (list = products) => {
    const rows = [
      ['Product', 'SKU', 'Category', 'Price', 'MRP', 'Stock', 'Status'],
      ...list.map((p) => [p.name, p.sku || '', p.category || '', p.price.toFixed(2), (p.mrp || p.price).toFixed(2), p.stockQuantity ?? '', getStatus(p)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      if (activeTab !== 'All' && getStatus(p) !== activeTab) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (categoryFilter !== 'All categories' && p.category !== categoryFilter) return false;
      if (stockFilter !== 'All stock' && getStockState(p) !== stockFilter) return false;
      return true;
    });
    const sorted = [...list];
    if (sortBy === 'Price: high to low') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'Price: low to high') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'Name: A to Z') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [products, activeTab, search, categoryFilter, stockFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedProducts = filteredProducts.slice(pageStart, pageStart + PAGE_SIZE);
  const allPageSelected = pagedProducts.length > 0 && pagedProducts.every((p) => selected.includes(p.id));
  const toggleSelected = (id) => setSelected((current) => current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);

  const viewLowStock = () => {
    setActiveTab('All');
    setStockFilter('Low stock');
    setCategoryFilter('All categories');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="max-w-[1280px] ml-auto px-4 md:px-8 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
            <span className="rounded-full bg-pink-50 dark:bg-pink-900/20 px-2.5 py-1 text-[10px] font-bold text-[#fa3f5e]">{activeCount} Active Listings</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Manage your product catalog, pricing, and inventory.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={exportCatalog} className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3.5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
            <Download size={14} /> Export Catalog
          </button>
          <Link
            to="/market/add-product"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange"
          >
            <Plus size={16} /> Add Product
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </div>
      )}

      {/* Stat cards — all computed from the live catalog / real orders */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-900/20 text-purple-600"><Package size={14} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Total listed products</p></div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{products.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{activeCount} Active · {draftCount} Draft · {outOfStockCount} Out</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600"><Boxes size={14} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Inventory value</p></div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{money(inventoryValue)}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">{inStockPercent}% catalog in-stock</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-900/20 text-amber-600"><AlertTriangle size={14} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Low stock alerts</p></div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{lowStockProducts.length}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">{lowStockProducts.length > 0 ? 'Action needed' : 'All good'}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-rose-50 dark:bg-rose-900/20 text-[#fa3f5e]"><Trophy size={14} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Top seller</p></div>
          {topSellerProduct ? (
            <>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{topSellerProduct.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{money(topSeller[1].revenue)} · {topSeller[1].units} sold</p>
            </>
          ) : <p className="text-sm text-gray-400 mt-1">No sales yet</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-5 border-b border-gray-200 dark:border-gray-800 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by product name, SKU..."
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#fa3f5e]/20 focus:border-[#fa3f5e] dark:text-white"
          />
        </div>
        <Dropdown
          className="w-44 flex-shrink-0"
          value={categoryFilter}
          onChange={(value) => { setCategoryFilter(value); setPage(1); }}
          options={['All categories', ...Object.keys(CATEGORY_STYLE)]}
        />
        <Dropdown
          className="w-40 flex-shrink-0"
          value={stockFilter}
          onChange={(value) => { setStockFilter(value); setPage(1); }}
          options={['All stock', 'In stock', 'Low stock', 'Out of stock']}
        />
        <Dropdown
          className="w-48 flex-shrink-0"
          value={sortBy}
          onChange={(value) => { setSortBy(value); setPage(1); }}
          options={SORT_OPTIONS}
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3 rounded-xl bg-pink-50 dark:bg-pink-900/10 px-4 py-2.5">
          <p className="text-xs font-semibold text-[#fa3f5e]">{selected.length} product{selected.length === 1 ? '' : 's'} selected</p>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={() => exportCatalog(products.filter((p) => selected.includes(p.id)))} className="flex items-center gap-1.5 rounded-full border border-[#fa3f5e]/30 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-[#fa3f5e]"><Download size={12} /> Export selected</button>
            <button type="button" onClick={() => setSelected([])} className="text-xs font-semibold text-gray-500 dark:text-gray-400 underline">Clear</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-y-3 text-sm [&_tbody_tr>td:nth-child(3)]:border-y [&_tbody_tr>td:nth-child(3)]:border-gray-100 [&_tbody_tr>td:nth-child(3)]:bg-white [&_tbody_tr>td:nth-child(3)]:px-4 [&_tbody_tr>td:nth-child(3)]:py-3 [&_tbody_tr>td:nth-child(3)]:align-middle [&_tbody_tr>td:nth-child(3)]:text-sm [&_tbody_tr>td:nth-child(3)]:font-semibold [&_tbody_tr>td:nth-child(3)]:text-gray-800 dark:[&_tbody_tr>td:nth-child(3)]:border-gray-800 dark:[&_tbody_tr>td:nth-child(3)]:bg-gray-900 dark:[&_tbody_tr>td:nth-child(3)]:text-gray-200">
          <colgroup>
            <col className="w-[3%]" />
            <col className="w-[37%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500">
              <th className="px-3 py-3.5"><input type="checkbox" aria-label="Select all products on this page" checked={allPageSelected} onChange={() => setSelected((current) => allPageSelected ? current.filter((id) => !pagedProducts.some((p) => p.id === id)) : [...new Set([...current, ...pagedProducts.map((p) => p.id)])])} className="accent-[#fa3f5e] rounded" disabled={!pagedProducts.length} /></th>
              <th className="px-5 py-3.5 font-medium">Product</th>
              <th className="px-5 py-3.5 font-medium">Price</th>
              <th className="px-5 py-3.5 font-medium">Stock</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 font-medium">Visibility</th>
              <th className="px-5 py-3.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: PAGE_SIZE }, (_, i) => <CatalogRowSkeleton key={i} showStatus />)}
            {!loading && pagedProducts.map((p) => {
              const style = CATEGORY_STYLE[p.category];
              const Icon = style?.icon;
              const hasDiscount = p.mrp > p.price;
              const discountPercent = hasDiscount ? Math.round((1 - p.price / p.mrp) * 100) : 0;
              return (
                <tr key={p.id}>
                  <td className="px-3 py-3 align-middle"><input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.includes(p.id)} onChange={() => toggleSelected(p.id)} className="accent-[#fa3f5e] rounded" /></td>
                  <td className="rounded-l-xl border-y border-l border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${style?.bg || 'bg-gray-50 dark:bg-gray-800'}`}>
                        <ProductThumb product={p} style={style} Icon={Icon} />
                      </div>
                      <div className="min-w-0 flex-1 py-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`inline-flex rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide dark:bg-gray-800 ${style?.text || 'text-[#fa3f5e]'}`}>
                            {p.category || 'Product'}
                          </span>
                          {p.variants?.length > 0 && <span className="text-[10px] text-gray-400">· {p.variants.length} variant{p.variants.length === 1 ? '' : 's'}</span>}
                        </div>
                        <Link to={`/market/product/${p.id}?from=products`} title={p.name} className="block whitespace-normal break-words text-[15px] font-bold leading-snug text-gray-900 transition-colors hover:text-[#fa3f5e] dark:text-white">
                          {p.name || 'Untitled product'}
                        </Link>
                        <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">{p.brand || 'Influencer product'}{p.sku ? ` · SKU ${p.sku}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                    <p className="font-semibold text-gray-900 dark:text-white">₹{p.price.toFixed(2)}</p>
                    {hasDiscount && <p className="text-[11px] text-gray-400"><span className="line-through">₹{p.mrp.toFixed(2)}</span> <span className="text-emerald-600 font-semibold">-{discountPercent}%</span></p>}
                  </td>
                  <td className="border-y border-gray-100 bg-white px-4 py-3 align-middle dark:border-gray-800 dark:bg-gray-900"><StockCell product={p} pending={pendingStockId === p.id} onAdjust={handleAdjustStock} /></td>
                  <td className="border-y border-gray-100 bg-white px-4 py-3 align-middle dark:border-gray-800 dark:bg-gray-900"><ProductStatusBadge product={p} /></td>
                  <td className="border-y border-gray-100 bg-white px-4 py-3 align-middle dark:border-gray-800 dark:bg-gray-900"><VisibilityCell product={p} /></td>
                  <td className="rounded-r-xl border-y border-r border-gray-100 bg-white px-4 py-3 text-right align-middle dark:border-gray-800 dark:bg-gray-900">
                    <RowActionsMenu ariaLabel={`Actions for ${p.name}`} menuClassName="w-48">
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
                          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                          {STATUS_ACTIONS.filter((action) => action.tabLabel !== getStatus(p)).map(({ status, label, Icon }) => (
                            <button
                              key={status}
                              type="button"
                              role="menuitem"
                              onClick={() => { close(); handleStatusChange(p.id, status); }}
                              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              <Icon size={13} /> {label}
                            </button>
                          ))}
                          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { close(); setDeleteTarget(p); }}
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
                <td colSpan={7} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">
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

      {lowStockProducts.length > 0 && (
        <div className="mt-5 mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-900/10 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600"><AlertTriangle size={16} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Restock advisory <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">{lowStockProducts.length} Low Stock Item{lowStockProducts.length === 1 ? '' : 's'}</span></p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {lowStockProducts.length} item{lowStockProducts.length === 1 ? '' : 's'} at 5 units or fewer: {lowStockProducts.slice(0, 3).map((p) => p.name).join(', ')}{lowStockProducts.length > 3 ? `, +${lowStockProducts.length - 3} more` : ''}.
            </p>
          </div>
          <button type="button" onClick={viewLowStock} className="shrink-0 flex items-center gap-1.5 rounded-full bg-[#fa3f5e] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity">
            View low stock items
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove this product?"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed from your store. This can't be undone.` : ''}
        confirmLabel={deleting ? 'Removing...' : 'Remove'}
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default StoreProducts;
