import { isWeekend } from "../utils/dateUtils";
import { SHIFT_KEYS, SHIFT_LABELS, shiftIconClass } from "../utils/shiftUtils";

export default function CalendarCell({ day, dow, entry, isCurrentDay, highlighted, onClick }) {
  let earnsComp = false;
  if (entry && entry.shift && SHIFT_KEYS.indexOf(entry.shift) !== -1) {
    if (isWeekend(dow) || entry.isHoliday) earnsComp = true;
  }

  const classes = ["cell"];
  if (isWeekend(dow)) classes.push("weekend");
  if (isCurrentDay) classes.push("current-day");
  if (earnsComp) classes.push("comp");
  if (entry && entry.isHoliday) classes.push("holiday");
  if (highlighted) classes.push("range-preview");

  return (
    <div className={classes.join(" ")} onClick={onClick}>
      <div className="datenum">{day}</div>
      {entry && entry.shift ? (
        <div className="badge" title={SHIFT_LABELS[entry.shift] || entry.shift}>
          <i
            className={`shift-icon ${shiftIconClass(entry.shift)}`}
            style={{ color: `var(--${entry.shift})` }}
            aria-hidden="true"
          ></i>
          {entry.shift}
        </div>
      ) : entry && entry.isHoliday ? (
        <div className="holidaytag">
          <i className="fa-solid fa-calendar-day" aria-hidden="true"></i> HOLIDAY
        </div>
      ) : null}
    </div>
  );
}
