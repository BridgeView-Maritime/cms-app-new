// client/src/pages/bmpl/pages/ProposalsPage.jsx
// "Proposed Candidates" - every proposal (vacanciescandidate) with its
// status flow, inline status change and an expandable edit form.
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, FormField, ExportButton } from '../ui';
import CalendarPicker from '../../../components/CalendarPicker';

export const statusPill = (s) => 'bm-pill ' + (s === 'Selected' ? 'bm-pill-good' : s === 'Pending' ? 'bm-pill-warn' : s === 'Rejected' || s === 'Backout' ? 'bm-pill-bad' : 'bm-pill-muted');
const EDIT_FIELDS = [
  { key: 'salary', label: 'Salary' }, { key: 'type_days', label: 'Basis', type: 'select', options: ['Permonth', 'Perday'] },
  { key: 'joiner_type', label: 'Joiner type', type: 'select', options: ['Newjoiner', 'Rejoiner', 'Owner Proposed'] },
  { key: 'interview', label: 'Interview', type: 'select', options: ['0', '1'], labels: ['Pending', 'Done'] }, { key: 'interview_date', label: 'Interview date', type: 'date' }, { key: 'interview_doneby', label: 'Interviewed by' },
  { key: 'eng_comm', label: 'English communication' }, { key: 'technical_skills', label: 'Technical skills' }, { key: 'stage', label: 'Stage' },
  { key: 'security_deposit', label: 'Security deposit' }, { key: 'security_deposit_status', label: 'Deposit status' }, { key: 'rpsl_agencies', label: 'RPSL agency' }, { key: 'tracking_id', label: 'Tracking id' },
  { key: 'remark', label: 'Remark', type: 'textarea' }, { key: 'feedback', label: 'Owner feedback', type: 'textarea' },
];

