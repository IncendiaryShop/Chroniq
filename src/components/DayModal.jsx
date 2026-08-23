import { useEffect, useState } from "react";
import { dateKey, iterateDateRange } from "../utils/dateUtils";
import { NON_WORKING, normalizeEntry } from "../utils/shiftUtils";

export default function DayModal({
  open,
  day,
  current,
  entryData,
  defaults,
  onSave,
  onClear,
  onClose,
  onRangePreviewChange,
}) {
  const [shift, setShift] = useState("");
  const [isHoliday, setIsHoliday] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [rangeApply, setRangeApply] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedIso =
    open && day != null ? dateKey(current.getFullYear(), current.getMonth() + 1, day) : "";

  // Populate the form whenever a new day is opened.
  useEffect(() => {
    if (!open || day == null) return;
    const entry = normalizeEntry(entryData) || {};
    setShift(entry.shift || "");
    setIsHoliday(!!entry.isHoliday);
    setRangeApply(false);
    setRangeStart(selectedIso);
    setRangeEnd(selectedIso);
    if (entry.shift && NON_WORKING.indexOf(entry.shift) === -1) {
      setStartTime(entry.start || "");
      setEndTime(entry.end || "");
    } else {
      setStartTime("");
      setEndTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, day]);

  // Live-preview which calendar cells the range would apply to.
  useEffect(() => {
    if (!open) {
      onRangePreviewChange(new Set());
      return;
    }
    if (!rangeApply || !rangeStart || !rangeEnd || rangeStart > rangeEnd) {
      onRangePreviewChange(new Set());
      return;
    }
    const monthPrefix = dateKey(current.getFullYear(), current.getMonth() + 1, 1).slice(0, 7);
    if (rangeStart.slice(0, 7) !== monthPrefix) {
      onRangePreviewChange(new Set());
      return;
    }
    const startDay = parseInt(rangeStart.slice(-2), 10);
    const endDay =
      rangeEnd.slice(0, 7) === rangeStart.slice(0, 7) ? parseInt(rangeEnd.slice(-2), 10) : 31;
    const days = new Set();
    for (let n = startDay; n <= endDay; n++) days.add(n);
    onRangePreviewChange(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rangeApply, rangeStart, rangeEnd, current]);

  if (!open) return null;

  const handleShiftChange = (val) => {
    setShift(val);
    if (val && NON_WORKING.indexOf(val) === -1 && defaults[val]) {
      setStartTime(defaults[val].start);
      setEndTime(defaults[val].end);
    } else {
      setStartTime("");
      setEndTime("");
    }
  };

  const computeKeys = () => {
    if (rangeApply) {
      if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return null;
      return iterateDateRange(rangeStart, rangeEnd);
    }
    return [selectedIso];
  };

  const handleSave = async () => {
    const data =
      !shift && !isHoliday
        ? null
        : {
            shift: shift || null,
            isHoliday,
            start: shift && NON_WORKING.indexOf(shift) === -1 ? startTime : "",
            end: shift && NON_WORKING.indexOf(shift) === -1 ? endTime : "",
          };
    const keys = computeKeys();
    if (!keys) {
      alert("Choose a valid start and end date.");
      return;
    }
    setSaving(true);
    try {
      await onSave(keys, data);
      onClose();
    } catch (e) {
      alert("Could not save the selected date range: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    const keys = computeKeys();
    if (!keys) {
      alert("Choose a valid start and end date.");
      return;
    }
    setSaving(true);
    try {
      await onClear(keys);
      onClose();
    } catch (e) {
      alert("Could not clear the selected date range: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>{day ? new Date(current.getFullYear(), current.getMonth(), day).toDateString() : "—"}</h3>

        <div className="field">
          <label htmlFor="shiftSelect">Shift</label>
          <select
            id="shiftSelect"
            value={shift}
            onChange={(e) => handleShiftChange(e.target.value)}
          >
            <option value="">— none —</option>
            <option value="N">N — Night</option>
            <option value="M">M — Morning</option>
            <option value="OC">OC</option>
            <option value="S">S — Second</option>
            <option value="G">G — General</option>
            <option value="DO">Day Off (non-working)</option>
          </select>
        </div>

        <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            id="holidayCheck"
            style={{ width: "auto" }}
            checked={isHoliday}
            onChange={(e) => setIsHoliday(e.target.checked)}
          />
          <label
            htmlFor="holidayCheck"
            style={{
              margin: 0,
              textTransform: "none",
              fontSize: 13,
              color: "var(--text)",
              letterSpacing: "normal",
            }}
          >
            This day is a Holiday
          </label>
        </div>

        <div className="field timerow">
          <div style={{ flex: 1 }}>
            <label htmlFor="startTime">Start</label>
            <input
              type="time"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="endTime">End</label>
            <input
              type="time"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="range-toggle">
          <label htmlFor="rangeApply">
            <i className="fa-solid fa-calendar-week" aria-hidden="true"></i> Apply to a date range
          </label>
          <input
            type="checkbox"
            id="rangeApply"
            checked={rangeApply}
            onChange={(e) => setRangeApply(e.target.checked)}
          />
        </div>

        <div className={`range-field${rangeApply ? " show" : ""}`}>
          <div>
            <label htmlFor="rangeStart">From</label>
            <input
              type="date"
              id="rangeStart"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="rangeEnd">To</label>
            <input
              type="date"
              id="rangeEnd"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </div>
        </div>

        {rangeApply && (
          <div className="range-hint">
            Select a continuous range to apply the same shift, holiday setting and timings to
            every date.
          </div>
        )}

        <div className="modalbtns">
          <button className="btn-clear" onClick={handleClear} disabled={saving}>
            Clear
          </button>
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
