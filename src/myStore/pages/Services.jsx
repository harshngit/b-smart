import ServiceIcon from '../components/ServiceIcon';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, Plus, Search, Pencil, Calendar, Trash2, Eye, EyeOff, Download, Briefcase, CalendarCheck, Receipt, Trophy, Star, Video, MapPin } from 'lucide-react';
import { Dropdown } from '../../components/productForm/ProductFormFields';
import { SERVICE_CATEGORIES, servicePrice } from '../data/serviceFields';
import influencerServiceService from '../../services/influencerServiceService';
import serviceBookingService from '../../services/serviceBookingService';
import { money } from '../data/orderFilters';
import RowActionsMenu from '../components/RowActionsMenu';
import CatalogRowSkeleton from '../components/CatalogRowSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 7;
const TABS = ['Published', 'Draft', 'All'];
const TAB_LABEL = { Published: 'Published', Draft: 'Drafts', All: 'All Services' };
const SORT_OPTIONS = ['Most booked', 'Price: high to low', 'Price: low to high', 'Name: A to Z'];
const DURATION_MINUTES = { '30 minutes': 30, '1 hour': 60, '2 hours': 120, '2–3 hours': 150, 'Half day': 240, 'Full day': 480 };
const METHOD_LABEL = { Online: 'Online', 'At customer location': 'At customer', 'At my location': 'At my location' };

