import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, CalendarDays, MapPin, ShieldCheck, X, Loader2, RefreshCw, Download, CalendarPlus, Video, MessageCircle, Clock3, Wallet } from 'lucide-react';
import { Dropdown, inputCls } from '../../components/productForm/ProductFormFields';
import BookingDetails from '../components/BookingDetails';
import { CustomerAvatar, BookingBadge } from '../components/BookingUI';
import { BOOKING_TABS, filterBookings, bookingDate, bookingTime, localDate } from '../data/bookingHelpers';
import { money } from '../data/orderFilters';
import serviceBookingService from '../../services/serviceBookingService';
import influencerServiceService from '../../services/influencerServiceService';
import RowActionsMenu from '../components/RowActionsMenu';

const BASE = '/market/my-store/bookings';
const METHOD_LABEL = { online: 'Online', at_customer_location: 'At customer location', at_my_location: 'At my location' };
const SORT_OPTIONS = ['Soonest first', 'Latest first'];

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
const toIcsDate = (date, time) => {
  if (!date) return '';
  const parsed = new Date(time ? `${date}T${time}:00` : date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export default function StoreBookings() {
  const fallbackBookings = useSelector((state) => state.bookings.items);
  const [apiBookings, setApiBookings] = useState([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const { bookingId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = BOOKING_TABS.includes(params.get('tab')) ? params.get('tab') : 'Requests';
  const search = params.get('search') || '';
  const date = params.get('date') || '';
  const serviceFilter = params.get('service') || 'All Services';
  const sortBy = params.get('sort') === 'Latest first' ? 'Latest first' : 'Soonest first';
  const setFilter = (key, value) => setParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: true });
  const bookings = apiLoaded ? apiBookings : fallbackBookings;
  const serviceOptions = ['All Services', ...new Set(bookings.map((booking) => booking.service).filter(Boolean))];
  const serviceFiltered = serviceFilter === 'All Services' ? bookings : bookings.filter((booking) => booking.service === serviceFilter);
  const filtered = filterBookings(serviceFiltered, { tab, search, date, oldest: sortBy === 'Soonest first' });
  const today = bookings.filter((booking) => booking.date === localDate() && ['Confirmed', 'In Progress'].includes(booking.status));
  const nextToday = [...today].sort((a, b) => (a.timeSlot?.start || '').localeCompare(b.timeSlot?.start || ''))[0];
  const suffix = params.size ? `?${params.toString()}` : '';
  const active = bookings.find((booking) => booking.id === bookingId);
  const viewUrl = (id) => `${BASE}/${id}${suffix}`;

  // Real catalog lookup (category, description) for the booking-detail panel —
  // not included on the booking document itself.
  const [serviceCatalog, setServiceCatalog] = useState({});
  useEffect(() => {
    influencerServiceService.listMine()
      .then((list) => setServiceCatalog(Object.fromEntries(list.map((item) => [String(item.id), item]))))
      .catch(() => {});
  }, []);

  // Real stats computed from the live booking list — no invented percentages.
  const pendingCount = bookings.filter((b) => b.status === 'New').length;
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const confirmedThisWeek = bookings.filter((b) => ['Confirmed', 'In Progress'].includes(b.status) && b.date >= localDate() && b.date <= weekFromNow).length;
  const thisMonth = localDate().slice(0, 7);
  const monthBookings = bookings.filter((b) => b.date?.startsWith(thisMonth) && !['Cancelled', 'Declined'].includes(b.status));
  const monthRevenue = monthBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const avgPerSlot = monthBookings.length ? monthRevenue / monthBookings.length : 0;
  const ratio = (count) => bookings.length ? Math.min(100, Math.round((count / bookings.length) * 100)) : 0;

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      setApiBookings(await serviceBookingService.listSeller());
      setApiLoaded(true);
    } catch (err) {
      setApiLoaded(false);
      setError(err?.response?.data?.message || 'Could not load live service bookings. Showing local bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // Real auto-refresh — not a push-based sync, just a periodic re-fetch while
  // this page stays open.
  useEffect(() => {
    const interval = window.setInterval(fetchBookings, 45000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!bookingId || !apiLoaded) return;
    let alive = true;
    serviceBookingService.get(bookingId)
      .then((fresh) => {
        if (!alive) return;
        setApiBookings((current) => current.some((booking) => booking.id === fresh.id)
          ? current.map((booking) => booking.id === fresh.id ? fresh : booking)
          : [fresh, ...current]);
      })
      .catch((err) => {
        if (alive) setError(err?.response?.data?.message || 'Could not load booking details.');
      });
    return () => { alive = false; };
  }, [bookingId, apiLoaded]);

  const updateBookingStatus = async (id, status) => {
    setUpdatingId(id);
    setError('');
    try {
      const updated = await serviceBookingService.updateStatus(id, status);
      setApiBookings((current) => current.map((booking) => booking.id === id ? updated : booking));
      setApiLoaded(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update booking status.');
    } finally {
      setUpdatingId('');
    }
  };

  const exportCsv = (list) => {
    const rows = [
      ['Booking', 'Client', 'Service', 'Date', 'Time', 'Gross', 'Net (after 10% fee)', 'Status'],
      ...list.map((b) => [b.booking_number || b.id, b.customer, b.service, b.date, b.time, b.amount.toFixed(2), (b.amount * 0.9).toFixed(2), b.status]),
    ];
    downloadBlob(toCsv(rows), `bookings-${localDate()}.csv`, 'text/csv;charset=utf-8;');
  };

  const downloadScheduleIcs = (list) => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0'];
    list.forEach((b) => {
      const dtStart = toIcsDate(b.date, b.timeSlot?.start);
      const dtEnd = toIcsDate(b.date, b.timeSlot?.end) || dtStart;
      if (!dtStart) return;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${b.id}@b-smart`,
        `DTSTAMP:${toIcsDate(localDate())}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${b.service} with ${b.customer}`,
        'DESCRIPTION:Booking managed via b_smart My Store',
        'END:VEVENT',
      );
    });
    lines.push('END:VCALENDAR');
    downloadBlob(lines.join('\r\n'), `schedule-${localDate()}.ics`, 'text/calendar;charset=utf-8;');
  };

  return (
    <div className="max-w-[1280px] ml-auto px-4 md:px-8 pt-6 pb-10">
      <div className="flex items-start gap-4 lg:gap-6">
        <section aria-label="Bookings" className={`min-w-0 flex-1 ${bookingId ? 'hidden md:block' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Auto-refreshing
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage appointments, client consultations, and scheduled creator sessions.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={fetchBookings} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fa3f5e]"><RefreshCw size={13} />Refresh</button>
              <button type="button" onClick={() => exportCsv(filtered)} className="flex items-center gap-1.5 rounded-full border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>
          {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">{error}</p>}

          {/* Stat cards — all computed from the live booking list */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pending requests</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
              <p className="text-[11px] text-[#fa3f5e] font-semibold mt-0.5">Needs your response</p>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mt-2 overflow-hidden"><div className="h-full bg-[#fa3f5e]" style={{ width: `${ratio(pendingCount)}%` }} /></div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Confirmed upcoming</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{confirmedThisWeek}</p>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">This week</p>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mt-2 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${ratio(confirmedThisWeek)}%` }} /></div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Today's schedule</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{today.length}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{nextToday ? `Next at ${bookingTime(nextToday.timeSlot?.start)}` : 'Nothing scheduled'}</p>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mt-2 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${ratio(today.length)}%` }} /></div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly service revenue</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{money(monthRevenue)}</p>
              <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Avg {money(avgPerSlot)}/slot</p>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mt-2 overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${monthBookings.length ? 100 : 0}%` }} /></div>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-800 mb-5">{BOOKING_TABS.map((value) => <button type="button" key={value} aria-pressed={tab === value} onClick={() => setFilter('tab', value)} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${tab === value ? 'border-[#fa3f5e] text-[#fa3f5e]' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>{value}</button>)}</div>
          <div className="flex flex-wrap gap-3 items-center mb-5">
            <div className="relative flex-1 sm:max-w-xs min-w-[170px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input aria-label="Search bookings" value={search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Search by client, service, booking #" className={`${inputCls} pl-9`} /></div>
            <div className="flex items-center gap-2"><label className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><CalendarDays size={16} /><input type="date" aria-label="Filter bookings by date" value={date} onChange={(event) => setFilter('date', event.target.value)} className={`${inputCls} w-40`} /></label>{date && <button type="button" aria-label="Clear booking date" onClick={() => setFilter('date', '')} className="text-gray-400"><X size={15} /></button>}</div>
            <Dropdown className="w-44" value={serviceFilter} options={serviceOptions} onChange={(value) => setFilter('service', value === 'All Services' ? '' : value)} />
            <Dropdown className="w-36" value={sortBy} options={SORT_OPTIONS} onChange={(value) => setFilter('sort', value)} />
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto shadow-sm">
            <table className="w-full min-w-[720px] text-xs">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">{['Client & ID', 'Service offering', 'Scheduled slot', 'Gross & net', 'Status', 'Actions'].map((heading) => <th key={heading} className={`px-4 py-3.5 font-medium ${heading === 'Actions' ? 'text-right' : ''}`}>{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading && !filtered.length && <tr><td colSpan={6} className="text-center py-12 text-gray-400"><Loader2 size={16} className="animate-spin inline mr-2" />Loading bookings...</td></tr>}
                {!loading && filtered.map((booking) => <tr key={booking.id} className={booking.id === bookingId ? 'bg-pink-50/60 dark:bg-pink-900/10 ring-1 ring-inset ring-[#fa3f5e]/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}>
                  <td className="px-4 py-4"><div className="flex items-center gap-2.5"><CustomerAvatar name={booking.customer} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5"><Link to={viewUrl(booking.id)} className="font-semibold text-gray-800 dark:text-gray-200 hover:text-[#fa3f5e]">{booking.customer}</Link>{booking.verified && <ShieldCheck size={12} className="text-[#fa3f5e] shrink-0" />}</div>
                      {booking.booking_number && <p className="text-[10px] text-gray-400 mt-0.5">#{booking.booking_number}</p>}
                    </div>
                  </div></td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">{booking.service}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                      {booking.duration && <span className="flex items-center gap-1"><Clock3 size={11} />{booking.duration}</span>}
                      {booking.service_method && <span className="flex items-center gap-1">{booking.service_method === 'online' ? <Video size={11} /> : <MapPin size={11} />}{METHOD_LABEL[booking.service_method] || booking.service_method}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap"><span className="flex items-center gap-1.5"><CalendarDays size={13} />{bookingDate(booking.date)} · {booking.time}</span></td>
                  <td className="px-4 py-4"><p className="font-semibold text-gray-900 dark:text-white">{money(booking.amount)}</p><p className="text-[10px] text-emerald-600">Net {money(booking.amount * 0.9)}</p></td>
                  <td className="px-4 py-4"><BookingBadge status={booking.status} /></td>
                  <td className="px-4 py-4 text-right">
                    <RowActionsMenu ariaLabel={`Actions for booking ${booking.id}`} menuClassName="w-40">
                      {(close) => (
                        <Link role="menuitem" to={viewUrl(booking.id)} onClick={close} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-[#fa3f5e] dark:text-gray-300 dark:hover:bg-gray-800">
                          View booking
                        </Link>
                      )}
                    </RowActionsMenu>
                  </td>
                </tr>)}
                {!loading && !filtered.length && <tr><td colSpan={6} className="text-center py-12 text-gray-400">No bookings match this view.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-7">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Today's Scheduled Services</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {today.length} session{today.length === 1 ? '' : 's'} today{nextToday ? ` · Next at ${bookingTime(nextToday.timeSlot?.start)}` : ''}
                </p>
              </div>
              {today.length > 0 && (
                <button type="button" onClick={() => downloadScheduleIcs(today)} className="flex items-center gap-1.5 rounded-full border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                  <CalendarPlus size={13} /> Download today's schedule (.ics)
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {today.map((booking) => {
                const isOnline = booking.service_method === 'online';
                return (
                  <div key={booking.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CustomerAvatar name={booking.customer} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{booking.customer}{booking.verified && <ShieldCheck size={12} className="text-[#fa3f5e] shrink-0" />}</p>
                        </div>
                      </div>
                      <BookingBadge status={booking.status} />
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-xs text-gray-600 dark:text-gray-300">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Service &amp; Time</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{booking.service}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px]">
                        <span className="flex items-center gap-1"><CalendarDays size={12} />{bookingTime(booking.timeSlot?.start)} – {bookingTime(booking.timeSlot?.end)}{booking.duration ? ` (${booking.duration})` : ''}</span>
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold"><Wallet size={12} />{money(booking.amount)} {booking.paymentSecured ? '(Paid)' : '(Pending)'}</span>
                      </div>
                    </div>
                    {isOnline ? (
                      <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Video size={13} className="text-blue-500" /> Online video call</p>
                    ) : (
                      <div className="flex items-start justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <p className="flex items-start gap-2"><MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />{booking.address}</p>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.address)}`} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-[#fa3f5e]">View on Map</a>
                      </div>
                    )}
                    {booking.note && <p className="text-xs italic text-gray-500 dark:text-gray-400 border-l-2 border-gray-200 dark:border-gray-700 pl-2">"{booking.note}"</p>}
                    <div className="flex gap-2">
                      <Link to="/messages" className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 h-9 text-xs font-semibold text-gray-700 dark:text-gray-300"><MessageCircle size={13} /> Message</Link>
                      <Link to={viewUrl(booking.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange h-9 text-xs font-bold text-white">View Details</Link>
                    </div>
                  </div>
                );
              })}
              {!today.length && <div className="sm:col-span-2 p-6 text-sm text-gray-400 border border-gray-100 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">No confirmed services scheduled for today.</div>}
            </div>
          </div>
        </section>
        {bookingId && (
          <div className="w-full md:w-[300px] lg:w-[340px] shrink-0 md:sticky md:top-6">
            <BookingDetails key={bookingId} booking={active} serviceCatalog={serviceCatalog} closeTo={BASE + suffix} onStatusChange={updateBookingStatus} updating={updatingId === bookingId} apiEnabled={apiLoaded} />
          </div>
        )}
      </div>
    </div>
  );
}
