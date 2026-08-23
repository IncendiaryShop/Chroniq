// ---------- Date helpers ----------
// Kept intentionally close to the original ShiftLedger prototype's date
// math so behavior (month rollovers, range iteration, etc.) is unchanged.

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "YYYY_M" key used to bucket entries by month in the in-memory cache. */
export function monthKey(date) {
  return date.getFullYear() + "_" + (date.getMonth() + 1);
}

/** "YYYY-MM-DD" key used for Supabase's `work_date` (a DATE column). */
export function dateKey(y, m, d) {
  return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}

export function isWeekend(dow) {
  return dow === 0 || dow === 6;
}

/** Inclusive list of "YYYY-MM-DD" keys between two ISO date strings. */
export function iterateDateRange(start, end) {
  const out = [];
  let cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    out.push(dateKey(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function daysInMonth(year, month /* 0-indexed */) {
  return new Date(year, month + 1, 0).getDate();
}

export function firstDowOfMonth(year, month /* 0-indexed */) {
  return new Date(year, month, 1).getDay();
}