export function ProposalRow({ p, statuses, busy, onStatus, onSave, extra }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const label = (statuses.find((s) => s.key === p.status) || {}).label || p.status;
  return (
    <>
      <tr>
        <td>{p.person ? <Link className="bm-link" to={'/dashboard/bmpl/candidates/' + p.person._id}><strong>{p.person.name}</strong></Link> : <span className="bm-muted">Unknown</span>}<div className="bm-muted">{p.indosno}{p.person?.mobile ? ' · ' + p.person.mobile : ''}</div></td>
        <td>{p.vacancy ? <Link className="bm-link" to={'/dashboard/bmpl/vacancies/' + p.vacancy._id}>#{p.vacancyid}</Link> : '#' + p.vacancyid}{p.vacancy?.exp === 'Close' && <div className="bm-muted">closed</div>}</td>
        <td>{p.company}</td><td>{p.vacancy?.vessel}</td><td>{p.rank}</td><td>{p.salary}{p.type_days === 'Perday' ? '/day' : ''}</td><td>{p.joiner_type}</td>
        <td className="bm-td-date">{fmtDate(p.date)}</td><td>{p.sourceby}</td><td>{p.user}</td>
        {extra && extra(p)}
        <td><span className={statusPill(p.status)}>{label}</span></td>
        <td className="bm-inline">
          <select className="bm-select bm-select-sm" value="" disabled={busy} onChange={(e) => e.target.value && onStatus(p._id, e.target.value)}>
            <option value="">Set status…</option>{statuses.filter((s) => s.key !== p.status).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" onClick={() => { if (!open) setDraft(Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, p[f.key] ?? '']))); setOpen((o) => !o); }}>{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>
        </td>
      </tr>
      {open && draft && (
        <tr><td colSpan={99}>
          <form className="bm-embedded" onSubmit={async (e) => { e.preventDefault(); if (await onSave(p._id, draft)) setOpen(false); }}>
            <div className="bm-form-grid">{EDIT_FIELDS.map((f) => <FormField key={f.key} field={f} value={draft[f.key]} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} disabled={busy} />)}</div>
            <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary bm-btn-sm" disabled={busy}><Save size={13} /> Save</button><button type="button" className="bm-btn bm-btn-ghost bm-btn-sm" onClick={() => setOpen(false)}>Cancel</button></div>
          </form>
        </td></tr>
      )}
    </>
  );
}

const EXPORT_COLUMNS = [{ label: 'Candidate', get: (r) => r.person?.name }, { key: 'indosno', label: 'INDOS' }, { key: 'vacancyid', label: 'Vacancy #' }, { key: 'company', label: 'Owner' }, { label: 'Vessel', get: (r) => r.vacancy?.vessel }, { key: 'rank', label: 'Rank' }, { key: 'salary', label: 'Salary' }, { key: 'joiner_type', label: 'Joiner' }, { label: 'Proposed', get: (r) => fmtDate(r.date) }, { key: 'sourceby', label: 'Sourced by' }, { key: 'user', label: 'Proposed by' }, { key: 'status', label: 'Status' }, { key: 'remark', label: 'Remark' }, { key: 'feedback', label: 'Owner feedback' }];

export default function ProposalsPage() {
  const [sp] = useSearchParams();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ status: sp.get('status') || '', company_name: '', user: '', sourceby: '', joiner_type: '', vacancyid: sp.get('vacancyid') || '', from: '', to: '' });
  const [opts, setOpts] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { bmpl('/vacancies/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  const load = () => bmpl('/proposals', { params: { q, page, limit: 25, ...filters } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [q, page, filters]);
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const put = async (id, body) => { setBusy(true); setMsg(null); const d = await bmpl('/proposals/' + id, { method: 'PUT', body }); setBusy(false); if (d.success) { load(); return true; } setMsg({ type: 'error', text: d.message }); return false; };

  return (
    <div>
      <div className="bm-page-head"><div><h1>Proposed Candidates</h1><p>Every candidate put forward for a vacancy, with the owner's decision. Change the status inline or expand a row to edit the offer.</p></div><div className="bm-actions"><ExportButton path={'/proposals'} params={{ q, ...filters }} columns={EXPORT_COLUMNS} name={'proposals'} disabled={!data?.total} onDone={setMsg} /></div></div>
      <Alert msg={msg} />
      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="INDOS, passport, vacancy #, remark" /></div>
        <select className="bm-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}><option value="">All · Status</option>{(data?.statuses || []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        <select className="bm-select" value={filters.company_name} onChange={(e) => setFilter('company_name', e.target.value)}><option value="">All · Owner</option>{(opts?.company || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="bm-select" value={filters.user} onChange={(e) => setFilter('user', e.target.value)}><option value="">All · Proposed by</option>{(opts?.users || []).map((u) => <option key={u} value={u}>{u}</option>)}</select>
        <select className="bm-select" value={filters.sourceby} onChange={(e) => setFilter('sourceby', e.target.value)}><option value="">All · Sourced by</option>{(opts?.users || []).map((u) => <option key={u} value={u}>{u}</option>)}</select>
        <select className="bm-select" value={filters.joiner_type} onChange={(e) => setFilter('joiner_type', e.target.value)}><option value="">All · Joiner</option><option value="Newjoiner">Newjoiner</option><option value="Rejoiner">Rejoiner</option><option value="Owner Proposed">Owner proposed</option></select>
        <input type="text" className="bm-select bm-select-sm" value={filters.vacancyid} onChange={(e) => setFilter('vacancyid', e.target.value)} placeholder="Vacancy #" />
        <CalendarPicker value={filters.from} onChange={(v) => setFilter('from', v)} prefix="bm" size="sm" placeholder="From" />
        <CalendarPicker value={filters.to} onChange={(v) => setFilter('to', v)} prefix="bm" size="sm" placeholder="To" />
        {(q || Object.values(filters).some(Boolean)) && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => { setQInput(''); setFilters({ status: '', company_name: '', user: '', sourceby: '', joiner_type: '', vacancyid: '', from: '', to: '' }); }}><X size={14} /> Clear</button>}
      </div>
      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No proposals match" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Candidate</th><th>Vacancy</th><th>Owner</th><th>Vessel</th><th>Rank</th><th>Salary</th><th>Joiner</th><th>Proposed on</th><th>Sourced by</th><th>Proposed by</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.records.map((p) => <ProposalRow key={p._id} p={p} statuses={data.statuses} busy={busy} onStatus={(id, status) => put(id, { status })} onSave={put} />)}</tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
