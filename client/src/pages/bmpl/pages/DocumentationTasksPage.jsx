// client/src/pages/bmpl/pages/DocumentationTasksPage.jsx
// "Manage Task Approval" - the joining checklist for selected candidates.
// Each tick is stored on the proposal (interview/medical/flag_pen/...).
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, Check } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, ExportButton } from '../ui';
import { useBmpl } from '../BmplModule';

const EXPORT_COLUMNS = [{ label: 'Candidate', get: (r) => r.person?.name }, { key: 'indosno', label: 'INDOS' }, { key: 'vacancyid', label: 'Vacancy #' }, { key: 'company', label: 'Owner' }, { label: 'Vessel', get: (r) => r.vacancy?.vessel }, { key: 'rank', label: 'Rank' }, { label: 'Selected', get: (r) => fmtDate(r.date) }, { label: 'Checklist', get: (r) => r.checklistDone + '/' + r.checklist.length }, { label: 'Done', get: (r) => r.checklist.filter((c) => c.done).map((c) => c.label).join(' ') }, { label: 'Pending', get: (r) => r.checklist.filter((c) => !c.done).map((c) => c.label).join(' ') }, { key: 'documentsUploaded', label: 'Docs uploaded' }, { label: 'Travel', get: (r) => (r.travel ? r.travel.from + ' - ' + r.travel.to + ' ' + fmtDate(r.travel.date) : '') }, { key: 'stage', label: 'Stage' }];

