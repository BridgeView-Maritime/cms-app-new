// client/src/components/candidate/DateField.jsx
// A calendar picker for every date on the candidate pages. Values in and
// out are plain 'YYYY-MM-DD' strings (or ''), exactly what the API stores,
// so it drops in where <input type="date"> was. Month and year are
// dropdowns in the header so a date of birth or a ten-year expiry is a
// couple of clicks away rather than a hundred arrow presses.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Accepts 'YYYY-MM-DD' and full ISO datetimes (Registration dates arrive as
// the latter). Legacy sentinels like '0000-00-00' / '1000-01-01' are "not set".
const parse = (v) => {
  if (!v) return null;
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? dayjs(s) : dayjs(s.length >= 10 ? s : null);
  return d.isValid() && d.year() > 1901 ? d : null;
};

export default function DateField({ value, onChange, disabled = false, placeholder = 'Select date', minYear = 1940, maxYear }) {
  const selected = parse(value);
  const today = dayjs();
  const lastYear = maxYear || today.year() + 15;

  const [open, setOpen] = useState(false);
  // The month currently shown: the selected date's month, else today's.
  const [view, setView] = useState(() => (selected || today).startOf('month'));
  const rootRef = useRef(null);

  useEffect(() => {
    if (open) setView((selected || today).startOf('month'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on a click anywhere else, or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const years = useMemo(() => {
    const out = [];
    for (let y = lastYear; y >= minYear; y--) out.push(y);
    return out;
  }, [minYear, lastYear]);

  // 6 rows x 7 days, starting on the Monday on or before the 1st.
  const cells = useMemo(() => {
    const first = view.startOf('month');
    const offset = (first.day() + 6) % 7; // dayjs: 0 = Sunday
    const start = first.subtract(offset, 'day');
    return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'));
  }, [view]);

  const pick = (d) => { onChange(d.format('YYYY-MM-DD')); setOpen(false); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); };

  return (
    <div className={'cp-date' + (open ? ' cp-date-open' : '')} ref={rootRef}>
      <button
        type="button"
        className="cp-input-wrap cp-input-plain cp-date-display"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={selected ? '' : 'cp-date-placeholder'}>
          {selected ? selected.format('DD MMM YYYY') : placeholder}
        </span>
        {selected && !disabled && (
          <span className="cp-date-clear" role="button" aria-label="Clear date" onClick={clear}>
            <X size={13} />
          </span>
        )}
        <Calendar size={15} />
      </button>

      {/* The field lives inside a <label>; without preventDefault, a click on
          a non-interactive part of the popover is forwarded to the display
          button and closes the picker. */}
      {open && (
        <div className="cp-datepicker" role="dialog" aria-label="Choose a date" onClick={(e) => e.preventDefault()}>
          <div className="cp-datepicker-head">
            <button type="button" className="cp-datepicker-nav" onClick={() => setView(view.subtract(1, 'month'))} aria-label="Previous month">
              <ChevronLeft size={15} />
            </button>
            <select value={view.month()} onChange={(e) => setView(view.month(Number(e.target.value)))} aria-label="Month">
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={view.year()} onChange={(e) => setView(view.year(Number(e.target.value)))} aria-label="Year">
              {!years.includes(view.year()) && <option value={view.year()}>{view.year()}</option>}
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" className="cp-datepicker-nav" onClick={() => setView(view.add(1, 'month'))} aria-label="Next month">
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="cp-datepicker-grid">
            {WEEKDAYS.map((w) => <span key={w} className="cp-datepicker-dow">{w}</span>)}
            {cells.map((d) => {
              const inMonth = d.month() === view.month();
              const isSel = selected && d.isSame(selected, 'day');
              const isToday = d.isSame(today, 'day');
              return (
                <button
                  type="button"
                  key={d.format('YYYY-MM-DD')}
                  className={'cp-datepicker-day' + (inMonth ? '' : ' cp-datepicker-out') + (isSel ? ' cp-datepicker-sel' : '') + (isToday ? ' cp-datepicker-today' : '')}
                  onClick={() => pick(d)}
                >
                  {d.date()}
                </button>
              );
            })}
          </div>

          <div className="cp-datepicker-foot">
            <button type="button" className="cp-inline-link" onClick={() => pick(today)}>Today</button>
            {selected && <button type="button" className="cp-inline-link cp-datepicker-clearbtn" onClick={clear}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}
