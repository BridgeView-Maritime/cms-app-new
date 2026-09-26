// client/src/pages/bmpl/pages/CandidatesPage.jsx
// "View Candidate CV" - the crewing-side candidate master (37k records).
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, X } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, FormField, ExportButton, FieldSearch } from '../ui';

const NEW_FIELDS = [
  { key: 'name', label: 'Full name', required: true }, { key: 'email', label: 'Email', required: true }, { key: 'mobile', label: 'Mobile' },
  { key: 'indosno', label: 'INDOS' }, { key: 'passport', label: 'Passport' }, { key: 'rankname', label: 'Rank' },
  { key: 'cvcategory', label: 'CV category', type: 'select', options: ['Marine', 'Offshore', 'Onshore'] },
  { key: 'purpose', label: 'Purpose', type: 'select', options: ['Job', 'Enquiry', 'Other'] },
  { key: 'cdc', label: 'CDC' }, { key: 'coc', label: 'COC' }, { key: 'salary', label: 'Expected salary' },
];

const EXPORT_COLUMNS = [{ key: 'name', label: 'Name' }, { key: 'rankname', label: 'Rank' }, { key: 'indosno', label: 'INDOS' }, { key: 'passport', label: 'Passport' }, { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' }, { key: 'cdcNumber', label: 'CDC' }, { key: 'coc', label: 'COC' }, { key: 'shiptype', label: 'Vessel type' }, { key: 'cvcategory', label: 'Category' }, { key: 'type', label: 'Source' }, { label: 'Added', get: (r) => fmtDate(r.doe) }];

export default function CandidatesPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [qInput, setQInput] = useState(sp.get('q') || '');
  const [q, setQ] = useState(sp.get('q') || '');
  const [filters, setFilters] = useState({ rankname: '', purpose: '', type: '', cvcategory: '' });
  const [fieldSearch, setFieldSearch] = useState({ name: '', indosno: '', passport: '', email: '', mobile: '', rank: '', shiptype: '', skills: '', from: '', to: '' });
  const [opts, setOpts] = useState({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { bmpl('/candidates/filters').then((d) => { if (d.success) setOpts(d); }); }, []);
  useEffect(() => {
    let cancelled = false;
    bmpl('/candidates', { params: { q, page, limit: 25, ...filters, ...fieldSearch } }).then((d) => { if (cancelled) return; if (d.success) setData(d); else setMsg({ type: 'error', text: d.message }); });
    return () => { cancelled = true; };
  }, [q, page, filters, fieldSearch]);

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const hasFilters = Boolean(q) || Object.values(filters).some(Boolean) || Object.values(fieldSearch).some(Boolean);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const d = await bmpl('/candidates', { method: 'POST', body: draft });
    setBusy(false);
    if (d.success) navigate('/dashboard/bmpl/candidates/' + d.candidate._id); else setMsg({ type: 'error', text: d.message });
  };

  return (
    <div>
      <div className="bm-page-head">
        <div><h1>View Candidate CV</h1><p>Every seafarer on the crewing register. Search by name, email, INDOS, passport or mobile.</p></div>
<div className="bm-actions"><ExportButton path={'/candidates'} params={{ q, ...filters, ...fieldSearch }} columns={EXPORT_COLUMNS} name={'candidates'} disabled={!data?.total} onDone={setMsg} /><button type="button" className="bm-btn bm-btn-primary" onClick={() => setAdding((a) => !a)}><Plus size={15} /> Add candidate</button></div></div>
      <Alert msg={msg} />

      {adding && (
        <form onSubmit={create} className="bm-card">
          <div className="bm-form-grid">{NEW_FIELDS.map((f) => <FormField key={f.key} field={f} value={draft[f.key]} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} disabled={busy} />)}</div>
          <div className="bm-form-actions">
            <button type="submit" className="bm-btn bm-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add candidate'}</button>
            <button type="button" className="bm-btn bm-btn-ghost" onClick={() => setAdding(false)}><X size={14} /> Cancel</button>
          </div>
        </form>
      )}

      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Name, email, INDOS, passport, mobile" /></div>
        {[['rankname', 'Rank'], ['cvcategory', 'Category'], ['purpose', 'Purpose'], ['type', 'Source']].map(([k, label]) => (
          <select key={k} className="bm-select" value={filters[k]} onChange={(e) => setFilter(k, e.target.value)}>
            <option value="">All · {label}</option>
            {(opts[k] || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {hasFilters && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => { setQInput(''); setFilters({ rankname: '', purpose: '', type: '', cvcategory: '' }); setFieldSearch(Object.fromEntries(Object.keys(fieldSearch).map((k) => [k, '']))); }}><X size={14} /> Clear</button>}
      </div>
      <FieldSearch
        fields={[{ key: 'name', label: 'Name' }, { key: 'indosno', label: 'INDOS' }, { key: 'passport', label: 'Passport' }, { key: 'email', label: 'Email' }, { key: 'mobile', label: 'Mobile' }, { key: 'rank', label: 'Rank' }, { key: 'shiptype', label: 'Ship type (from CV)' }, { key: 'skills', label: 'Skills (from CV)' }, { key: 'from', label: 'Added from', type: 'date' }, { key: 'to', label: 'Added to', type: 'date' }]}
        value={fieldSearch}
        onApply={(v) => { setFieldSearch(v); setPage(1); }}
      />

      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No candidates match" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Full name</th><th>Email id</th><th>Contact</th><th>Indos no</th><th>Passport</th><th>CDC</th><th>COC</th><th>Rank</th><th>Vessel type</th><th>CV</th><th>Photo</th><th>Sign</th><th>Category</th><th>Source</th><th>Added</th></tr></thead>
            <tbody>
              {data.records.map((r) => (
                <tr key={r._id} className="bm-row-link" onClick={() => navigate('/dashboard/bmpl/candidates/' + r._id)}>
                  <td><strong>{r.name}</strong></td><td>{r.email}</td><td>{r.mobile}</td><td>{r.indosno}</td><td>{r.passport}</td><td>{r.cdcNumber}</td><td>{r.coc}</td><td>{r.rankname}</td><td>{r.shiptype}</td>
                  <td>{r.hasCv ? <span className="bm-pill bm-pill-good">Yes</span> : <span className="bm-muted">—</span>}</td>
                  <td>{r.hasPhoto ? <span className="bm-pill bm-pill-good">Yes</span> : <span className="bm-muted">—</span>}</td>
                  <td>{r.hasSign ? <span className="bm-pill bm-pill-good">Yes</span> : <span className="bm-muted">—</span>}</td>
                  <td>{r.cvcategory}</td><td>{r.type}</td><td className="bm-td-date">{fmtDate(r.doe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
