// client/src/pages/bmpl/BmplRecordPage.jsx
// Detail + edit for one record of a declarative resource. The form covers
// the fields the resource declares editable; everything else on the row is
// shown read-only underneath so nothing the old system stored is hidden.
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Pencil, X, Archive, RotateCcw, Trash2, Printer } from 'lucide-react';
import { bmpl, fmtDate, fmtMoney } from './api';
import { FormField, Alert, Empty, FileCell, StatusCell, RowActions } from './ui';
import { useBmpl } from './BmplModule';
import BmplListPage from './BmplListPage';

const humanKey = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const isDateLike = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
const isZero = (v) => v === null || v === undefined || String(v).trim() === '' || /^(0000-00-00|1000-01-01|1000-10-10)/.test(String(v));

export default function BmplRecordPage() {
  const { resource: key, id } = useParams();
  const isNew = id === 'new';
  const { resources } = useBmpl();
  const def = resources[key];
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(isNew);
  const [options, setOptions] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!def) return;
    if (def.form?.some((f) => f.type === 'lookup')) {
      bmpl('/r/' + key + '/filter-options').then((d) => { if (d.success) setOptions(d.formOptions || {}); });
    }
  }, [key, def]);

  // `def` comes from the module's context, whose identity changes whenever the
  // module reloads its menu. Rebuilding the draft on that would wipe whatever
  // the user has typed, so the record is prepared once per key/id.
  const preparedFor = useRef(null);
  useEffect(() => {
    if (!def) return;
    const token = key + '/' + id;
    if (preparedFor.current === token) return;
    preparedFor.current = token;
    if (isNew) { setRecord({}); setDraft(Object.fromEntries((def.form || []).map((f) => [f.key, '']))); return; }
    bmpl('/r/' + key + '/' + id).then((d) => {
      if (d.success) { setRecord(d.record); setDraft(Object.fromEntries((def.form || []).map((f) => [f.key, d.record[f.key] ?? '']))); }
      else setMsg({ type: 'error', text: d.message });
    });
  }, [key, id, isNew, def]);

  if (!def) return <Empty title="Section not available" />;
  if (!record || !draft) return <div className="bm-loading">Loading…</div>;

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const d = isNew ? await bmpl('/r/' + key, { method: 'POST', body: draft }) : await bmpl('/r/' + key + '/' + id, { method: 'PUT', body: draft });
    setBusy(false);
    if (!d.success) { setMsg({ type: 'error', text: d.message }); return; }
    if (isNew) { navigate('/dashboard/bmpl/r/' + key + '/' + d.record._id, { replace: true }); return; }
    setRecord(d.record); setEditing(false); setMsg({ type: 'success', text: d.message });
  };

  const setStatus = async (active) => {
    if (!window.confirm(active ? 'Reactivate this record?' : 'Deactivate this record? It will disappear from the active list.')) return;
    setBusy(true);
    const d = await bmpl('/r/' + key + '/' + id + '/status', { method: 'POST', body: { active } });
    setBusy(false);
    setMsg({ type: d.success ? 'success' : 'error', text: d.message });
    if (d.success) setRecord((r) => ({ ...r, [def.statusField]: active ? '1' : '0' }));
  };

  // The per-row buttons the legacy detail pages carried (approve, cancel, mark paid).
  const runAction = async (action, body) => {
    setBusy(true); setMsg(null);
    const d = await bmpl('/r/' + key + '/' + id + '/action/' + action.key, { method: 'POST', body: body || {} });
    setBusy(false);
    if (!d.success) { setMsg({ type: 'error', text: d.message }); return false; }
    setMsg({ type: 'success', text: d.message });
    const fresh = await bmpl('/r/' + key + '/' + id);
    if (fresh.success) setRecord(fresh.record);
    return true;
  };

  const remove = async () => {
    if (!window.confirm('Delete this record permanently?')) return;
    setBusy(true);
    const d = await bmpl('/r/' + key + '/' + id, { method: 'DELETE' });
    setBusy(false);
    if (d.success) navigate('/dashboard/bmpl/r/' + key); else setMsg({ type: 'error', text: d.message });
  };

  // Title: first text column that has a value.
  const titleCol = (def.columns || []).find((c) => c.type !== 'status' && record[c.key]);
  const titleText = isNew ? 'New ' + def.title : (titleCol ? (titleCol.type === 'lookup' ? record._display?.[titleCol.key] : String(record[titleCol.key])) : def.title);
  const formKeys = new Set((def.form || []).map((f) => f.key));
  const hiddenKeys = new Set(['_id', '__v', '_mysqlId', '_display', ...(def.hiddenFields || [])]);
  const otherEntries = Object.entries(record).filter(([k, v]) => !hiddenKeys.has(k) && !formKeys.has(k) && !isZero(v));
  const isActive = def.statusField ? String(record[def.statusField]) === '1' : null;

  return (
    <div>
      <div className="bm-page-head">
        <div>
          <Link to={'/dashboard/bmpl/r/' + key} className="bm-back"><ArrowLeft size={14} /> {def.title}</Link>
          <h1>{titleText}</h1>
        </div>
        <div className="bm-actions">
          {!isNew && def.editable && !editing && <button type="button" className="bm-btn bm-btn-primary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>}
          {!isNew && def.statusField && isActive && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => setStatus(false)} disabled={busy}><Archive size={14} /> Deactivate</button>}
          {!isNew && def.statusField && !isActive && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => setStatus(true)} disabled={busy}><RotateCcw size={14} /> Reactivate</button>}
          {!isNew && def.deletable && <button type="button" className="bm-btn bm-btn-danger" onClick={remove} disabled={busy}><Trash2 size={14} /> Delete</button>}
          {!isNew && <button type="button" className="bm-btn" onClick={() => window.print()}><Printer size={14} /> Print</button>}
        </div>
      </div>

      {!isNew && def.actions?.length > 0 && (
        <div className="bm-row-actions bm-screen-only">
          <span className="bm-muted">Actions</span>
          <RowActions actions={def.actions} row={record} busy={busy} onRun={runAction} size="sm" />
        </div>
      )}

      <Alert msg={msg} />

      {editing && def.form?.length > 0 && (
        <form onSubmit={save} className="bm-card">
          <div className="bm-form-grid">
            {def.form.map((f) => <FormField key={f.key} field={f} value={draft[f.key]} onChange={setField} options={options[f.key]} disabled={busy} />)}
          </div>
          <div className="bm-form-actions">
            <button type="submit" className="bm-btn bm-btn-primary" disabled={busy}><Save size={14} /> {busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="bm-btn bm-btn-ghost" onClick={() => (isNew ? navigate(-1) : setEditing(false))} disabled={busy}><X size={14} /> Cancel</button>
          </div>
        </form>
      )}

      {!editing && (
        <div className="bm-card">
          <dl className="bm-dl">
            {(def.form || []).map((f) => {
              const v = record[f.key];
              let shown;
              if (f.type === 'lookup') shown = record._display?.[f.key] || (v ? String(v) : '');
              else if (f.type === 'date') shown = fmtDate(v);
              else if (f.type === 'number') shown = fmtMoney(v);
              else if (f.type === 'select' && f.labels) { const i = (f.options || []).indexOf(String(v)); shown = i >= 0 ? f.labels[i] : String(v ?? ''); }
              else shown = v === null || v === undefined ? '' : String(v);
              return (
                <div key={f.key} className={'bm-dl-row' + (f.type === 'textarea' ? ' bm-dl-wide' : '')}>
                  <dt>{f.label}</dt>
                  <dd>{f.encoded ? <div className="bm-html" dangerouslySetInnerHTML={{ __html: shown }} /> : shown ? <span className="bm-pre">{shown}</span> : <span className="bm-muted">—</span>}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {!isNew && otherEntries.length > 0 && (
        <details className="bm-card bm-details">
          <summary>All fields on record ({otherEntries.length})</summary>
          <dl className="bm-dl bm-dl-dense">
            {otherEntries.map(([k, v]) => (
              <div key={k} className="bm-dl-row">
                <dt>{humanKey(k)}</dt>
                <dd>
                  {def.lookups?.[k] ? (record._display?.[k] || String(v))
                    : /upload|file|screenshot|scrnshot|document|attach|image|photo|\.pdf$|\.jpg$/i.test(k + String(v)) && String(v).length < 200 ? <FileCell value={v} />
                    : /^(status|approval|verify|confirm|is_|has_)/.test(k) && /^(0|1)$/.test(String(v)) ? <StatusCell value={v} />
                    : isDateLike(v) ? (fmtDate(v, String(v).length > 10) || String(v))
                    : <span className="bm-pre">{String(v).length > 400 ? String(v).slice(0, 400) + '…' : String(v)}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {!isNew && (def.related || []).map((rel) => (
        <div className="bm-card" key={rel.key}>
          <h2 className="bm-h2">{rel.title}</h2>
          <BmplListPage resourceKey={rel.resource} embedded by={rel.field} byValue={record[rel.match]} />
        </div>
      ))}
    </div>
  );
}
