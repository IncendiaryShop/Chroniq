import { useEffect, useRef, useState } from "react";
import {
  DOW,
  daysInMonth,
  firstDowOfMonth,
} from "../utils/dateUtils";

import {
  NON_WORKING,
  SHIFT_KEYS,
  SHIFT_LABELS,
  normalizeEntry,
  shiftIconClass,
} from "../utils/shiftUtils";

import CalendarCell from "./CalendarCell";

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

export default function Calendar({
  current,
  monthData,
  defaults,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onSelectYear,
  onOpenSettings,
  onDayClick,
  rangePreviewDays,
}) {
  const [picker, setPicker] = useState(null);
  const [yearInput, setYearInput] = useState("");
  const pickerRef = useRef(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDow = firstDowOfMonth(year, month);
  const totalDays = daysInMonth(year, month);

  const today = new Date();

  const isCurrentMonth =
    today.getFullYear() === year &&
    today.getMonth() === month;

  // Keep the input synced whenever the calendar year changes.
  useEffect(() => {
    setYearInput(String(year));
  }, [year]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target)
      ) {
        setPicker(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPicker(null);
      }
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  const handleMonthSelect = (selectedMonth) => {
    onSelectMonth(selectedMonth);
    setPicker(null);
  };

  const handleYearSelect = (selectedYear) => {
    const nextYear = Number(selectedYear);

    if (
      !Number.isInteger(nextYear) ||
      nextYear < 1 ||
      nextYear > 9999
    ) {
      setYearInput(String(year));
      return;
    }

    onSelectYear(nextYear);
    setYearInput(String(nextYear));
    setPicker(null);
  };

  const handleYearInputChange = (event) => {
    // Allow only numbers.
    const value = event.target.value.replace(/\D/g, "");

    setYearInput(value);
  };

  const handleYearInputKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      handleYearSelect(yearInput);
    }

    if (event.key === "Escape") {
      setYearInput(String(year));
      setPicker(null);
    }
  };


  const openYearPicker = () => {
    setPicker((value) => {
      const nextValue =
        value === "year" ? null : "year";

      if (nextValue === "year") {
        setYearInput(String(year));
      }

      return nextValue;
    });
  };

  // Nearby quick-select years.
  const nearbyYears = [
    year - 2,
    year - 1,
    year,
    year + 1,
    year + 2,
  ];

  const cells = [];

  // Empty cells before the first day.
  for (let i = 0; i < firstDow; i++) {
    cells.push(
      <div
        className="cell empty"
        key={`empty-${i}`}
      />
    );
  }

  // Calendar days.
  for (let day = 1; day <= totalDays; day++) {
    const dow = new Date(
      year,
      month,
      day
    ).getDay();

    const entry = normalizeEntry(
      monthData[day]
    );

    const isCurrentDay =
      isCurrentMonth &&
      today.getDate() === day;

    cells.push(
      <CalendarCell
        key={day}
        day={day}
        dow={dow}
        entry={entry}
        isCurrentDay={isCurrentDay}
        highlighted={
          rangePreviewDays?.has(day) ?? false
        }
        onClick={() => onDayClick(day)}
      />
    );
  }

  return (
    <>
      <div className="monthbar">

        {/* Previous month */}
        <button
          className="month-nav"
          onClick={onPrevMonth}
          aria-label="Previous month"
          title="Previous month"
        >
          <i
            className="fa-solid fa-chevron-left"
            aria-hidden="true"
          />
        </button>

        {/* Month + Year selectors */}
        <div
          className="date-selectors"
          ref={pickerRef}
        >
          {/* Month picker */}
          <div className="picker-anchor">
            <button
              type="button"
              className={`date-selector ${
                picker === "month"
                  ? "is-open"
                  : ""
              }`}
              onClick={() =>
                setPicker((value) =>
                  value === "month"
                    ? null
                    : "month"
                )
              }
              aria-haspopup="listbox"
              aria-expanded={
                picker === "month"
              }
            >
              <span>
                {MONTHS[month]}
              </span>

              <i
                className="fa-solid fa-chevron-down"
                aria-hidden="true"
              />
            </button>

            {picker === "month" && (
              <div
                className="picker-popover month-picker"
                role="listbox"
                aria-label="Select month"
              >
                {MONTHS.map(
                  (monthName, index) => (
                    <button
                      type="button"
                      key={monthName}
                      className={
                        index === month
                          ? "is-selected"
                          : ""
                      }
                      onClick={() =>
                        handleMonthSelect(index)
                      }
                      role="option"
                      aria-selected={
                        index === month
                      }
                    >
                      {monthName.slice(0, 3)}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Flexible year picker */}
          <div className="picker-anchor">
            <button
              type="button"
              className={`date-selector year-selector ${
                picker === "year"
                  ? "is-open"
                  : ""
              }`}
              onClick={openYearPicker}
              aria-haspopup="dialog"
              aria-expanded={
                picker === "year"
              }
            >
              <span>{year}</span>

              <i
                className="fa-solid fa-chevron-down"
                aria-hidden="true"
              />
            </button>

            {picker === "year" && (
              <div
                className="picker-popover year-picker"
                role="dialog"
                aria-label="Select year"
              >


                {/* Direct year input */}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="4"
                  value={yearInput}
                  onChange={handleYearInputChange}
                  onKeyDown={
                    handleYearInputKeyDown
                  }
                  placeholder="Enter year"
                  aria-label="Enter year"
                />

                {/* Quick nearby years */}
                <div className="nearby-years">
                  {nearbyYears.map(
                    (yearValue) => (
                      <button
                        type="button"
                        key={yearValue}
                        className={
                          yearValue === year
                            ? "is-selected"
                            : ""
                        }
                        onClick={() =>
                          handleYearSelect(
                            yearValue
                          )
                        }
                      >
                        {yearValue}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next month */}
        <button
          className="month-nav"
          onClick={onNextMonth}
          aria-label="Next month"
          title="Next month"
        >
          <i
            className="fa-solid fa-chevron-right"
            aria-hidden="true"
          />
        </button>

        {/* Settings */}
        <button
          className="settingsbtn"
          onClick={onOpenSettings}
          title="Shift timings"
          aria-label="Shift timings"
        >
          <i
            className="fa-solid fa-gear"
            aria-hidden="true"
          />
        </button>

      </div>

      {/* Shift legend */}
      <div className="legend">
        {SHIFT_KEYS.concat(["DO"]).map(
          (code) => (
            <div
              className="chip"
              key={code}
            >
              <i
                className={`shift-icon ${shiftIconClass(
                  code
                )}`}
                style={{
                  color: `var(--${code})`,
                }}
                aria-hidden="true"
              />

              {SHIFT_LABELS[code]}

              {NON_WORKING.indexOf(code) === -1
                ? ` ${defaults[code].start}–${defaults[code].end}`
                : ""}
            </div>
          )
        )}

        <div className="chip">
          <i
            className="fa-solid fa-calendar-day shift-icon"
            style={{
              color: "var(--HOL)",
            }}
            aria-hidden="true"
          />

          Holiday marker — can combine with any shift
        </div>
      </div>

      {/* Day names */}
      <div className="grid">
        {DOW.map((d) => (
          <div
            className="dow"
            key={d}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="grid">
        {cells}
      </div>
    </>
  );
}