export default function StoreServices() {
  const location = useLocation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(location.state?.serviceTab === 'Draft' ? 'Draft' : 'Published');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All status');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [sortBy, setSortBy] = useState('Most booked');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);

  // Real completed-booking revenue per service, for the "Premier performer"
  // stat and a real fulfillment rate — not fabricated numbers.
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    let alive = true;
    influencerServiceService.listMine()
      .then((items) => {
        if (!alive) return;
        setServices(items);
        setError('');
      })
      .catch((err) => {
        if (alive) setError(err?.response?.data?.message || 'Could not load your services.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    serviceBookingService.listSeller().then((items) => { if (alive) setBookings(items); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const patchService = async (id, changes) => {
    try {
      const updated = await influencerServiceService.update(id, changes);
      setServices((items) => items.map((item) => String(item.id) === String(id) ? { ...item, ...updated } : item));
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update this service.');
    }
  };

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteService = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await influencerServiceService.remove(deleteTarget.id);
      setServices((items) => items.filter((item) => String(item.id) !== String(deleteTarget.id)));
      setDeleteTarget(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not delete this service.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Real, store-wide stats (not filtered by the active tab) ───────────────
  const publishedServices = services.filter((s) => s.status === 'Published');
  const draftCount = services.filter((s) => s.status === 'Draft').length;
  const totalBookings = services.reduce((sum, s) => sum + (Number(s.bookings) || 0), 0);
  const completedBookings = bookings.filter((b) => b.status === 'Completed');
  const endedBookings = bookings.filter((b) => ['Completed', 'Cancelled', 'Declined'].includes(b.status));
  const fulfillmentRate = endedBookings.length ? Math.round((completedBookings.length / endedBookings.length) * 1000) / 10 : null;
  const avgTicketValue = publishedServices.length ? publishedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0) / publishedServices.length : 0;
  const durationsWithMinutes = publishedServices.map((s) => DURATION_MINUTES[s.duration]).filter(Boolean);
  const avgDurationMinutes = durationsWithMinutes.length ? Math.round(durationsWithMinutes.reduce((a, b) => a + b, 0) / durationsWithMinutes.length) : null;
  const revenueByService = completedBookings.reduce((map, b) => {
    const key = String(b.serviceId);
    map[key] = (map[key] || { revenue: 0, sessions: 0 });
    map[key].revenue += Number(b.amount) || 0;
    map[key].sessions += 1;
    return map;
  }, {});
  const topEntry = Object.entries(revenueByService).sort((a, b) => b[1].revenue - a[1].revenue)[0];
  const topService = topEntry ? services.find((s) => String(s.id) === topEntry[0]) : null;

  const exportCsv = (list = services) => {
    const rows = [
      ['Service', 'Category', 'Price', 'Rate type', 'Bookings', 'Status', 'Visibility'],
      ...list.map((s) => [s.name, s.category || '', s.price, s.rateType || '', s.bookings, s.status, s.status === 'Published' && s.visible ? 'Visible' : 'Hidden']),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `services-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const list = services.filter((service) => {
      const visible = service.status === 'Published' && service.visible;
      if (tab !== 'All' && service.status !== tab) return false;
      if (!service.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (status !== 'All status' && (status === 'Visible' ? !visible : visible)) return false;
      if (categoryFilter !== 'All categories' && service.category !== categoryFilter) return false;
      return true;
    });
    const sorted = [...list];
    if (sortBy === 'Most booked') sorted.sort((a, b) => (b.bookings || 0) - (a.bookings || 0));
    else if (sortBy === 'Price: high to low') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'Price: low to high') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'Name: A to Z') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [services, tab, search, status, categoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const allPageSelected = pageItems.length > 0 && pageItems.every((s) => selected.includes(s.id));

  return (
    <div className="max-w-[1280px] ml-auto px-4 md:px-8 pt-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Manage your bookable services, pricing, and availability.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => exportCsv()} className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3.5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
            <Download size={14} /> Export
          </button>
          <Link to="/market/add-service" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange transition-colors"><Plus size={16} /> Add Service</Link>
        </div>
      </div>
      {error && <div className="mt-4 mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"><AlertCircle size={15} className="shrink-0" /> {error}</div>}

      {/* Stat cards — all computed from the live service catalog / real bookings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-teal-50 dark:bg-teal-900/20 text-teal-600"><Briefcase size={14} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Published catalog</p></div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{publishedServices.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{publishedServices.length} Published · {draftCount} Draft</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600"><CalendarCheck size={14} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Total bookings</p></div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalBookings}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">{fulfillmentRate != null ? `${fulfillmentRate}% fulfillment rate` : 'No completed sessions yet'}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-900/20 text-purple-600"><Receipt size={14} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Avg. ticket value</p></div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{money(avgTicketValue)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{avgDurationMinutes != null ? `Avg duration ~${avgDurationMinutes} mins` : 'Avg duration —'}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-rose-50 dark:bg-rose-900/20 text-[#fa3f5e]"><Trophy size={14} /></span><p className="text-xs text-gray-500 dark:text-gray-400 truncate">Premier performer</p></div>
          {topService ? (
            <>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{topService.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{money(topEntry[1].revenue)} · {topEntry[1].sessions} session{topEntry[1].sessions === 1 ? '' : 's'}</p>
            </>
          ) : <p className="text-sm text-gray-400 mt-1">No completed sessions yet</p>}
        </div>
      </div>

      <div className="flex gap-5 border-b border-gray-200 dark:border-gray-800 mb-4">
        {TABS.map((value) => <button type="button" key={value} onClick={() => { setTab(value); setPage(1); }} aria-pressed={tab === value} className={`pb-2.5 px-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === value ? 'border-[#fa3f5e] text-gray-900 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>{TAB_LABEL[value]} ({value === 'All' ? services.length : services.filter((s) => s.status === value).length})</button>)}
      </div>
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input aria-label="Search services" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by service title, keyword" className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#fa3f5e]/20 focus:border-[#fa3f5e] dark:text-white" />
        </div>
        <Dropdown className="w-44" value={categoryFilter} options={['All categories', ...SERVICE_CATEGORIES]} onChange={(value) => { setCategoryFilter(value); setPage(1); }} />
        <Dropdown className="w-36" value={status} options={['All status', 'Visible', 'Hidden']} onChange={(value) => { setStatus(value); setPage(1); }} />
        <Dropdown className="w-44" value={sortBy} options={SORT_OPTIONS} onChange={(value) => { setSortBy(value); setPage(1); }} />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3 rounded-xl bg-pink-50 dark:bg-pink-900/10 px-4 py-2.5">
          <p className="text-xs font-semibold text-[#fa3f5e]">{selected.length} service{selected.length === 1 ? '' : 's'} selected</p>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={() => exportCsv(services.filter((s) => selected.includes(s.id)))} className="flex items-center gap-1.5 rounded-full border border-[#fa3f5e]/30 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-[#fa3f5e]"><Download size={12} /> Export selected</button>
            <button type="button" onClick={() => setSelected([])} className="text-xs font-semibold text-gray-500 dark:text-gray-400 underline">Clear</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-y-3 text-sm">
          <colgroup>
            <col className="w-[3%]" />
            <col className="w-[40%]" />
            <col className="w-[15%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead><tr className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500">
            <th className="px-3 py-3.5"><input type="checkbox" aria-label="Select all services on this page" checked={allPageSelected} disabled={!pageItems.length} onChange={() => setSelected((current) => allPageSelected ? current.filter((id) => !pageItems.some((s) => s.id === id)) : [...new Set([...current, ...pageItems.map((s) => s.id)])])} className="accent-[#fa3f5e] rounded" /></th>
            {['Service & format', 'Pricing model', 'Bookings & rating', 'Visibility', 'Actions'].map((heading) => <th key={heading} className={`px-5 py-3.5 font-medium ${heading === 'Actions' ? 'text-right' : ''}`}>{heading}</th>)}
          </tr></thead>
          <tbody>
            {loading && Array.from({ length: PAGE_SIZE }, (_, i) => <CatalogRowSkeleton key={i} />)}
            {!loading && pageItems.map((service) => {
              const visible = service.status === 'Published' && service.visible;
              return <tr key={service.id}>
                <td className="px-3 py-3 align-middle"><input type="checkbox" aria-label={`Select ${service.name}`} checked={selected.includes(service.id)} onChange={() => setSelected((current) => current.includes(service.id) ? current.filter((v) => v !== service.id) : [...current, service.id])} className="accent-[#fa3f5e] rounded" /></td>
                <td className="rounded-l-xl border-y border-l border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"><div className="flex items-start gap-3.5">
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
                    {service.images?.[0] ? <img src={service.images[0]} alt="" className="w-full h-full object-cover" /> : <ServiceIcon size={28} className="text-[#fa3f5e]" />}
                  </div>
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="inline-flex rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#fa3f5e] dark:bg-pink-900/20">
                        {service.category || 'Service'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                        {service.method === 'Online' ? <Video size={10} /> : <MapPin size={10} />} {METHOD_LABEL[service.method] || service.method} · {service.duration}
                      </span>
                    </div>
                    <Link to={`/market/service/${service.id}?from=services`} className="block whitespace-normal break-words text-[15px] font-bold leading-snug text-gray-900 transition-colors hover:text-[#fa3f5e] dark:text-white">{service.name || 'Untitled service'}</Link>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400 dark:text-gray-500">{service.shortDescription || service.description || service.provider || 'Influencer service'}</p>
                  </div>
                </div></td>
                <td className="border-y border-gray-100 bg-white px-4 py-3 align-middle dark:border-gray-800 dark:bg-gray-900">
                  <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">{servicePrice(service)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{service.rateType}</p>
                </td>
                <td className="border-y border-gray-100 bg-white px-4 py-3 align-middle dark:border-gray-800 dark:bg-gray-900">
                  <p className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-semibold"><Calendar size={12} className="text-gray-400" />{service.bookings} booked</p>
                  <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5"><Star size={11} className="fill-amber-400 text-amber-400" />{service.rating > 0 ? service.rating : 'New'}{service.reviews > 0 && ` (${service.reviews})`}</p>
                </td>
                <td className="border-y border-gray-100 bg-white px-4 py-3 align-middle dark:border-gray-800 dark:bg-gray-900"><button type="button" disabled={service.status === 'Draft'} aria-label={`${visible ? 'Hide' : 'Show'} ${service.name}`} onClick={() => patchService(service.id, { visible_to_customers: !service.visible })} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${visible ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}><span className={`w-1.5 h-1.5 rounded-full ${visible ? 'bg-green-500' : 'bg-gray-400'}`} />{visible ? 'Visible' : 'Hidden'}</button></td>
                <td className="rounded-r-xl border-y border-r border-gray-100 bg-white px-4 py-3 text-right align-middle dark:border-gray-800 dark:bg-gray-900">
                  <RowActionsMenu ariaLabel={`Actions for ${service.name}`}>
                    {(close) => (
                      <>
                        <Link role="menuitem" to={`/market/service/${service.id}?from=services`} onClick={close} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-[#fa3f5e] dark:text-gray-300 dark:hover:bg-gray-800">
                          View service
                        </Link>
                        <Link role="menuitem" to={`/market/edit-service/${service.id}`} onClick={close} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-[#fa3f5e] dark:text-gray-300 dark:hover:bg-gray-800">
                          <Pencil size={13} /> Edit
                        </Link>
                        {service.status === 'Published' && (
                          <button type="button" role="menuitem" onClick={() => { patchService(service.id, { visible_to_customers: !service.visible }); close(); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-[#fa3f5e] dark:text-gray-300 dark:hover:bg-gray-800">
                            {visible ? <EyeOff size={13} /> : <Eye size={13} />}{visible ? 'Hide' : 'Show'}
                          </button>
                        )}
                        <button type="button" role="menuitem" onClick={() => { close(); setDeleteTarget(service); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                          <Trash2 size={13} /> Delete
                        </button>
                      </>
                    )}
                  </RowActionsMenu>
                </td>
              </tr>;
            })}
            {!loading && !filtered.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No services match this view.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">Showing {filtered.length ? start + 1 : 0} to {Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} services</p>
        {totalPages > 1 && <div className="flex gap-2">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-800 dark:text-gray-300 disabled:opacity-40">Prev</button>
          <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-800 dark:text-gray-300 disabled:opacity-40">Next</button>
        </div>}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove this service?"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed from your store. This can't be undone.` : ''}
        confirmLabel={deleting ? 'Removing...' : 'Remove'}
        loading={deleting}
        onConfirm={confirmDeleteService}
      />
    </div>
  );
}
