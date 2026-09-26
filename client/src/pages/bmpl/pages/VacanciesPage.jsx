// client/src/pages/bmpl/pages/VacanciesPage.jsx
// "List of vacancies" (and, with ?rejoining=1, "Rejoining Vacancies").
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, X } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, FormField, ExportButton } from '../ui';

export const VACANCY_FORM = (o) => [
  { key: 'company_name', label: 'Owner', type: 'lookup', required: true }, { key: 'rankname', label: 'Rank', type: 'lookup', required: true }, { key: 'vessel_id', label: 'Vessel', type: 'lookup' },
  { key: 'noopening', label: 'Openings', type: 'number' }, { key: 'salary', label: 'Salary' }, { key: 'currency_type', label: 'Currency', type: 'lookup' },
  { key: 'type_days', label: 'Basis', type: 'select', options: ['Permonth', 'Perday'] }, { key: 'cduration', label: 'Contract (months)' },
  { key: 'jlocation', label: 'Location' }, { key: 'nationality', label: 'Nationality' }, { key: 'visatype', label: 'Visa type' },
  { key: 'excrew', label: 'Joiner type', type: 'select', options: ['Newjoiner', 'Rejoiner', 'Owner Proposed'] }, { key: 'rank_type', label: 'Rank type', type: 'select', options: ['officer', 'rating'] },
  { key: 'ship_type', label: 'Ship category', type: 'lookup' }, { key: 'shsub_id', label: 'Ship sub-category', type: 'lookup' }, { key: 'agelimit', label: 'Age limit' },
  { key: 'txt_jobarea', label: 'Job area' }, { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] }, { key: 'tat', label: 'TAT (hours)', type: 'number' },
  { key: 'crew_name', label: 'Owner contact' }, { key: 'remark', label: 'Requirement / remark', type: 'textarea' },
];
export const vacancyOptionsFor = (o, key) => ({ company_name: o.company, rankname: o.rank, vessel_id: o.vessel, currency_type: o.currency, ship_type: o.shipCategory, shsub_id: o.shipSubcat }[key]);

const EXPORT_COLUMNS = [{ key: 'id', label: 'Vacancy #' }, { key: 'company', label: 'Owner' }, { key: 'rank', label: 'Rank' }, { key: 'vessel', label: 'Vessel' }, { key: 'jlocation', label: 'Location' }, { key: 'vesselImo', label: 'IMO' }, { key: 'vesselFlag', label: 'Flag' }, { key: 'shipSubcat', label: 'Sub-category' }, { key: 'crew_name', label: 'Owner contact' }, { key: 'priority', label: 'Priority' }, { key: 'txt_jobarea', label: 'Job area' }, { key: 'remark', label: 'Remark' }, { key: 'salary', label: 'Salary' }, { key: 'currency', label: 'Currency' }, { key: 'noopening', label: 'Openings' }, { key: 'excrew', label: 'Joiner' }, { key: 'proposals', label: 'Proposed' }, { key: 'selected', label: 'Selected' }, { key: 'exp', label: 'State' }, { label: 'Raised', get: (r) => fmtDate(r.dov) }, { key: 'user', label: 'By' }];

