// ---------- Shift domain constants ----------

export const SHIFT_KEYS = ["N", "M", "OC", "S", "G"];

export const SHIFT_LABELS = {
  N: "Night",
  M: "Morning",
  OC: "OC",
  S: "Second",
  G: "General",
  HOL: "Holiday",
  DO: "Day Off",
};

// Shift values with no timings — never a "worked" shift for comp-off math.
export const NON_WORKING = ["DO"];

export const FALLBACK_DEFAULTS = {
  N: { start: "22:00", end: "06:00" },
  M: { start: "06:00", end: "14:00" },
  OC: { start: "09:00", end: "18:00" },
  S: { start: "14:00", end: "22:00" },
  G: { start: "09:00", end: "17:30" },
};

const SHIFT_ICONS = {
  N: "fa-solid fa-moon",
  M: "fa-solid fa-sun",
  OC: "fa-solid fa-clock",
  S: "fa-solid fa-cloud-sun",
  G: "fa-solid fa-sun",
  DO: "fa-solid fa-xmark",
};

export function shiftIconClass(code) {
  return SHIFT_ICONS[code] || "fa-solid fa-clock";
}

/**
 * Migrates legacy entries (where "HOL" used to be stored as a shift value)
 * into the current model: { shift: N/M/OC/S/G/DO/null, isHoliday: bool }.
 */
export function normalizeEntry(entry) {
  if (!entry) return null;
  if (entry.shift === "HOL") {
    return { shift: null, isHoliday: true };
  }
  return {
    shift: entry.shift || null,
    isHoliday: !!entry.isHoliday,
    start: entry.start,
    end: entry.end,
  };
}
