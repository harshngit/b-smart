import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { inputCls, labelCls, Req, TimePicker } from '../../components/productForm/ProductFormFields';
import CalendarDatePicker from '../../components/CalendarDatePicker';
import { REASON_OPTIONS } from '../../services/influencerServiceService';
import { bookingTime, localDate } from '../data/bookingHelpers';

const emptyOverrideDraft = () => ({ date: '', mode: 'entire', slots: [{ start: '', end: '' }], reason: 'Unavailable', customReason: '' });

const formatOverrideDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Same look as the shared Dropdown, but rendered through a portal (like
// CalendarDatePicker) so its open panel can never be clipped by an
// overflow-hidden ancestor (e.g. a SectionCard or modal) — the shared
// Dropdown doesn't use a portal, which is what was cutting the Reason menu off.
function PortalSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  };
  const openMenu = () => { computePosition(); setOpen(true); };

  useEffect(() => {
    if (!open) return undefined;
    const reposition = () => computePosition();
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target) && panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('mousedown', handler);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <button
        type="button"
        ref={triggerRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-gray-900 border rounded-lg text-sm text-left transition-all ${open ? 'border-[#fa3f5e] ring-2 ring-[#fa3f5e]/20' : 'border-gray-200 dark:border-gray-800'}`}
      >
        <span className="text-gray-900 dark:text-white truncate">{value}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
          // Same above-any-modal z-index as CalendarDatePicker's popup — this
          // dropdown is rendered via portal too, so a lower value here would
          // get visually buried under a modal's own backdrop when used inside one.
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl z-[10001] overflow-hidden max-h-56 overflow-y-auto"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { onChange(option); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${option === value ? 'bg-pink-50 text-[#fa3f5e] font-semibold dark:bg-pink-900/20' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              {option}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

// Reusable "block specific dates / hours" editor — one-off exceptions to a
// service's recurring weekly_availability. Used both inline in ServiceForm's
// Step 4 (dateOverrides lives in that form's own state, saved together with
// everything else) and standalone in BlockDatesModal (dateOverrides is
// fetched/saved independently, outside the full edit form).
const MAX_RANGE_DAYS = 60;

const dateRange = (fromStr, toStr) => {
  const dates = [];
  let cursor = new Date(`${fromStr}T12:00:00`);
  const end = new Date(`${toStr}T12:00:00`);
  while (cursor <= end) {
    dates.push(localDate(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
};

export default function DateOverridesEditor({ dateOverrides, setDateOverrides }) {
  const [overrideDraft, setOverrideDraft] = useState(emptyOverrideDraft());
  const [overrideError, setOverrideError] = useState('');
  const [overrideNotice, setOverrideNotice] = useState('');
  const [editingOverrideId, setEditingOverrideId] = useState(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeEndDate, setRangeEndDate] = useState('');

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  // CalendarDatePicker defaults maxDate to "today" (it's built for past-date
  // fields like date of birth) — override both bounds so future dates are
  // pickable, since blocking only makes sense for today/future.
  const todayDateObj = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const farFutureDateObj = useMemo(() => { const d = new Date(todayDateObj); d.setFullYear(d.getFullYear() + 2); return d; }, [todayDateObj]);

  const updateDraftSlot = (index, field, value) => setOverrideDraft((current) => ({
    ...current,
    slots: current.slots.map((slot, i) => i === index ? { ...slot, [field]: value } : slot),
  }));
  const addDraftSlot = () => setOverrideDraft((current) => ({ ...current, slots: [...current.slots, { start: '', end: '' }] }));
  const removeDraftSlot = (index) => setOverrideDraft((current) => ({
    ...current,
    slots: current.slots.length > 1 ? current.slots.filter((_, i) => i !== index) : current.slots,
  }));
  const resetOverrideDraft = () => {
    setOverrideDraft(emptyOverrideDraft());
    setEditingOverrideId(null);
    setOverrideError('');
    setOverrideNotice('');
    setRangeMode(false);
    setRangeEndDate('');
  };
  const addOrUpdateBlock = () => {
    setOverrideNotice('');
    if (!overrideDraft.date) { setOverrideError(rangeMode ? 'Please choose a start date' : 'Please choose a date to block'); return; }
    if (overrideDraft.date < todayStr) { setOverrideError('Only today or future dates can be blocked'); return; }

    const cleanSlots = overrideDraft.mode === 'specific'
      ? overrideDraft.slots.filter((slot) => slot.start && slot.end)
      : [];
    if (overrideDraft.mode === 'specific' && !cleanSlots.length) {
      setOverrideError('Add at least one valid time range, or switch to Entire day');
      return;
    }
    if (overrideDraft.mode === 'specific' && cleanSlots.some((slot) => slot.start >= slot.end)) {
      setOverrideError('Each time range must start before it ends');
      return;
    }
    if (overrideDraft.reason === 'Custom Reason' && !overrideDraft.customReason.trim()) {
      setOverrideError('Please enter a custom reason');
      return;
    }
    const sharedFields = {
      mode: overrideDraft.mode,
      slots: cleanSlots.length ? cleanSlots : [{ start: '', end: '' }],
      reason: overrideDraft.reason,
      customReason: overrideDraft.customReason.trim(),
    };

    // Range add: expand into one entry per day (each stored exactly like a
    // single-date block — the backend has no concept of a "range", only
    // individual dates) — only available for brand-new blocks, not editing.
    if (rangeMode && !editingOverrideId) {
      if (!rangeEndDate) { setOverrideError('Please choose an end date'); return; }
      if (rangeEndDate < overrideDraft.date) { setOverrideError('End date must be on or after the start date'); return; }
      const allDates = dateRange(overrideDraft.date, rangeEndDate);
      if (allDates.length > MAX_RANGE_DAYS) { setOverrideError(`A range can block at most ${MAX_RANGE_DAYS} days at once`); return; }
      const existingDates = new Set(dateOverrides.map((entry) => entry.date));
      const newDates = allDates.filter((d) => !existingDates.has(d));
      if (!newDates.length) { setOverrideError('Every date in that range already has a block'); return; }
      const newEntries = newDates.map((d) => ({ id: `${d}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: d, ...sharedFields }));
      setDateOverrides((current) => [...current, ...newEntries]);
      const skipped = allDates.length - newDates.length;
      resetOverrideDraft();
      if (skipped > 0) setOverrideNotice(`Blocked ${newDates.length} date${newDates.length === 1 ? '' : 's'} — skipped ${skipped} that already had a block.`);
      return;
    }

    if (dateOverrides.some((entry) => entry.date === overrideDraft.date && entry.id !== editingOverrideId)) {
      setOverrideError('This date already has a block — edit or remove it below instead');
      return;
    }
    const entry = { id: editingOverrideId || `${overrideDraft.date}-${Date.now()}`, date: overrideDraft.date, ...sharedFields };
    setDateOverrides((current) => editingOverrideId
      ? current.map((item) => item.id === editingOverrideId ? entry : item)
      : [...current, entry]);
    resetOverrideDraft();
  };
  const editBlock = (entry) => {
    setOverrideDraft({
      date: entry.date,
      mode: entry.mode,
      slots: entry.mode === 'specific' ? entry.slots : [{ start: '', end: '' }],
      reason: entry.reason,
      customReason: entry.customReason || '',
    });
    setEditingOverrideId(entry.id);
    setOverrideError('');
    setOverrideNotice('');
    setRangeMode(false);
    setRangeEndDate('');
  };
  const removeBlock = (id) => {
    setDateOverrides((current) => current.filter((item) => item.id !== id));
    if (editingOverrideId === id) resetOverrideDraft();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Block a date or specific hours without changing your weekly schedule.</p>
      {!editingOverrideId && (
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <input type="checkbox" checked={rangeMode} onChange={(event) => { setRangeMode(event.target.checked); setRangeEndDate(''); setOverrideError(''); }} className="accent-[#fa3f5e]" />
          Block a range of dates
        </label>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className={labelCls}>{rangeMode ? 'Start date' : 'Date'} <Req /></label>
          <CalendarDatePicker
            value={overrideDraft.date}
            minDate={todayDateObj}
            maxDate={farFutureDateObj}
            dateStatus={(d) => {
              const match = dateOverrides.find((entry) => entry.date === localDate(d));
              if (!match) return null;
              const label = match.reason === 'Custom Reason' ? (match.customReason || 'Custom reason') : match.reason;
              return { label: match.mode === 'entire' ? label : `${label} (partial)` };
            }}
            onChange={(value) => {
              if (!value) return;
              if (!rangeMode) {
                const existing = dateOverrides.find((entry) => entry.date === value);
                if (existing) { editBlock(existing); return; }
              }
              setOverrideDraft((current) => ({ ...current, date: value }));
            }}
            placeholder="Select date"
          />
        </div>
        {rangeMode && !editingOverrideId && (
          <div className="w-40">
            <label className={labelCls}>End date <Req /></label>
            <CalendarDatePicker
              value={rangeEndDate}
              minDate={overrideDraft.date ? new Date(`${overrideDraft.date}T00:00:00`) : todayDateObj}
              maxDate={farFutureDateObj}
              onChange={(value) => value && setRangeEndDate(value)}
              placeholder="Select date"
            />
          </div>
        )}
        <div>
          <label className={labelCls}>Block availability <Req /></label>
          <div className="flex items-center gap-4 h-[42px]">
            <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              <input type="radio" name="override-mode" checked={overrideDraft.mode === 'entire'} onChange={() => setOverrideDraft((current) => ({ ...current, mode: 'entire' }))} className="accent-[#fa3f5e]" />
              Entire day
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              <input type="radio" name="override-mode" checked={overrideDraft.mode === 'specific'} onChange={() => setOverrideDraft((current) => ({ ...current, mode: 'specific' }))} className="accent-[#fa3f5e]" />
              Specific hours
            </label>
          </div>
        </div>
        {overrideDraft.mode === 'specific' && (
          <>
            <div className="w-32">
              <label className={labelCls}>From <Req /></label>
              <TimePicker ariaLabel="Block time range 1 start" value={overrideDraft.slots[0].start} onChange={(value) => updateDraftSlot(0, 'start', value)} />
            </div>
            <div className="w-32">
              <label className={labelCls}>To <Req /></label>
              <TimePicker ariaLabel="Block time range 1 end" value={overrideDraft.slots[0].end} onChange={(value) => updateDraftSlot(0, 'end', value)} />
            </div>
          </>
        )}
        <div className="w-48">
          <PortalSelect
            label="Reason (optional)"
            value={overrideDraft.reason}
            options={REASON_OPTIONS}
            onChange={(value) => setOverrideDraft((current) => ({ ...current, reason: value }))}
          />
        </div>
        <button type="button" onClick={addOrUpdateBlock} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange whitespace-nowrap">{editingOverrideId ? 'Update Block' : rangeMode ? 'Add Blocks' : 'Add Block'}</button>
        {editingOverrideId && <button type="button" onClick={resetOverrideDraft} className="text-xs text-gray-400 hover:text-[#fa3f5e]">Cancel edit</button>}
      </div>
      {overrideDraft.mode === 'specific' && (
        <div>
          {overrideDraft.slots.slice(1).map((slot, i) => {
            const index = i + 1;
            return (
              <div key={index} className="flex items-center gap-2 mt-2">
                <TimePicker ariaLabel={`Block time range ${index + 1} start`} value={slot.start} onChange={(value) => updateDraftSlot(index, 'start', value)} />
                <span className="text-gray-400">–</span>
                <TimePicker ariaLabel={`Block time range ${index + 1} end`} value={slot.end} onChange={(value) => updateDraftSlot(index, 'end', value)} />
                <button type="button" aria-label={`Remove time range ${index + 1}`} onClick={() => removeDraftSlot(index)} className="p-1 text-gray-400 hover:text-red-500"><X size={16} /></button>
              </div>
            );
          })}
          <button type="button" onClick={addDraftSlot} className="flex items-center gap-1 text-xs font-semibold text-[#fa3f5e] hover:text-insta-purple mt-2"><Plus size={13} /> Add time range</button>
        </div>
      )}
      {overrideDraft.reason === 'Custom Reason' && (
        <div className="max-w-xs">
          <label htmlFor="override-custom-reason" className={labelCls}>Custom reason <Req /></label>
          <input id="override-custom-reason" value={overrideDraft.customReason} onChange={(event) => setOverrideDraft((current) => ({ ...current, customReason: event.target.value }))} maxLength={200} placeholder="e.g. Equipment maintenance" className={inputCls} />
        </div>
      )}
      {overrideError && <p role="alert" className="text-xs text-red-500">{overrideError}</p>}
      {overrideNotice && <p className="text-xs text-emerald-600 dark:text-emerald-400">{overrideNotice}</p>}
      <p className="text-xs text-gray-400">Applies only to the selected date{rangeMode ? '(s)' : ''}. Only today and future dates can be blocked.</p>
      {dateOverrides.length > 0 && (
        <div>
          <label className={labelCls}>Blocked dates & hours</label>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-500 dark:text-gray-400"><th className="p-2.5">Date</th><th className="p-2.5">Unavailable time</th><th className="p-2.5">Reason</th><th className="p-2.5" /></tr></thead>
              <tbody>
                {[...dateOverrides].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => (
                  <tr key={entry.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-2.5 whitespace-nowrap">{formatOverrideDate(entry.date)}</td>
                    <td className="p-2.5">{entry.mode === 'entire' ? 'Entire day' : entry.slots.map((slot) => `${bookingTime(slot.start)} – ${bookingTime(slot.end)}`).join(', ')}</td>
                    <td className="p-2.5">{entry.reason === 'Custom Reason' ? (entry.customReason || 'Custom') : entry.reason}</td>
                    <td className="p-2.5 whitespace-nowrap">
                      <button type="button" aria-label={`Edit block on ${entry.date}`} onClick={() => editBlock(entry)} className="p-1 text-gray-400 hover:text-[#fa3f5e]"><Pencil size={14} /></button>
                      <button type="button" aria-label={`Remove block on ${entry.date}`} onClick={() => removeBlock(entry.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="flex items-center gap-1.5 text-xs text-gray-400"><Calendar size={13} /> Other hours remain bookable. Your weekly availability stays unchanged.</p>
    </div>
  );
}
