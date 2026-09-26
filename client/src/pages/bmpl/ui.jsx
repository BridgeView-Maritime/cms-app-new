// client/src/pages/bmpl/ui.jsx
// Small shared pieces for the BMPL back-office pages.
import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, FileText, Inbox, Download } from 'lucide-react';
import { fmtDate, fmtMoney, isOn, downloadCsvByPaging } from './api';
import { AUTH_ENDPOINTS } from '../../config/api';
import CalendarPicker from '../../components/CalendarPicker';

// Files referenced by legacy rows live under the old site's upload folders,
// which were not migrated. Show the name; link only when a URL is known.
export function FileCell({ value }) {
  if (!value) return <span className="bm-muted">—</span>;
  const name = String(value).split('/').pop();
  return <span className="bm-file" title={String(value)}><FileText size={12} /> {name.length > 34 ? name.slice(0, 32) + '…' : name}</span>;
}

export function StatusCell({ value }) {
  const on = isOn(value);
  return <span className={'bm-pill ' + (on ? 'bm-pill-good' : 'bm-pill-muted')}>{on ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {on ? 'Yes' : 'No'}</span>;
}

/** Renders one cell according to the column definition. */
export function Cell({ column, row }) {
  const raw = row[column.key];
  if (column.type === 'lookup') {
    const shown = row._display?.[column.key];
    return shown ? <span title={'id ' + raw}>{shown}</span> : <span className="bm-muted">—</span>;
  }
  // The legacy lists showed the candidate behind an INDOS number as one
  // stacked cell (name, then rank and passport underneath).
  if (column.type === 'person') {
    const p = row._person;
    if (!p) return <span className="bm-muted">—</span>;
    return (
      <span>
        <strong>{p.name}</strong>
        {(p.rankname || p.passport) && <div className="bm-muted">{[p.rankname, p.passport].filter(Boolean).join(' · ')}</div>}
      </span>
    );
  }
  if (column.type === 'count') {
    const n = row._counts?.[column.key] ?? 0;
    return n ? <span className="bm-num">{n}</span> : <span className="bm-muted">0</span>;
  }
  if (column.type === 'date') { const s = fmtDate(raw); return s ? s : <span className="bm-muted">—</span>; }
  if (column.type === 'datetime') { const s = fmtDate(raw, true); return s ? s : <span className="bm-muted">—</span>; }
  if (column.type === 'money') { const s = fmtMoney(raw); return s ? <span className="bm-num">{s}</span> : <span className="bm-muted">—</span>; }
  if (column.type === 'status') return <StatusCell value={raw} />;
  if (column.type === 'file') return <FileCell value={raw} />;
  if (column.type === 'encoded' || column.type === 'longtext') {
    const s = String(raw ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return s ? <span title={s}>{s.length > 90 ? s.slice(0, 88) + '…' : s}</span> : <span className="bm-muted">—</span>;
  }
  const s = raw === null || raw === undefined ? '' : String(raw).trim();
  return s ? <span>{s.length > 80 ? s.slice(0, 78) + '…' : s}</span> : <span className="bm-muted">—</span>;
}

export function Pager({ page, totalPages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="bm-pager">
      <span className="bm-muted">{total.toLocaleString()} record{total === 1 ? '' : 's'} · page {page} of {totalPages}</span>
      <div className="bm-pager-btns">
        <button type="button" className="bm-btn bm-btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /> Prev</button>
        <button type="button" className="bm-btn bm-btn-ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next <ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

export function Empty({ title = 'Nothing here', text }) {
  return (
    <div className="bm-empty">
      <Inbox size={26} />
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}

export function Alert({ msg }) {
  if (!msg) return null;
  return <div className={'bm-alert bm-alert-' + (msg.type || 'info')}>{msg.text}</div>;
}

/** A labelled input driven by a form-field definition. */
export function FormField({ field, value, onChange, options, disabled }) {
  const common = { value: value ?? '', onChange: (e) => onChange(field.key, e.target.value), disabled };
  let control;
  if (field.type === 'textarea') control = <textarea rows={field.encoded ? 8 : 3} {...common} />;
  else if (field.type === 'select') {
    control = (
      <select {...common}>
        <option value="">-- Select --</option>
        {(field.options || []).map((o, i) => <option key={o} value={o}>{field.labels ? field.labels[i] : o}</option>)}
        {value && !(field.options || []).includes(String(value)) && <option value={value}>{value}</option>}
      </select>
    );
  } else if (field.type === 'lookup') {
    const opts = options || [];
    control = (
      <select {...common}>
        <option value="">-- Select --</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        {value && !opts.some((o) => String(o.value) === String(value)) && <option value={value}>{value}</option>}
      </select>
    );
  } else if (field.type === 'date') {
    control = <CalendarPicker value={value} onChange={(v) => onChange(field.key, v)} disabled={disabled} prefix="bm" placeholder={field.placeholder || 'Select date'} />;
  } else if (field.type === 'number') control = <input type="number" step="any" {...common} />;
  else control = <input type="text" {...common} />;
  return (
    <label className={'bm-field' + (field.type === 'textarea' ? ' bm-field-wide' : '')}>
      <span>{field.label}{field.required && ' *'}</span>
      {control}
    </label>
  );
}

export const uploadsUrl = (p) => (p ? AUTH_ENDPOINTS.REACT_APP_API_URL + '/uploads/' + p : null);

/**
 * "Download Excel" for a workflow page: pages through the page's own endpoint
 * with the filters currently on screen and saves a CSV.
 */
export function ExportButton({ path, params, columns, name, disabled, onDone }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button" className="bm-btn" disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        const r = await downloadCsvByPaging(path, params, columns, name);
        setBusy(false);
        if (onDone) onDone(r.ok ? { type: 'success', text: 'Exported ' + r.rows.toLocaleString() + ' rows.' + (r.truncated ? ' The file stops at the first 5,000 - narrow the filters for the rest.' : '') } : { type: 'error', text: r.message });
      }}
    >
      <Download size={14} /> {busy ? 'Exporting…' : 'CSV'}
    </button>
  );
}

/**
 * The legacy CV screens searched field by field rather than with one box.
 * This is that panel: a row of small labelled inputs, applied on submit.
 */
export function FieldSearch({ fields, value, onApply, extra }) {
  const [open, setOpen] = React.useState(() => Object.values(value || {}).some(Boolean));
  const [draft, setDraft] = React.useState(value || {});
  React.useEffect(() => { setDraft(value || {}); }, [value]);
  const active = Object.entries(value || {}).filter(([, v]) => v).length;
  return (
    <div className="bm-fieldsearch">
      <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide detailed search' : 'Detailed search'}{active ? ' · ' + active : ''}
      </button>
      {open && (
        <form
          className="bm-fieldsearch-grid"
          onSubmit={(e) => { e.preventDefault(); onApply(draft); }}
        >
          {fields.map((f) => (
            <label key={f.key} className="bm-field">
              <span>{f.label}</span>
              {f.type === 'date'
                ? <CalendarPicker value={draft[f.key] || ''} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} prefix="bm" size="sm" />
                : <input type="text" value={draft[f.key] || ''} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} placeholder={f.placeholder || ''} />}
            </label>
          ))}
          {extra}
          <div className="bm-form-actions">
            <button type="submit" className="bm-btn bm-btn-primary bm-btn-sm">Search</button>
            <button type="button" className="bm-btn bm-btn-ghost bm-btn-sm" onClick={() => { const cleared = Object.fromEntries(fields.map((f) => [f.key, ''])); setDraft(cleared); onApply(cleared); }}>Clear</button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Does a declarative action apply to this row? Mirrors actionAllowed() on the server. */
export function actionApplies(action, row) {
  if (!action.when) return true;
  const v = String(row?.[action.when.field] ?? '').trim();
  if (action.when.equals !== undefined) return v === String(action.when.equals);
  if (action.when.not !== undefined) return v !== String(action.when.not);
  if (action.when.empty) return v === '';
  if (action.when.notEmpty) return v !== '';
  return true;
}

/**
 * The per-row buttons the legacy lists carried ("Click here to approve",
 * "Cancel this nedpass"). An action with `ask` fields opens a small prompt
 * first; one with `confirm` asks before firing.
 */
export function RowActions({ actions, row, busy, onRun, size = 'sm' }) {
  const [asking, setAsking] = React.useState(null);
  const [answers, setAnswers] = React.useState({});
  const usable = (actions || []).filter((a) => actionApplies(a, row));
  if (usable.length === 0) return <span className="bm-muted">—</span>;
  const start = (a) => {
    if (a.ask?.length) { setAnswers({}); setAsking(a); return; }
    if (a.confirm && !window.confirm(a.confirm)) return;
    onRun(a);
  };
  return (
    <div className="bm-inline">
      {usable.map((a) => (
        <button key={a.key} type="button" className={'bm-btn bm-btn-' + size + ' ' + (a.key === 'cancel' ? 'bm-btn-danger' : 'bm-btn-ghost')} disabled={busy} onClick={() => start(a)}>{a.label}</button>
      ))}
      {asking && (
        <form
          className="bm-ask"
          onSubmit={async (e) => { e.preventDefault(); if (asking.confirm && !window.confirm(asking.confirm)) return; const ok = await onRun(asking, answers); if (ok !== false) setAsking(null); }}
        >
          {asking.ask.map((f) => (
            <input key={f.key} type="text" className="bm-select" placeholder={f.label} value={answers[f.key] || ''} onChange={(e) => setAnswers((x) => ({ ...x, [f.key]: e.target.value }))} autoFocus={f === asking.ask[0]} />
          ))}
          <button type="submit" className="bm-btn bm-btn-sm bm-btn-primary" disabled={busy}>{asking.label}</button>
          <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" onClick={() => setAsking(null)}>Cancel</button>
        </form>
      )}
    </div>
  );
}
