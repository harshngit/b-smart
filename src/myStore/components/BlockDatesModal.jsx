import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import influencerServiceService, { dateOverridesToApi } from '../../services/influencerServiceService';
import DateOverridesEditor from './DateOverridesEditor';

// Quick-access "block dates" entry point from the services list — lets an
// owner manage one service's date_overrides without opening the full Edit
// Service wizard, or broadcast a new block across several selected services
// at once (bulk mode merges into each service's existing blocks rather than
// replacing them, since there's no single "current list" to show for many
// services at once).
export default function BlockDatesModal({ serviceIds, serviceNames = [], onClose, onSaved }) {
  const isBulk = serviceIds.length > 1;
  const [dateOverrides, setDateOverrides] = useState([]);
  const [loading, setLoading] = useState(!isBulk);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isBulk) return;
    let alive = true;
    influencerServiceService.get(serviceIds[0])
      .then((service) => { if (alive) setDateOverrides(service.dateOverrides || []); })
      .catch(() => { if (alive) setError('Could not load this service’s current blocks.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isBulk, serviceIds]);

  const save = async () => {
    if (!dateOverrides.length) { setError('Add at least one block before saving.'); return; }
    setSaving(true);
    setError('');
    try {
      if (!isBulk) {
        await influencerServiceService.update(serviceIds[0], { date_overrides: dateOverridesToApi(dateOverrides) });
      } else {
        // Each selected service keeps its own existing blocks — only the
        // date(s) just added here get merged in (upserted by date), not a
        // full replace, since this view never showed any one service's
        // pre-existing list.
        const newEntries = dateOverridesToApi(dateOverrides);
        await Promise.all(serviceIds.map(async (id) => {
          const service = await influencerServiceService.get(id);
          const existing = dateOverridesToApi(service.dateOverrides || []);
          const merged = [
            ...existing.filter((entry) => !newEntries.some((n) => n.date === entry.date)),
            ...newEntries,
          ];
          return influencerServiceService.update(id, { date_overrides: merged });
        }));
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save these blocks. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Block dates</h2>
            <p className="text-xs text-gray-400 truncate">
              {isBulk ? `Applying to ${serviceIds.length} selected services` : serviceNames[0] || 'This service'}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>
          ) : (
            <>
              {isBulk && (
                <p className="mb-4 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg px-3 py-2">
                  This adds the block(s) below to all {serviceIds.length} selected services, on top of whatever each already has — it won't remove any of their existing blocks.
                </p>
              )}
              <DateOverridesEditor dateOverrides={dateOverrides} setDateOverrides={setDateOverrides} />
            </>
          )}
          {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
          <button type="button" disabled={saving || loading} onClick={save} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isBulk ? `Apply to ${serviceIds.length} services` : 'Save blocks'}
          </button>
        </div>
      </div>
    </div>
  );
}
