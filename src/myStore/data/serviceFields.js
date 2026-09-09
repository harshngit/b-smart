export const SERVICE_CATEGORIES = ['Home Services', 'Business Consulting', 'Health & Wellness', 'Photography', 'Delivery', 'Education', 'Other'];
export const RATE_TYPES = ['Starting from', 'Fixed price', 'Per hour', 'Per session'];
export const DURATIONS = ['30 minutes', '1 hour', '2 hours', '2–3 hours', 'Half day', 'Full day'];
export const METHODS = ['At customer location', 'Online', 'At my location'];
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const defaultAvailability = () => DAYS.map((day, index) => ({ day, slots: index < 5 ? [{ start: '09:00', end: '17:00' }] : [] }));
export const servicePrice = ({ price, rateType }) => {
  const amount = `$${Number(price || 0).toLocaleString()}`;
  return rateType === 'Starting from' ? `From ${amount}` : `${amount}${rateType === 'Per hour' ? ' / hour' : rateType === 'Per session' ? ' / session' : ''}`;
};

export function validateService(form, availability, draft = false) {
  if (!draft) {
    if (!form.name.trim() || !form.description.trim()) return 'Enter a service name and description.';
    if (form.price === '' || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) return 'Enter a valid price of zero or more.';
    if (!availability.some((day) => day.slots.length)) return 'Add at least one availability slot.';
    if (form.method === 'At my location' && !form.address.trim()) return 'Enter your service address.';
  }
  for (const { day, slots } of availability) {
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    if (sorted.some((slot, index) => !slot.start || !slot.end || slot.end <= slot.start || (index > 0 && sorted[index - 1].end > slot.start))) {
      return `${day}: use valid start and end times without overlapping slots.`;
    }
  }
  return '';
}
