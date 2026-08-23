import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const MAX_VISIBLE_ROWS = 6;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (value) => String(value).padStart(2, "0");

const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateKey = (dateKey) => {
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const isSameDate = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (dateKey) => {
  if (!dateKey) return "Select date";

  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

const formatEarnedDate = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

const getCompOffReason = (entry, dayOfWeek) => {
  const weekend = dayOfWeek === 0 || dayOfWeek === 6;
  const holiday = Boolean(entry.isHoliday);

  if (weekend && holiday) return "Weekend + Holiday";
  if (holiday) return "Holiday";

  return "Weekend";
};

/* =====================================================
   CUSTOM CALENDAR DATE PICKER
   (grafted in from the other version — replaces the
   native <input type="date"> picker)
===================================================== */

function DatePicker({ value, disabled, onChange }) {
  const [open, setOpen] = useState(false);

  const initialDate = parseDateKey(value) || new Date();

  const [viewDate, setViewDate] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  // pickerRef wraps only the trigger button — the popover itself is
  // portaled to <body>, so outside-click detection has to check both.
  const pickerRef = useRef(null);
  const popoverRef = useRef(null);

  // Computed on open (and kept in sync on resize/scroll) so the popover
  // is always placed fully inside the viewport — never pushes page
  // height and never runs off the bottom/side of the screen.
  const [popoverStyle, setPopoverStyle] = useState({
    top: 0,
    left: 0,
    visibility: "hidden",
  });

  useEffect(() => {
    const handlePointerDown = (event) => {
      const insideTrigger =
        pickerRef.current && pickerRef.current.contains(event.target);

      const insidePopover =
        popoverRef.current && popoverRef.current.contains(event.target);

      if (!insideTrigger && !insidePopover) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const margin = 8;

    const reposition = () => {
      const trigger = pickerRef.current;
      const popover = popoverRef.current;

      if (!trigger || !popover) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();

      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;

      const spaceBelow = viewportHeight - triggerRect.bottom - margin;
      const spaceAbove = triggerRect.top - margin;

      const openUp =
        spaceBelow < popoverRect.height && spaceAbove > spaceBelow;

      let top = openUp
        ? triggerRect.top - popoverRect.height - margin
        : triggerRect.bottom + margin;

      // Clamp so the popover always stays fully within the viewport,
      // even if there isn't quite enough room on either side.
      top = Math.min(
        Math.max(top, margin),
        Math.max(viewportHeight - popoverRect.height - margin, margin)
      );

      let left = triggerRect.right - popoverRect.width;

      left = Math.min(
        Math.max(left, margin),
        Math.max(viewportWidth - popoverRect.width - margin, margin)
      );

      setPopoverStyle({ top, left, visibility: "visible" });
    };

    // Measure after the popover has actually rendered so we know its
    // real height (varies with content), then keep it pinned to the
    // trigger as the page scrolls or the window resizes.
    reposition();

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, viewDate]);

  useEffect(() => {
    if (!open) return;

    const selectedDate = parseDateKey(value) || new Date();

    setViewDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    );
  }, [open, value]);

  const openPicker = () => {
    if (disabled) return;

    setOpen((current) => {
      const next = !current;

      if (!next) {
        // Reset so the popover is hidden again until it's repositioned
        // the next time it opens.
        setPopoverStyle((style) => ({ ...style, visibility: "hidden" }));
      }

      return next;
    });
  };

  const closePicker = () => {
    setOpen(false);
    setPopoverStyle((style) => ({ ...style, visibility: "hidden" }));
  };

  const changeMonth = (amount) => {
    setViewDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1)
    );
  };

  const selectDate = (date) => {
    onChange(toDateKey(date));
    closePicker();
  };

  const selectToday = () => {
    const today = new Date();

    onChange(toDateKey(today));

    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

    closePicker();
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const selectedDate = parseDateKey(value);
  const today = new Date();

  const calendarDays = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(
      <span key={`empty-${i}`} className="ledger-calendar-empty" />
    );
  }

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);

    const selected = isSameDate(date, selectedDate);
    const isToday = isSameDate(date, today);

    calendarDays.push(
      <button
        type="button"
        key={day}
        className={[
          "ledger-calendar-day",
          selected ? "is-selected" : "",
          isToday ? "is-today" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => selectDate(date)}
      >
        {day}
      </button>
    );
  }

  return (
    <div
      ref={pickerRef}
      className={`ledger-date-picker${disabled ? " disabled" : ""}`}
    >
      <button
        type="button"
        className={`ledger-date-trigger${value ? " has-value" : ""}${
          open ? " is-open" : ""
        }`}
        onClick={openPicker}
        disabled={disabled}
        aria-label="Select redeemed date"
        aria-expanded={open}
      >
        <i className="fa-regular fa-calendar" aria-hidden="true" />

        <span className="ledger-date-text">{formatDate(value)}</span>

        <i
          className="fa-solid fa-chevron-down ledger-date-chevron"
          aria-hidden="true"
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="ledger-calendar-popover"
            style={{
              position: "fixed",
              top: popoverStyle.top,
              left: popoverStyle.left,
              right: "auto",
              visibility: popoverStyle.visibility,
            }}
          >
          <div className="ledger-calendar-header">
            <button
              type="button"
              className="ledger-calendar-nav"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>

            <div className="ledger-calendar-title">
              <span>{MONTHS[month]}</span>

              <strong>{year}</strong>
            </div>

            <button
              type="button"
              className="ledger-calendar-nav"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </div>

          <div className="ledger-calendar-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="ledger-calendar-days">{calendarDays}</div>

            <div className="ledger-calendar-footer">
              <button type="button" onClick={selectToday}>
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function LedgerRow({ row, onToggle, onDateChange }) {
  return (
    <div className="comp-ledger-row">
      <div className="ledger-earned-date">
        <span>{row.displayDate}</span>
      </div>

      <div className="ledger-reason">{row.reason}</div>

      <div className="ledger-redeem">
        <input
          type="checkbox"
          className="ledger-check"
          checked={row.used}
          onChange={(event) => onToggle(row, event.target.checked)}
          title="Mark comp-off as redeemed"
          aria-label={`Mark ${row.displayDate} as redeemed`}
        />

        <DatePicker
          value={row.redeemedDate}
          disabled={!row.used}
          onChange={(newDate) => onDateChange(row, newDate)}
        />
      </div>
    </div>
  );
}

export default function CompOffLedger({ monthCache, usage, onToggleUsed }) {
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const result = [];

    Object.entries(monthCache || {}).forEach(([monthKey, monthData]) => {
      const [year, month] = monthKey.split("_").map(Number);

      Object.entries(monthData || {}).forEach(([day, entry]) => {
        if (!entry?.shift || entry.shift === "DO") {
          return;
        }

        const dayNumber = Number(day);

        const date = new Date(year, month - 1, dayNumber);

        const dayOfWeek = date.getDay();

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = Boolean(entry.isHoliday);

        if (!isWeekend && !isHoliday) {
          return;
        }

        const dateKey = `${year}-${String(month).padStart(
          2,
          "0"
        )}-${String(dayNumber).padStart(2, "0")}`;

        const usageInfo = usage?.[dateKey];

        const used =
          typeof usageInfo === "object"
            ? Boolean(usageInfo?.used)
            : Boolean(usageInfo);

        const redeemedDate =
          typeof usageInfo === "object" ? usageInfo?.redeemedDate || "" : "";

        result.push({
          dateKey,
          date,
          displayDate: formatEarnedDate(dateKey),
          reason: getCompOffReason(entry, dayOfWeek),
          used,
          redeemedDate,
        });
      });
    });

    return result.sort((a, b) => b.date - a.date);
  }, [monthCache, usage]);

  const earnedCount = rows.length;
  const usedCount = rows.filter((row) => row.used).length;
  const balance = earnedCount - usedCount;

  const visibleRows = rows.slice(0, MAX_VISIBLE_ROWS);
  const hiddenCount = Math.max(0, rows.length - MAX_VISIBLE_ROWS);

  const handleToggle = async (row, checked) => {
    const redeemedDate = checked
      ? row.redeemedDate || new Date().toISOString().slice(0, 10)
      : "";

    await onToggleUsed(row.dateKey, checked, redeemedDate);
  };

  const handleDateChange = async (row, newDate) => {
    if (!row.used || !newDate) return;

    await onToggleUsed(row.dateKey, true, newDate);
  };

  return (
    <>
      <style>{`
        /* =====================================================
           PANEL FIX
        ===================================================== */

        .comp-off-ledger {
          width: 100%;
          min-width: 0 !important;

          align-self: start !important;
          justify-self: stretch;

          height: fit-content !important;
          min-height: 0 !important;
          max-height: none !important;

          flex: 0 0 auto !important;

          block-size: fit-content !important;
        }

        /* ---------- SUMMARY ---------- */

        .comp-off-ledger .co-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }

        .comp-off-ledger .co-summary div {
          min-width: 0;
        }

        /* =====================================================
           DESKTOP TABLE
        ===================================================== */

        .comp-ledger-head,
        .comp-ledger-row {
          display: grid;
          grid-template-columns:
            minmax(135px, 1fr) minmax(78px, 0.65fr) minmax(0, 1.15fr);
          column-gap: clamp(10px, 1.4vw, 16px);
          min-width: 0;
        }

        .comp-ledger-head {
          align-items: center;
          padding: 0 8px 10px;
          border-bottom: 1px solid var(--line);
        }

        .comp-ledger-head span {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--muted);
        }

        .comp-ledger-list {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .comp-ledger-row {
          align-items: center;
          padding: 14px 8px;
          border-bottom: 1px solid var(--line);
        }

        .comp-ledger-row:last-child {
          border-bottom: none;
        }

        /* ---------- EARNED DATE ---------- */

        .ledger-earned-date {
          display: flex;
          align-items: center;
          min-width: 0;
          color: var(--text);
        }

        .ledger-earned-date span {
          min-width: 0;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.35;
          letter-spacing: -0.1px;
        }

        /* ---------- REASON ---------- */

        .ledger-reason {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          max-width: 100%;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(142, 185, 252, 0.07);
          border: 1px solid rgba(142, 185, 252, 0.12);
          color: var(--muted);
          font-size: 10px;
          white-space: nowrap;
        }

        /* ---------- REDEEM ---------- */

        .ledger-redeem {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .ledger-check {
          appearance: none;
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          margin: 0;
          flex: 0 0 16px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.18);
          cursor: pointer;
          display: grid;
          place-content: center;
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .ledger-check::after {
          content: "";
          width: 5px;
          height: 8px;
          border: solid var(--on-accent);
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) translate(-1px, -1px) scale(0);
          transition: transform 0.14s ease;
        }

        .ledger-check:checked {
          background: var(--accent);
        }

        .ledger-check:checked::after {
          transform: rotate(45deg) translate(-1px, -1px) scale(1);
        }

        .ledger-check:hover {
          transform: scale(1.08);
        }

        .ledger-check:focus-visible {
          outline: 2px solid rgba(142, 185, 252, 0.35);
          outline-offset: 3px;
        }

        /* ======================================
           CUSTOM DATE PICKER
        ====================================== */

        .ledger-date-picker {
          position: relative;
          width: min(148px, 100%);
          min-width: 0;
          flex: 1 1 auto;
        }

        .ledger-date-trigger {
          width: 100%;
          height: 36px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.035);
          color: var(--muted);
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.18s ease, background 0.18s ease;
        }

        .ledger-date-trigger:hover:not(:disabled),
        .ledger-date-trigger.is-open {
          border-color: rgba(142, 185, 252, 0.5);
          background: rgba(142, 185, 252, 0.06);
        }

        .ledger-date-trigger.has-value {
          color: var(--text);
        }

        .ledger-date-trigger > .fa-calendar {
          flex: 0 0 auto;
          font-size: 11px;
          color: var(--accent);
        }

        .ledger-date-text {
          min-width: 0;
          flex: 1;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .ledger-date-chevron {
          flex: 0 0 auto;
          font-size: 8px;
          opacity: 0.65;
        }

        .ledger-date-picker.disabled .ledger-date-trigger {
          opacity: 0.42;
          cursor: not-allowed;
        }

        /* ---------- CALENDAR POPOVER ---------- */

        .ledger-calendar-popover {
          /* position/top/left are set inline in JS (portaled to
             <body> and positioned to stay fully within the viewport) */
          z-index: 2000;
          width: 260px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          background: linear-gradient(
            145deg,
            rgba(30, 32, 38, 0.99),
            rgba(18, 19, 23, 0.99)
          );
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.02);
          animation: ledger-picker-in 0.16s ease;
        }

        @keyframes ledger-picker-in {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .ledger-calendar-header {
          display: grid;
          grid-template-columns: 32px minmax(0, 1fr) 32px;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .ledger-calendar-nav {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          padding: 0;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
          color: var(--muted);
          font-size: 10px;
          cursor: pointer;
          transition: color 0.18s ease, border-color 0.18s ease,
            background 0.18s ease;
        }

        .ledger-calendar-nav:hover {
          color: var(--accent);
          border-color: rgba(142, 185, 252, 0.45);
          background: rgba(142, 185, 252, 0.08);
        }

        .ledger-calendar-title {
          display: flex;
          justify-content: center;
          align-items: baseline;
          gap: 7px;
          min-width: 0;
          color: var(--text);
        }

        .ledger-calendar-title span {
          font-size: 12px;
          font-weight: 700;
        }

        .ledger-calendar-title strong {
          font-size: 11px;
          color: var(--muted);
        }

        .ledger-calendar-weekdays,
        .ledger-calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }

        .ledger-calendar-weekdays {
          margin-bottom: 5px;
        }

        .ledger-calendar-weekdays span {
          display: grid;
          place-items: center;
          height: 26px;
          color: var(--muted);
          font-size: 9px;
          font-weight: 700;
        }

        .ledger-calendar-days {
          gap: 3px;
        }

        .ledger-calendar-day,
        .ledger-calendar-empty {
          aspect-ratio: 1;
          min-width: 0;
        }

        .ledger-calendar-day {
          display: grid;
          place-items: center;
          padding: 0;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text);
          font-family: inherit;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease,
            transform 0.15s ease;
        }

        .ledger-calendar-day:hover {
          background: rgba(142, 185, 252, 0.1);
          color: var(--accent);
          transform: scale(1.04);
        }

        .ledger-calendar-day.is-today {
          box-shadow: inset 0 0 0 1px rgba(142, 185, 252, 0.45);
          color: var(--accent);
        }

        .ledger-calendar-day.is-selected {
          background: var(--accent);
          color: var(--on-accent);
          box-shadow: 0 5px 14px rgba(142, 185, 252, 0.2);
        }

        .ledger-calendar-day.is-selected:hover {
          color: var(--on-accent);
          background: var(--accent);
        }

        .ledger-calendar-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--line);
        }

        .ledger-calendar-footer button {
          border: none;
          background: transparent;
          padding: 5px 7px;
          color: var(--accent);
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        /* =====================================================
           SHOW ALL BUTTON
        ===================================================== */

        .comp-ledger-more {
          width: 100%;
          margin-top: 12px;
          padding: 10px 12px;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.025);
          color: var(--accent);
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease;
        }

        .comp-ledger-more:hover {
          background: rgba(142, 185, 252, 0.08);
          border-color: rgba(142, 185, 252, 0.35);
        }

        /* =====================================================
           EMPTY
        ===================================================== */

        .comp-ledger-empty {
          padding: 26px 8px 8px;
          color: var(--muted);
          font-size: 12px;
          text-align: center;
        }

        /* =====================================================
           MODAL
        ===================================================== */

        .comp-ledger-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(6px);
        }

        .comp-ledger-modal {
          width: min(760px, 100%);
          max-height: min(80vh, 760px);
          overflow: auto;
          padding: 22px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
        }

        .comp-ledger-modal-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .comp-ledger-modal-title {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--text);
        }

        .comp-ledger-modal-close {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.035);
          color: var(--muted);
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }

        .comp-ledger-modal-close:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.07);
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 1000px) {
          .comp-ledger-head,
          .comp-ledger-row {
            grid-template-columns:
              minmax(125px, 1fr) minmax(70px, 0.6fr) minmax(0, 1fr);
            column-gap: 10px;
          }

          .ledger-date-picker {
            width: 100%;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 700px) {
          .comp-off-ledger {
            height: auto !important;
            align-self: auto !important;
          }

          .comp-off-ledger .co-summary {
            gap: 7px;
            margin-bottom: 18px;
          }

          .comp-ledger-head {
            display: none;
          }

          .comp-ledger-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            grid-template-areas:
              "earned reason"
              "redeem redeem";
            row-gap: 12px;
            column-gap: 10px;
            padding: 16px 0;
            border-bottom: 1px solid var(--line);
          }

          .comp-ledger-row:last-child {
            border-bottom: none;
          }

          .ledger-earned-date {
            grid-area: earned;
          }

          .ledger-earned-date span {
            font-size: 12px;
            font-weight: 750;
          }

          .ledger-reason {
            grid-area: reason;
            justify-self: end;
          }

          .ledger-redeem {
            grid-area: redeem;
            display: grid;
            grid-template-columns: 18px minmax(0, 1fr);
            align-items: center;
            gap: 10px;
            width: 100%;
            min-width: 0;
          }

          .ledger-redeem::before {
            content: "REDEEMED";
            grid-column: 1 / -1;
            margin-bottom: -2px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1.1px;
            color: var(--muted);
          }

          .ledger-date-picker {
            width: 100%;
            min-width: 0;
          }

          .ledger-date-trigger {
            width: 100%;
            height: 40px;
            font-size: 12px;
          }

          .ledger-calendar-popover {
            width: min(260px, calc(100vw - 40px));
          }

          .comp-ledger-modal {
            padding: 18px;
          }
        }

        /* =====================================================
           SMALL DEVICES
        ===================================================== */

        @media (max-width: 420px) {
          .comp-off-ledger .co-summary {
            gap: 6px;
          }

          .comp-off-ledger .co-summary div {
            padding-left: 9px;
            padding-right: 9px;
          }

          .comp-ledger-row {
            row-gap: 10px;
          }

          .ledger-earned-date span {
            font-size: 11px;
          }

          .ledger-reason {
            font-size: 9px;
            padding: 4px 7px;
          }

          .ledger-date-trigger {
            height: 38px;
            padding: 0 8px;
            font-size: 11px;
          }

        }

        /* =====================================================
           ULTRA NARROW
        ===================================================== */

        @media (max-width: 330px) {
          .comp-ledger-row {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas:
              "earned"
              "reason"
              "redeem";
            row-gap: 8px;
          }

          .ledger-reason {
            justify-self: start;
          }

          .comp-off-ledger .co-summary {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>

      <section className="panel comp-off-ledger">
        <h2>Comp-Off Ledger</h2>

        <div className="co-summary">
          <div>
            <b>{earnedCount}</b>
            Earned
          </div>

          <div>
            <b>{usedCount}</b>
            Used
          </div>

          <div>
            <b>{balance}</b>
            Balance
          </div>
        </div>

        {rows.length > 0 ? (
          <>
            <div className="comp-ledger-head">
              <span>Earned</span>
              <span>Reason</span>
              <span>Redeemed</span>
            </div>

            <div className="comp-ledger-list">
              {visibleRows.map((row) => (
                <LedgerRow
                  key={row.dateKey}
                  row={row}
                  onToggle={handleToggle}
                  onDateChange={handleDateChange}
                />
              ))}
            </div>

            {hiddenCount > 0 && (
              <button
                type="button"
                className="comp-ledger-more"
                onClick={() => setShowAll(true)}
              >
                View all {rows.length} comp-off entries
              </button>
            )}
          </>
        ) : (
          <div className="comp-ledger-empty">No comp-off entries yet.</div>
        )}
      </section>

      {showAll && (
        <div
          className="comp-ledger-modal-backdrop"
          onMouseDown={() => setShowAll(false)}
        >
          <div
            className="comp-ledger-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="comp-ledger-modal-top">
              <h3 className="comp-ledger-modal-title">
                All Comp-Off Entries
              </h3>

              <button
                type="button"
                className="comp-ledger-modal-close"
                onClick={() => setShowAll(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="comp-ledger-head">
              <span>Earned</span>
              <span>Reason</span>
              <span>Redeemed</span>
            </div>

            <div className="comp-ledger-list">
              {rows.map((row) => (
                <LedgerRow
                  key={row.dateKey}
                  row={row}
                  onToggle={handleToggle}
                  onDateChange={handleDateChange}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}