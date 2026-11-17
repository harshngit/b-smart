export function durationMinutes(duration = '1 hour') {
  if (duration === 'Half day') return 240;
  if (duration === 'Full day') return 480;
  const values = duration.match(/\d+/g)?.map(Number) || [1];
  return Math.max(...values) * (duration.includes('minute') ? 1 : 60);
}

// A date_overrides entry for this exact date takes priority over the
// regular weekly pattern — empty slots means the owner blocked the whole
// date; non-empty slots means only those custom hours apply that date.
function slotsForDate(service, date, day) {
  const override = service.date_overrides?.find((entry) => entry.date?.slice(0, 10) === date);
  if (override) return override.slots || [];
  const schedule = service.availability?.find((entry) => entry.day === day.toLocaleDateString('en-US', { weekday: 'long' }));
  return schedule?.slots || [];
}

export function availableTimes(service, date, now = new Date()) {
  const day = new Date(`${date}T12:00:00`);
  if (Number.isNaN(day.getTime())) return [];
  const slots = slotsForDate(service, date, day);
  const minutes = (value) => value.split(':').reduce((hours, part) => hours * 60 + Number(part), 0);
  const result = new Set();
  for (const slot of slots) {
    for (let start = minutes(slot.start); start + durationMinutes(service.duration) <= minutes(slot.end); start += 30) {
      const time = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
      if (new Date(`${date}T${time}:00`) > now) result.add(time);
    }
  }
  return [...result].sort();
}
