import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { monthKey } from "../utils/dateUtils";
import { FALLBACK_DEFAULTS, SHIFT_KEYS } from "../utils/shiftUtils";

/**
 * Loads and mutates a signed-in user's shift entries, shift defaults and
 * comp-off usage from Supabase, and exposes everything the calendar,
 * comp-off ledger and modals need.
 */
export function useShiftData(user) {
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // monthCache: "YYYY_M" -> { [day]: { shift, isHoliday, start, end } }
  const [monthCache, setMonthCache] = useState({});

  const [defaults, setDefaults] = useState(FALLBACK_DEFAULTS);

  // usage: "YYYY-MM-DD" -> { used: boolean, redeemedDate: string|null }
  const [usage, setUsage] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const savedTimer = useRef(null);

  const flashSaved = useCallback(() => {
    setSaved(true);

    clearTimeout(savedTimer.current);

    savedTimer.current = setTimeout(() => {
      setSaved(false);
    }, 900);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const nextMonthCache = {};

      const shifts = await supabase
        .from("shift_entries")
        .select(
          "work_date,shift_code,start_time,end_time,is_holiday"
        )
        .eq("user_id", user.id);

      if (shifts.error) throw shifts.error;

      (shifts.data || []).forEach((r) => {
        const dt = r.work_date.split("-");

        const mk =
          parseInt(dt[0], 10) +
          "_" +
          parseInt(dt[1], 10);

        if (!nextMonthCache[mk]) {
          nextMonthCache[mk] = {};
        }

        nextMonthCache[mk][
          String(parseInt(dt[2], 10))
        ] = {
          shift: r.shift_code,
          isHoliday: !!r.is_holiday,
          start: (r.start_time || "").slice(0, 5),
          end: (r.end_time || "").slice(0, 5),
        };
      });

      const defs = await supabase
        .from("shift_defaults")
        .select("shift_code,start_time,end_time")
        .eq("user_id", user.id);

      if (defs.error) throw defs.error;

      const nextDefaults = {
        ...FALLBACK_DEFAULTS,
      };

      (defs.data || []).forEach((r) => {
        nextDefaults[r.shift_code] = {
          start: (r.start_time || "").slice(0, 5),
          end: (r.end_time || "").slice(0, 5),
        };
      });

      const usageRes = await supabase
        .from("comp_off_usage")
        .select("work_date,used,redeemed_date")
        .eq("user_id", user.id);

      if (usageRes.error) throw usageRes.error;

      const nextUsage = {};

      (usageRes.data || []).forEach((r) => {
        nextUsage[r.work_date] = {
          used: !!r.used,
          redeemedDate: r.redeemed_date || null,
        };
      });

      setMonthCache(nextMonthCache);
      setDefaults(nextDefaults);
      setUsage(nextUsage);
    } catch (e) {
      setError(
        e.message || "Could not load your tracker data."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);

  const saveEntryForDate = useCallback(
    async (dkey, data) => {
      if (!data) {
        const del = await supabase
          .from("shift_entries")
          .delete()
          .eq("user_id", user.id)
          .eq("work_date", dkey);

        if (del.error) throw del.error;
      } else {
        const row = {
          user_id: user.id,
          work_date: dkey,
          shift_code: data.shift,
          is_holiday: !!data.isHoliday,
          start_time: data.start || null,
          end_time: data.end || null,
        };

        const up = await supabase
          .from("shift_entries")
          .upsert(row, {
            onConflict: "user_id,work_date",
          });

        if (up.error) throw up.error;
      }
    },
    [user]
  );

  /**
   * Applies data, or clears when data is null,
   * to every date key in keys.
   */
  const applyToDates = useCallback(
    async (keys, data) => {
      for (let i = 0; i < keys.length; i++) {
        await saveEntryForDate(keys[i], data);
      }

      await load();
      flashSaved();
    },
    [saveEntryForDate, load, flashSaved]
  );

  const saveUsageValue = useCallback(
    async (dkey, used, redeemedDate) => {
      if (used) {
        if (!redeemedDate) {
          throw new Error(
            "Select the date on which this comp-off was redeemed."
          );
        }

        const up = await supabase
          .from("comp_off_usage")
          .upsert(
            {
              user_id: user.id,
              work_date: dkey,
              used: true,
              redeemed_date: redeemedDate,
            },
            {
              onConflict: "user_id,work_date",
            }
          );

        if (up.error) throw up.error;

        setUsage((prev) => ({
          ...prev,
          [dkey]: {
            used: true,
            redeemedDate,
          },
        }));
      } else {
        const del = await supabase
          .from("comp_off_usage")
          .delete()
          .eq("user_id", user.id)
          .eq("work_date", dkey);

        if (del.error) throw del.error;

        setUsage((prev) => {
          const next = { ...prev };

          delete next[dkey];

          return next;
        });
      }

      flashSaved();
    },
    [user, flashSaved]
  );

  const saveDefaultsToDb = useCallback(
    async (defs) => {
      const rows = SHIFT_KEYS.map((code) => ({
        user_id: user.id,
        shift_code: code,
        start_time: defs[code].start,
        end_time: defs[code].end,
      }));

      const up = await supabase
        .from("shift_defaults")
        .upsert(rows, {
          onConflict: "user_id,shift_code",
        });

      if (up.error) throw up.error;

      setDefaults(defs);
      flashSaved();
    },
    [user, flashSaved]
  );

  // Previous month navigation
  const goToPrevMonth = useCallback(() => {
    setCurrent((c) => {
      const d = new Date(c);

      d.setMonth(d.getMonth() - 1);
      d.setDate(1);

      return d;
    });
  }, []);

  // Next month navigation
  const goToNextMonth = useCallback(() => {
    setCurrent((c) => {
      const d = new Date(c);

      d.setMonth(d.getMonth() + 1);
      d.setDate(1);

      return d;
    });
  }, []);

  // Direct month selection
  const goToMonth = useCallback((selectedMonth) => {
    setCurrent((c) => {
      return new Date(
        c.getFullYear(),
        selectedMonth,
        1
      );
    });
  }, []);

  // Direct year selection
  const goToYear = useCallback((selectedYear) => {
    setCurrent((c) => {
      return new Date(
        selectedYear,
        c.getMonth(),
        1
      );
    });
  }, []);

  const monthData =
    monthCache[monthKey(current)] || {};

  const allMonthKeys = Object.keys(monthCache).map((k) => {
    const p = k.split("_");

    return {
      y: parseInt(p[0], 10),
      m: parseInt(p[1], 10),
      key: k,
    };
  });

  return {
    current,

    // Calendar navigation
    goToPrevMonth,
    goToNextMonth,

    // Direct selectors
    goToMonth,
    goToYear,

    monthCache,
    monthData,
    allMonthKeys,

    defaults,
    usage,

    loading,
    error,
    saved,

    applyToDates,
    saveUsageValue,
    saveDefaultsToDb,

    reload: load,
  };
}