export default function DocumentationTasksPage() {
  const { user } = useBmpl();
  const [sp] = useSearchParams();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ company_name: '', stage: '', pending: sp.get('pending') || '', assigned_to: '', joiner_type: '', docstage: sp.get('docstage') || '' });
  const [opts, setOpts] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { bmpl('/vacancies/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  const load = () => bmpl('/documentation', { params: { q, page, limit: 25, ...filters } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [q, page, filters]);
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  // 'Start documentation' / 'Cancel' on the legacy page, stored on the proposal.
  const setDocStatus = async (p, status) => {
    setBusy(true); setMsg(null);
    const body = { documentation_status: status };
    if (status === 'Started') { body.assigned_to = p.assigned_to || ''; body.approvaldate = new Date().toISOString().slice(0, 10); }
    const d = await bmpl('/proposals/' + p._id, { method: 'PUT', body });
    setBusy(false);
    if (d.success) load(); else setMsg({ type: 'error', text: d.message });
  };

  const claim = async (p) => {
    setBusy(true); setMsg(null);
    const d = await bmpl('/proposals/' + p._id, { method: 'PUT', body: { assigned_to: user?.username || '' } });
    setBusy(false);
    if (d.success) load(); else setMsg({ type: 'error', text: d.message });
  };

  const toggle = async (p, key, done) => {
    setBusy(true);
    const d = await bmpl('/proposals/' + p._id, { method: 'PUT', body: { [key]: done ? '0' : '1' } });
    setBusy(false);
    if (d.success) setData((cur) => ({ ...cur, records: cur.records.map((r) => (r._id === p._id ? { ...r, checklist: r.checklist.map((c) => (c.key === key ? { ...c, done: !done } : c)), checklistDone: r.checklistDone + (done ? -1 : 1) } : r)) }));
    else setMsg({ type: 'error', text: d.message });
  };

  return (
    <div>
      <div className="bm-page-head"><div><h1>Manage Task Approval</h1><p>Selected candidates and their joining checklist. Click a step to mark it done or undone.</p></div><div className="bm-actions"><ExportButton path={'/documentation'} params={{ q, ...filters }} columns={EXPORT_COLUMNS} name={'documentation-tasks'} disabled={!data?.total} onDone={setMsg} /></div></div>
      <Alert msg={msg} />
      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="INDOS, passport, vacancy #" /></div>
        <select className="bm-select" value={filters.company_name} onChange={(e) => setFilter('company_name', e.target.value)}><option value="">All · Owner</option>{(opts?.company || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="bm-select" value={filters.stage} onChange={(e) => setFilter('stage', e.target.value)}><option value="">All · Stage</option>{(data?.stages || []).map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select className="bm-select" value={filters.assigned_to} onChange={(e) => setFilter('assigned_to', e.target.value)}><option value="">All · Crewing officer</option>{(data?.assignees || []).map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select className="bm-select" value={filters.joiner_type} onChange={(e) => setFilter('joiner_type', e.target.value)}><option value="">All · Joiner</option><option value="Newjoiner">Newjoiner</option><option value="Rejoiner">Rejoiner</option><option value="Owner Proposed">Owner proposed</option></select>
        <select className="bm-select" value={filters.docstage} onChange={(e) => setFilter('docstage', e.target.value)}><option value="">All · Documentation</option><option value="notstarted">Not started</option><option value="started">Started</option><option value="cancelled">Cancelled</option></select>
        <label className="bm-inline"><input type="checkbox" checked={Boolean(filters.pending)} onChange={(e) => setFilter('pending', e.target.checked ? '1' : '')} /> Only incomplete</label>
        {(q || Object.values(filters).some(Boolean)) && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => { setQInput(''); setFilters({ company_name: '', stage: '', pending: '', assigned_to: '', joiner_type: '', docstage: '' }); }}><X size={14} /> Clear</button>}
      </div>
      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No selected candidates match" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Candidate</th><th>Job id</th><th>Date of approval</th><th>Rank</th><th>Indos no</th><th>Passport</th><th>Joiner type</th><th>Vessel / company / crewing officer</th><th>Visa / documents status</th><th>Checklist</th><th>Travel details</th><th>Stage</th><th>Documentation</th></tr></thead>
            <tbody>{data.records.map((p) => (
              <tr key={p._id}>
                <td>{p.person ? <Link className="bm-link" to={'/dashboard/bmpl/candidates/' + p.person._id}><strong>{p.person.name}</strong></Link> : <span className="bm-muted">Unknown</span>}<div className="bm-muted">{p.indosno}</div></td>
                <td>{p.vacancy ? <Link className="bm-link" to={'/dashboard/bmpl/vacancies/' + p.vacancy._id}>#{p.vacancyid}</Link> : '#' + p.vacancyid}</td>
                <td className="bm-td-date">{fmtDate(p.date)}</td>
                <td>{p.rank}</td>
                <td>{p.indosno}</td>
                <td>{p.passport || p.person?.passport}</td>
                <td>{p.joiner_type}</td>
                <td>{p.vacancy?.vessel}<div className="bm-muted">{p.company}</div><div className="bm-muted">{p.user}</div></td>
                <td>
                  {p.visa
                    ? <><span className={'bm-pill ' + (/^\s*RECEIVED/i.test(p.visa.status) ? 'bm-pill-good' : 'bm-pill-warn')}>{p.visa.status || 'Visa pending'}</span><div className="bm-muted">{p.visa.type}{p.visa.loiReceived ? ' · LOI in' : ' · LOI pending'}</div></>
                    : <span className="bm-muted">no visa record</span>}
                  <div className="bm-muted"><Link className="bm-link" to={'/dashboard/bmpl/document-upload?indos=' + encodeURIComponent(p.indosno || '')}>{p.documentsUploaded} docs</Link></div>
                </td>
                <td>
                  <div className="bm-checklist">{p.checklist.map((c) => (
                    <button key={c.key} type="button" className={'bm-check' + (c.done ? ' bm-check-on' : '')} disabled={busy} onClick={() => toggle(p, c.key, c.done)} title={c.done ? 'Mark ' + c.label + ' not done' : 'Mark ' + c.label + ' done'}>{c.done && <Check size={11} />} {c.label}</button>
                  ))}</div>
                  <div className="bm-muted">{p.checklistDone}/{p.checklist.length} done</div>
                </td>
                <td>{p.travel ? <span>{p.travel.from} → {p.travel.to}<div className="bm-muted">{fmtDate(p.travel.date)}</div></span> : <Link className="bm-link bm-muted" to={'/dashboard/bmpl/travel-diary?indos=' + encodeURIComponent(p.indosno || '')}>none</Link>}</td>
                <td>{p.stage}</td>
                <td className="bm-inline">
                  {p.documentation_status === 'Started' ? <span className="bm-pill bm-pill-good">Started{p.approvaldate ? ' ' + fmtDate(p.approvaldate) : ''}</span>
                    : p.documentation_status === 'Cancelled' ? <span className="bm-pill bm-pill-bad">Cancelled</span>
                    : <span className="bm-pill bm-pill-muted">Not started</span>}
                  <div className="bm-muted">{p.assigned_to ? 'with ' + p.assigned_to : <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" disabled={busy} onClick={() => claim(p)}>Take it</button>}</div>
                  <div className="bm-inline bm-screen-only">
                    {p.documentation_status !== 'Started' && <button type="button" className="bm-btn bm-btn-sm" disabled={busy} onClick={() => setDocStatus(p, 'Started')}>{p.documentation_status === 'Cancelled' ? 'Re-start' : 'Start'}</button>}
                    {p.documentation_status === 'Started' && <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost bm-btn-danger" disabled={busy} onClick={() => setDocStatus(p, 'Cancelled')}>Cancel</button>}
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
