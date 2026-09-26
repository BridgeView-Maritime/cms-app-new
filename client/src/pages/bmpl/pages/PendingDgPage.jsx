// client/src/pages/bmpl/pages/PendingDgPage.jsx
// "Pending Issues with DG" - crew records whose DG Shipping / RPSL entries
// are wrong and await correction (crew_dg_data).
import React, { useEffect, useState } from 'react';
import { Search, Plus, X, Pencil, Save, Trash2, Upload, FileText, Download } from 'lucide-react';
import { bmpl, fmtDate, fmtMoney } from '../api';
import { Pager, Empty, Alert, FormField } from '../ui';
import { AUTH_ENDPOINTS } from '../../../config/api';
import { downloadCsv } from './ReportsPage';

const FIELDS = (statuses) => [
  { key: 'crew_name', label: 'Crew name', required: true }, { key: 'indos_no', label: 'INDOS' }, { key: 'cdc_indos_no', label: 'CDC no.' },
  { key: 'record_date', label: 'Record date', type: 'date' }, { key: 'dgs_status', label: 'DGS status', type: 'select', options: statuses },
  { key: 'correction_amount', label: 'Correction fee', type: 'number' }, { key: 'bharat_kosh_transaction_id', label: 'Bharat Kosh transaction id' },
  { key: 'wrong_update_in_dgrpsl', label: 'Wrong entry on DG / RPSL', type: 'textarea' }, { key: 'correct_data', label: 'Correct data', type: 'textarea' },
];
const pill = (s) => 'bm-pill ' + (s === 'Corrected' ? 'bm-pill-good' : s === 'Submitted' ? 'bm-pill-info' : s === 'Rejected' ? 'bm-pill-bad' : 'bm-pill-warn');

export default function PendingDgPage() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | _id
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  const load = () => bmpl('/pending-dg', { params: { q, status, page, limit: 25 } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [q, status, page]);
  const done = (d, ok) => { setBusy(false); if (d.success) { setEditing(null); if (ok) setMsg({ type: 'success', text: ok }); load(); } else setMsg({ type: 'error', text: d.message }); };
  const save = async (e) => { e.preventDefault(); setBusy(true); setMsg(null); done(editing === 'new' ? await bmpl('/pending-dg', { method: 'POST', body: draft }) : await bmpl('/pending-dg/' + editing, { method: 'PUT', body: draft }), 'Saved.'); };
  const remove = async (r) => { if (!window.confirm('Delete the record for ' + r.crew_name + '?')) return; setBusy(true); done(await bmpl('/pending-dg/' + r._id, { method: 'DELETE' }), 'Deleted.'); };
  const upload = async (r, file) => { setBusy(true); const fd = new FormData(); fd.append('file', file); done(await bmpl('/pending-dg/' + r._id + '/document', { method: 'POST', body: fd }), 'Document uploaded.'); };
  const statuses = data?.statuses || ['Pending', 'Submitted', 'Corrected', 'Rejected'];
  const totals = Object.fromEntries((data?.totals || []).map((t) => [t._id, t]));

  return (
    <div>
      <div className="bm-page-head">
        <div><h1>Pending Issues with DG</h1><p>Crew whose DG Shipping / RPSL records need correction, the fee paid on Bharat Kosh and the DGS outcome.</p></div>
        <div className="bm-actions">
          {data?.records?.length > 0 && <button type="button" className="bm-btn" onClick={() => downloadCsv('pending-dg', data.records, [{ key: 'crew_name', label: 'Crew' }, { key: 'indos_no', label: 'INDOS' }, { key: 'cdc_indos_no', label: 'CDC' }, { key: 'wrong_update_in_dgrpsl', label: 'Wrong entry' }, { key: 'correct_data', label: 'Correct data' }, { key: 'correction_amount', label: 'Fee' }, { key: 'bharat_kosh_transaction_id', label: 'Bharat Kosh id' }, { key: 'dgs_status', label: 'Status' }, { key: 'record_date', label: 'Date' }])}><Download size={14} /> CSV</button>}
          <button type="button" className="bm-btn bm-btn-primary" onClick={() => { setDraft({ dgs_status: 'Pending', record_date: new Date().toISOString().slice(0, 10) }); setEditing(editing === 'new' ? null : 'new'); }}><Plus size={15} /> New record</button>
        </div>
      </div>
      <Alert msg={msg} />
      {data && <div className="bm-tiles">{statuses.map((s) => <button key={s} type="button" className="bm-tile" onClick={() => { setStatus(status === s ? '' : s); setPage(1); }} style={status === s ? { outline: '2px solid var(--chart-accent)' } : undefined}><span>{s}</span><strong>{totals[s]?.n || 0}</strong>{totals[s]?.amount ? <small>₹ {fmtMoney(totals[s].amount)} in fees</small> : null}</button>)}</div>}
      {editing && (
        <form onSubmit={save} className="bm-card">
          <h2 className="bm-h2">{editing === 'new' ? 'New DG issue' : 'Edit DG issue'}</h2>
          <div className="bm-form-grid">{FIELDS(statuses).map((f) => <FormField key={f.key} field={f} value={draft[f.key]} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} disabled={busy} />)}</div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary" disabled={busy}><Save size={14} /> Save</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setEditing(null)}><X size={14} /> Cancel</button></div>
        </form>
      )}
      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Crew, INDOS, CDC, transaction id, text" /></div>
        <select className="bm-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All · Status</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No DG issues recorded" text="Add one with “New record”." /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>#</th><th>Crew</th><th>INDOS / CDC</th><th>Wrong entry</th><th>Correct data</th><th>Fee</th><th>Bharat Kosh</th><th>Status</th><th>Date</th><th>Document</th><th></th></tr></thead>
            <tbody>{data.records.map((r) => (
              <tr key={r._id}>
                <td>{r.id}</td><td><strong>{r.crew_name}</strong><div className="bm-muted">{r.user}</div></td><td>{r.indos_no}<div className="bm-muted">{r.cdc_indos_no}</div></td>
                <td className="bm-td-wrap">{r.wrong_update_in_dgrpsl}</td><td className="bm-td-wrap">{r.correct_data}</td><td className="bm-td-money">{r.correction_amount ? fmtMoney(r.correction_amount) : ''}</td><td>{r.bharat_kosh_transaction_id}</td>
                <td><span className={pill(r.dgs_status)}>{r.dgs_status}</span></td><td className="bm-td-date">{fmtDate(r.record_date)}</td>
                <td>{r.documentUrl ? <a className="bm-link" href={AUTH_ENDPOINTS.REACT_APP_API_URL + r.documentUrl} target="_blank" rel="noreferrer"><FileText size={12} /> view</a> : <span className="bm-muted">—</span>} <label className="bm-btn bm-btn-sm bm-btn-ghost" title="Upload document"><Upload size={12} /><input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(r, f); e.target.value = ''; }} /></label></td>
                <td className="bm-inline"><button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" onClick={() => { setDraft(Object.fromEntries(FIELDS(statuses).map((f) => [f.key, r[f.key] ?? '']))); setEditing(r._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={12} /></button><button type="button" className="bm-btn bm-btn-sm bm-btn-ghost bm-btn-danger" disabled={busy} onClick={() => remove(r)}><Trash2 size={12} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
