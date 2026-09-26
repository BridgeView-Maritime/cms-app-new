// client/src/pages/bmpl/pages/PooledCrewPage.jsx
// "Pooled Crew" - the available pool. The old page built this from the
// contract history rather than a table of its own: every seafarer whose last
// contract ended and who is not on board now, with the details the crewing
// team needs to call them back (availability, visa, next of kin).
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Save, Pencil } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, ExportButton } from '../ui';
import CalendarPicker from '../../../components/CalendarPicker';

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Crew name' }, { key: 'vcan_id', label: 'INDOS no' }, { key: 'rank', label: 'Rank' },
  { key: 'passport', label: 'Passport' }, { key: 'cdc', label: 'CDC' }, { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' },
  { key: 'company', label: 'Company name' }, { key: 'vessel', label: 'Vessel name' }, { key: 'crewOfficer', label: 'Crew officer' },
  { label: 'Signed on', get: (r) => fmtDate(r.signondate) }, { label: 'Signed off', get: (r) => fmtDate(r.signoffdate) },
  { label: 'Available from', get: (r) => fmtDate(r.davailable) }, { key: 'reason', label: 'Sign-off reason' },
  { key: 'residenceVisa', label: 'Residence visa' }, { key: 'seaServiceRemark', label: 'Seaservice remark' },
  { key: 'nok', label: 'NOK' }, { key: 'relation', label: 'Relation' }, { key: 'nokdetails', label: 'NOK details' },
];

export default function PooledCrewPage() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ company_name: '', rank_id: '', from: '', to: '' });
  const [opts, setOpts] = useState({ company: [] });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null); // row being given an availability date
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { bmpl('/vacancies/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  const load = () => bmpl('/pooled-crew', { params: { q, page, limit: 25, ...filters } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [q, page, filters]);
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const d = await bmpl('/pooled-crew/' + editing._id, { method: 'PUT', body: draft });
    setBusy(false);
    if (d.success) { setEditing(null); setMsg({ type: 'success', text: 'Saved.' }); load(); } else setMsg({ type: 'error', text: d.message });
  };

  return (
    <div>
      <div className="bm-page-head">
        <div><h1>Pooled Crew</h1><p>Seafarers whose last contract has ended and who are not on board now — the pool to call from when a vacancy opens.</p></div>
        <div className="bm-actions"><ExportButton path={'/pooled-crew'} params={{ q, ...filters }} columns={EXPORT_COLUMNS} name={'pooled-crew'} disabled={!data?.total} onDone={setMsg} /></div>
      </div>
      <Alert msg={msg} />

      {editing && (
        <form onSubmit={save} className="bm-card">
          <h2 className="bm-h2">{editing.name} · {editing.vcan_id}</h2>
          <div className="bm-form-grid">
            <label className="bm-field"><span>Available from</span><CalendarPicker value={draft.davailable} onChange={(v) => setDraft((d) => ({ ...d, davailable: v }))} prefix="bm" /></label>
            <label className="bm-field bm-field-wide"><span>Sea-service remark</span><textarea rows={2} value={draft.remark || ''} onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))} /></label>
          </div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary" disabled={busy}><Save size={14} /> Save</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setEditing(null)}><X size={14} /> Cancel</button></div>
        </form>
      )}

      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Name, INDOS, last vessel" /></div>
        <select className="bm-select" value={filters.company_name} onChange={(e) => setFilter('company_name', e.target.value)}><option value="">All · Company</option>{(opts.company || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="bm-select" value={filters.rank_id} onChange={(e) => setFilter('rank_id', e.target.value)}><option value="">All · Rank</option>{(data?.ranks || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <span className="bm-daterange"><label>Available</label>
          <CalendarPicker value={filters.from} onChange={(v) => setFilter('from', v)} prefix="bm" size="sm" placeholder="From" />
          <CalendarPicker value={filters.to} onChange={(v) => setFilter('to', v)} prefix="bm" size="sm" placeholder="To" />
        </span>
        {(q || Object.values(filters).some(Boolean)) && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => { setQInput(''); setFilters({ company_name: '', rank_id: '', from: '', to: '' }); }}><X size={14} /> Clear</button>}
      </div>

      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="Nobody in the pool" text="Every seafarer with a contract on record is currently on board." /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Crew details</th><th>Indos no</th><th>Rank</th><th>Residence visa</th><th>Nok details</th><th>Company / crew officer / vessel</th><th>Signed off</th><th>Available from</th><th>Seaservice remark</th><th className="bm-screen-only">Actions</th></tr></thead>
            <tbody>{data.records.map((r) => (
              <tr key={r._id}>
                <td><strong>{r.name}</strong><div className="bm-muted">{[r.email, r.mobile].filter(Boolean).join(' · ')}</div><div className="bm-muted">{[r.passport && 'Passport ' + r.passport, r.cdc && 'CDC ' + r.cdc].filter(Boolean).join(' · ')}</div></td>
                <td>{r.vcan_id}</td>
                <td>{r.rank}</td>
                <td>{r.residenceVisa || <span className="bm-muted">—</span>}{r.lastVisa?.type && <div className="bm-muted">{r.lastVisa.type}{r.lastVisa.expiry ? ' · ' + fmtDate(r.lastVisa.expiry) : ''}</div>}</td>
                <td className="bm-td-wrap">{r.nok}{r.relation ? <div className="bm-muted">{r.relation}</div> : null}{r.nokdetails ? <div className="bm-muted">{r.nokdetails}</div> : null}</td>
                <td>{r.company}<div className="bm-muted">{[r.crewOfficer, r.vessel].filter(Boolean).join(' · ')}</div></td>
                <td className="bm-td-date">{fmtDate(r.signoffdate)}<div className="bm-muted">{r.reason}</div></td>
                <td className="bm-td-date">{r.davailable ? fmtDate(r.davailable) : <span className="bm-muted">not set</span>}</td>
                <td className="bm-td-wrap">{r.seaServiceRemark}</td>
                <td className="bm-screen-only">
                  <div className="bm-inline">
                    <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" title="Availability" onClick={() => { setDraft({ davailable: r.davailable || '', remark: r.seaServiceRemark || '' }); setEditing(r); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={12} /></button>
                    <Link className="bm-btn bm-btn-sm bm-btn-ghost" to={'/dashboard/bmpl/candidates?q=' + encodeURIComponent(r.vcan_id || '')}>CV</Link>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