export default function VacanciesPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const rejoining = sp.get('rejoining') === '1';
  const [qInput, setQInput] = useState(sp.get('q') || '');
  const [q, setQ] = useState(sp.get('q') || '');
  const [filters, setFilters] = useState({ exp: sp.get('exp') || (rejoining ? 'Open' : ''), company_name: '', rankname: '', user: '' });
  const [opts, setOpts] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ noopening: '1', type_days: 'Permonth', excrew: rejoining ? 'Rejoiner' : 'Newjoiner' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { bmpl('/vacancies/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  useEffect(() => {
    let cancelled = false;
    bmpl('/vacancies', { params: { q, page, limit: 25, rejoining: rejoining ? 1 : '', ...filters } }).then((d) => { if (cancelled) return; if (d.success) setData(d); else setMsg({ type: 'error', text: d.message }); });
    return () => { cancelled = true; };
  }, [q, page, filters, rejoining]);

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const create = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const d = await bmpl('/vacancies', { method: 'POST', body: draft });
    setBusy(false);
    if (d.success) navigate('/dashboard/bmpl/vacancies/' + d.vacancy._id); else setMsg({ type: 'error', text: d.message });
  };
  const vesselOptions = draft.company_name && opts?.vesselsByCompany?.[draft.company_name] ? opts.vesselsByCompany[draft.company_name] : opts?.vessel;

  return (
    <div>
      <div className="bm-page-head">
        <div><h1>{rejoining ? 'Rejoining Vacancies' : 'List of vacancies'}</h1><p>{rejoining ? 'Open vacancies flagged for rejoiners.' : 'Every vacancy raised for an owner. Click a row for proposals, tasks and actions.'}</p></div>
<div className="bm-actions"><ExportButton path={'/vacancies'} params={{ q, rejoining: rejoining ? 1 : '', ...filters }} columns={EXPORT_COLUMNS} name={'vacancies'} disabled={!data?.total} onDone={setMsg} /><button type="button" className="bm-btn bm-btn-primary" onClick={() => setAdding((a) => !a)}><Plus size={15} /> New vacancy</button></div></div>
      <Alert msg={msg} />

      {adding && opts && (
        <form onSubmit={create} className="bm-card">
          <div className="bm-form-grid">{VACANCY_FORM(opts).map((f) => <FormField key={f.key} field={f} value={draft[f.key]} options={f.key === 'vessel_id' ? vesselOptions : vacancyOptionsFor(opts, f.key)} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} disabled={busy} />)}</div>
          <div className="bm-form-actions">
            <button type="submit" className="bm-btn bm-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Create vacancy'}</button>
            <button type="button" className="bm-btn bm-btn-ghost" onClick={() => setAdding(false)}><X size={14} /> Cancel</button>
          </div>
        </form>
      )}

      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Vacancy #, owner, rank, vessel, location" /></div>
        <select className="bm-select" value={filters.exp} onChange={(e) => setFilter('exp', e.target.value)}><option value="">All · State</option><option value="Open">Open</option><option value="Close">Closed</option></select>
        <select className="bm-select" value={filters.company_name} onChange={(e) => setFilter('company_name', e.target.value)}><option value="">All · Owner</option>{(opts?.company || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="bm-select" value={filters.rankname} onChange={(e) => setFilter('rankname', e.target.value)}><option value="">All · Rank</option>{(opts?.rank || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="bm-select" value={filters.user} onChange={(e) => setFilter('user', e.target.value)}><option value="">All · Raised by</option>{(opts?.users || []).map((u) => <option key={u} value={u}>{u}</option>)}</select>
      </div>

      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No vacancies match" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Job id</th><th>Date</th><th>Company details</th><th>Vessel details</th><th>Salary / openings</th><th>Vacancy details</th><th>Remark</th><th>Proposed</th><th>State</th><th>User</th></tr></thead>
            <tbody>{data.records.map((v) => (
              <tr key={v._id} className="bm-row-link" onClick={() => navigate('/dashboard/bmpl/vacancies/' + v._id)}>
                <td><strong>{v.id}</strong>{v.priority ? <div className="bm-muted">{v.priority}</div> : null}{v.tat ? <div className="bm-muted">TAT {v.tat}h</div> : null}</td>
                <td className="bm-td-date">{fmtDate(v.dov)}</td>
                <td><strong>{v.company}</strong><div className="bm-muted">{v.rank}{v.excrew ? ' · ' + v.excrew : ''}</div>{v.crew_name ? <div className="bm-muted">{v.crew_name}</div> : null}</td>
                <td>{v.vessel}<div className="bm-muted">{[v.shipSubcat, v.vesselImo && 'IMO ' + v.vesselImo, v.vesselFlag].filter(Boolean).join(' · ')}</div>{v.jlocation ? <div className="bm-muted">{v.jlocation}</div> : null}</td>
                <td>{v.salary} {v.currency} {v.type_days === 'Perday' ? '/day' : '/mo'}<div className="bm-muted">{v.noopening} opening(s)</div></td>
                <td className="bm-td-wrap">{[v.shipCategory, v.txt_jobarea, v.visatype, v.nationality].filter(Boolean).join(' · ')}</td>
                <td className="bm-td-wrap">{v.remark}</td>
                <td>{v.proposals}{v.selected ? <span className="bm-muted"> · {v.selected} sel.</span> : ''}</td>
                <td><span className={'bm-pill ' + (v.exp === 'Open' ? 'bm-pill-good' : 'bm-pill-muted')}>{v.exp}</span></td><td>{v.user}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
