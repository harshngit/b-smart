import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { X, Clock3, MapPin, Map, ShieldCheck, MessageCircle, Lock, Phone, Download, CalendarPlus, Video } from 'lucide-react';
import { inputCls, labelCls } from '../../components/productForm/ProductFormFields';
import { acceptBooking, declineBooking, proposeBookingTime, completeBooking } from '../../store/bookingsSlice';
import { bookingDate, bookingTime, bookingStatus, localDate, validProposal } from '../data/bookingHelpers';
import { money } from '../data/orderFilters';
import { CustomerAvatar, BookingBadge } from './BookingUI';
import ConfirmDialog from './ConfirmDialog';

const relativeDay = (dateStr) => {
  if (!dateStr) return '';
  const today = localDate();
  const tomorrow = localDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (dateStr === today) return 'Today, ';
  if (dateStr === tomorrow) return 'Tomorrow, ';
  return '';
};

const toIcsDate = (date, time) => {
  if (!date) return '';
  const parsed = new Date(time ? `${date}T${time}:00` : date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export default function BookingDetails({ booking, serviceCatalog = {}, closeTo, onStatusChange, updating = false, apiEnabled = false }) {
  const dispatch = useDispatch();
  const headingRef = useRef(null);
  const [showProposal, setShowProposal] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [date, setDate] = useState(booking?.proposedDate || '');
  const [time, setTime] = useState(booking?.proposedTime || '');
  const [error, setError] = useState('');
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  if (!booking) return <aside className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900"><h2 ref={headingRef} tabIndex={-1} className="font-bold text-gray-900 dark:text-white">Booking not found</h2><Link to={closeTo} className="text-sm text-[#fa3f5e] inline-block mt-3">Back to bookings</Link></aside>;
  const actionable = ['New', 'Proposed'].includes(booking.status);
  const canStart = booking.status === 'Confirmed';
  const canComplete = booking.status === 'In Progress';
  const earnings = Math.round(booking.amount * 0.9 * 100) / 100;
  const fee = Math.round(booking.amount * 0.1 * 100) / 100;
  const service = serviceCatalog[String(booking.serviceId)];
  const isOnline = booking.service_method === 'online';
  const setStatus = (status) => {
    if (apiEnabled) onStatusChange?.(booking.id, status);
    else if (status === 'Confirmed') dispatch(acceptBooking(booking.id));
    else if (status === 'Completed') dispatch(completeBooking(booking.id));
  };
  const submitProposal = (event) => {
    event.preventDefault();
    if (!validProposal(date, time)) { setError('Choose a date and time in the future.'); return; }
    dispatch(proposeBookingTime({ id: booking.id, date, time }));
    setShowProposal(false);
    setError('');
  };

  const downloadSummary = () => {
    const lines = [
      `Booking #${booking.booking_number || booking.id}`,
      `Status: ${bookingStatus(booking.status)}`,
      `Client: ${booking.customer}`,
      `Service: ${booking.service}`,
      `When: ${bookingDate(booking.date)}, ${bookingTime(booking.timeSlot?.start)} - ${bookingTime(booking.timeSlot?.end)}${booking.duration ? ` (${booking.duration})` : ''}`,
      isOnline ? 'Delivery: Online video call' : `Address: ${booking.address}`,
      booking.note ? `Note: ${booking.note}` : null,
      `Amount: ${money(booking.amount)} (your earnings after 10% fee: ${money(earnings)})`,
    ].filter(Boolean);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${booking.booking_number || booking.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadIcs = () => {
    const dtStart = toIcsDate(booking.date, booking.timeSlot?.start);
    const dtEnd = toIcsDate(booking.date, booking.timeSlot?.end) || dtStart;
    if (!dtStart) return;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `UID:${booking.id}@b-smart`,
      `DTSTAMP:${toIcsDate(localDate())}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${booking.service} with ${booking.customer}`,
      'DESCRIPTION:Booking managed via b_smart My Store',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${booking.booking_number || booking.id}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside aria-label="Booking details" className="min-w-0 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 ref={headingRef} tabIndex={-1} className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-bold text-gray-900 dark:text-white outline-none">
          <Link to={closeTo} className="text-gray-400 hover:text-[#fa3f5e] font-semibold">Bookings</Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span>#{booking.booking_number || booking.id}</span>
          <BookingBadge status={booking.status} />
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={downloadSummary} aria-label="Download booking summary" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><Download size={15} /></button>
          <button type="button" onClick={downloadIcs} aria-label="Add to calendar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><CalendarPlus size={15} /></button>
          <Link to={closeTo} aria-label="Close booking details" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={15} /></Link>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400"><Clock3 size={12} />Requested slot</p>
            {booking.duration && <span className="rounded-md bg-slate-50 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:text-gray-400">{booking.duration}</span>}
          </div>
          <p className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white">{relativeDay(booking.date)}{bookingDate(booking.date)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{bookingTime(booking.timeSlot?.start)} – {bookingTime(booking.timeSlot?.end)} IST</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-3.5 ${booking.paymentSecured ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-amber-50 dark:bg-amber-900/10'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-[10px] font-bold uppercase tracking-wide ${booking.paymentSecured ? 'text-emerald-600' : 'text-amber-600'}`}>Payment</p>
              <Lock size={13} className={booking.paymentSecured ? 'text-emerald-500' : 'text-amber-500'} />
            </div>
            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{money(booking.amount)}</p>
            <p className={`text-[10px] mt-0.5 ${booking.paymentSecured ? 'text-emerald-600' : 'text-amber-600'}`}>{booking.paymentSecured ? 'Secured via Razorpay' : 'Pending payment'}</p>
          </div>
          <div className="rounded-xl bg-pink-50 dark:bg-pink-900/10 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#fa3f5e]">Net earnings (90%)</p>
            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{money(booking.status === 'Declined' ? 0 : earnings)}</p>
            <p className="text-[10px] text-[#fa3f5e] mt-0.5">Less 10% service fee (-{money(fee)})</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Client profile</p>
            <Link to="/messages" className="flex items-center gap-1 text-xs font-bold text-[#fa3f5e]"><MessageCircle size={12} />Message</Link>
          </div>
          <div className="flex items-center gap-3">
            <CustomerAvatar name={booking.customer} large />
            <div>
              <p className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-white">{booking.customer}{booking.verified && <ShieldCheck size={13} className="text-[#fa3f5e]" />}</p>
            </div>
          </div>
          {(booking.customer_address?.phone || booking.customer_address?.city) && (
            <div className="mt-3 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
              {booking.customer_address?.phone && <p className="flex items-center gap-2"><Phone size={12} />{booking.customer_address.phone}</p>}
              {booking.customer_address?.city && <p className="flex items-center gap-2"><MapPin size={12} />{[booking.customer_address.city, booking.customer_address.state].filter(Boolean).join(', ')}</p>}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3.5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Service package</p>
            {service?.category && <span className="rounded-full bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 text-[10px] font-bold text-insta-purple">{service.category}</span>}
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{booking.service}</p>
          {service?.description && <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400 line-clamp-3">{service.description}</p>}
          <div className="mt-3 rounded-lg bg-slate-50 dark:bg-gray-800/60 p-2.5">
            {isOnline ? (
              <p className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><Video size={14} className="text-blue-500" />Online video call — link shared after you accept</p>
            ) : (
              <>
                <p className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300"><MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />{booking.address}</p>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.address)}`} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#fa3f5e]"><Map size={13} />Open directions</a>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Client note</p>
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{booking.note ? `"${booking.note}"` : 'No note provided.'}</p>
        </div>

        {booking.status !== 'New' && <div role="status" className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3"><BookingBadge status={booking.status} />{booking.status === 'Proposed' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{bookingDate(booking.proposedDate)} · {bookingTime(booking.proposedTime)} — awaiting customer confirmation</p>}</div>}
      </div>

      <div className="px-5 pb-5">
        {actionable && <div className="space-y-2">
          <div className="flex gap-2">
            {booking.status === 'New' && <button type="button" disabled={updating} onClick={() => setStatus('Confirmed')} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange disabled:opacity-40">{updating ? 'Updating...' : 'Accept Booking'}</button>}
            {!apiEnabled && <button type="button" aria-label="Decline booking" onClick={() => setShowDecline(true)} className="flex items-center justify-center w-11 rounded-lg border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"><X size={16} /></button>}
          </div>
          <button type="button" aria-expanded={showProposal} onClick={() => setShowProposal(!showProposal)} className="w-full py-2.5 rounded-lg text-sm font-semibold border border-[#fa3f5e]/50 text-[#fa3f5e] hover:bg-pink-50 dark:hover:bg-pink-900/10">{booking.status === 'Proposed' ? 'Update proposed time' : 'Propose New Time'}</button>
          {showProposal && <form onSubmit={submitProposal} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-3"><div><label htmlFor="proposed-date" className={labelCls}>Date</label><input id="proposed-date" type="date" required min={localDate()} value={date} onChange={(event) => setDate(event.target.value)} className={inputCls} /></div><div><label htmlFor="proposed-time" className={labelCls}>Time</label><input id="proposed-time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} className={inputCls} /></div>{error && <p role="alert" className="text-xs text-red-500">{error}</p>}<button type="submit" className="w-full rounded-lg bg-[#fa3f5e] text-white text-xs font-semibold py-2.5">Save proposed time</button></form>}
          <p className="text-center text-[10px] text-gray-400 mt-2">Secure payments via Razorpay.</p>
        </div>}
        {apiEnabled && canStart && <button type="button" disabled={updating} onClick={() => setStatus('In Progress')} className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange disabled:opacity-40">{updating ? 'Updating...' : 'Start service'}</button>}
        {(apiEnabled ? canComplete : booking.status === 'Confirmed') && <button type="button" disabled={updating} onClick={() => setStatus('Completed')} className="w-full mt-3 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange disabled:opacity-40">{updating ? 'Updating...' : 'Mark as completed'}</button>}
        <p className="text-[10px] text-gray-400 mt-4">Booking #{booking.booking_number || booking.id} · {bookingStatus(booking.status)}</p>
      </div>

      <ConfirmDialog
        open={showDecline}
        onClose={() => setShowDecline(false)}
        title="Decline this booking?"
        description={`The booking from ${booking.customer} will be declined.`}
        confirmLabel="Decline"
        onConfirm={() => { setShowDecline(false); dispatch(declineBooking(booking.id)); }}
      />
    </aside>
  );
}
