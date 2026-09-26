// client/src/pages/bmpl/pages/CrewSignonPage.jsx
// "Crew Signon" - contractnew: who is on board, sign-on / sign-off records.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, X, Pencil, Save, LogOut } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, FormField, ExportButton } from '../ui';
import CalendarPicker from '../../../components/CalendarPicker';

const FIELDS = [
  { key: 'vcan_id', label: 'INDOS', required: true }, { key: 'fullname', label: 'Full name' }, { key: 'company_name', label: 'Owner', type: 'lookup' }, { key: 'vesselname', label: 'Vessel', required: true }, { key: 'rank_id', label: 'Rank', type: 'lookup' },
  { key: 'signondate', label: 'Sign-on date', type: 'date', required: true }, { key: 'contractduration', label: 'Contract (months)' }, { key: 'expsignoffdate', label: 'Expected sign-off', type: 'date' },
  { key: 'joiner_type', label: 'Joiner type', type: 'select', options: ['Newjoiner', 'Rejoiner', 'Owner Proposed'] }, { key: 'join_type', label: 'Join type' }, { key: 'donevacancy', label: 'Vacancy #' },
  { key: 'txt_country', label: 'Joining country' }, { key: 'txt_port', label: 'Joining port' }, { key: 'date_leave', label: 'Left home', type: 'date' }, { key: 'date_ariveal', label: 'Arrived', type: 'date' },
  { key: 'dob', label: 'Date of birth', type: 'date' }, { key: 'nok', label: 'Next of kin' }, { key: 'relation', label: 'Relation' }, { key: 'nokdetails', label: 'NOK contact' }, { key: 'address', label: 'Address', type: 'textarea' },
];
const OFF_FIELDS = [
  { key: 'signoffdate', label: 'Sign-off date', type: 'date', required: true }, { key: 'reason', label: 'Reason', type: 'select', options: ['Contract Completed', 'Medical', 'Compassionate', 'Disciplinary', 'Owner Request', 'Own Request', 'Vessel Sold', 'Other'] },
  { key: 'davailable', label: 'Available from', type: 'date' }, { key: 'remark', label: 'Remark', type: 'textarea' },
];

const EXPORT_COLUMNS = [{ key: 'fullname', label: 'Seafarer' }, { key: 'vcan_id', label: 'INDOS' }, { key: 'company', label: 'Owner' }, { key: 'vesselname', label: 'Vessel' }, { key: 'rank', label: 'Rank' }, { key: 'cdc', label: 'CDC' }, { key: 'coc', label: 'COC' }, { label: 'Signed on', get: (r) => fmtDate(r.signondate) }, { key: 'contractduration', label: 'Contract' }, { label: 'Exp. sign-off', get: (r) => fmtDate(r.expsignoffdate) }, { label: 'Signed off', get: (r) => fmtDate(r.signoffdate) }, { key: 'reason', label: 'Reason' }, { key: 'signtype', label: 'Status' }, { key: 'joiner_type', label: 'Joiner' }, { key: 'txt_port', label: 'Joining port' }, { key: 'nok', label: 'Next of kin' }, { key: 'nokdetails', label: 'NOK contact' }];

export default function CrewSignonPage() {
  const [sp] = useSearchParams();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ signtype: sp.get('signtype') || '', company_name: '', vesselname: '', from: '', to: '', dateField: 'signondate', rank_id: '', joiner_type: '', reason: '' });
  const [opts, setOpts] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | _id
  const [offing, setOffing] = useState(null); // record
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { bmpl('/vacancies/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  const load = () => bmpl('/signon', { params: { q, page, limit: 25, ...filters } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [q, page, filters]);
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  const done = (d) => { setBusy(false); if (d.success) { setEditing(null); setOffing(null); setMsg({ type: 'success', text: d.message }); load(); } else setMsg({ type: 'error', text: d.message }); };
  const save = async (e) => { e.preventDefault(); setBusy(true); setMsg(null); done(editing === 'new' ? await bmpl('/signon', { method: 'POST', body: draft }) : await bmpl('/signon/' + editing, { method: 'PUT', body: draft })); };
  const signoff = async (e) => { e.preventDefault(); setBusy(true); setMsg(null); done(await bmpl('/signon/' + offing._id + '/signoff', { method: 'POST', body: draft })); };
  const optionsFor = (k) => (k === 'company_name' ? opts?.company : k === 'rank_id' ? opts?.rank : undefined);

  return (
    <div>
      <div className="bm-page-head">
        <div><h1>Crew Signon</h1><p>Sign-on and sign-off history per seafarer. Record a sign-on when the crew joins; sign them off when the contract ends.</p></div>
<div className="bm-actions"><ExportButton path={'/signon'} params={{ q, ...filters }} columns={EXPORT_COLUMNS} name={'crew-signon'} disabled={!data?.total} onDone={setMsg} /><button type="button" className="bm-btn bm-btn-primary" onClick={() => { setOffing(null); setDraft({ joiner_type: 'Newjoiner' }); setEditing(editing === 'new' ? null : 'new'); }}><Plus size={15} /> Record sign-on</button></div></div>
      <Alert msg={msg} />
      {editing && (
        <form onSubmit={save} className="bm-card">
          <h2 className="bm-h2">{editing === 'new' ? 'New sign-on' : 'Edit record'}</h2>
          <div className="bm-form-grid">{FIELDS.map((f) => <FormField key={f.key} field={f} value={draft[f.key]} options={optionsFor(f.key)} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} disabled={busy} />)}</div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary" disabled={busy}><Save size={14} /> Save</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setEditing(null)}><X size={14} /> Cancel</button></div>
        </form>
      )}
      {offing && (
        <form onSubmit={signoff} className="bm-card">
          <h2 className="bm-h2"><LogOut size={15} /> Sign off {offing.fullname || offing.vcan_id} from {offing.vesselname}</h2>
          <div className="bm-form-grid">{OFF_FIELDS.map((f) => <FormField key={f.key} field={f} value={draft[f.key]} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} disabled={busy} />)}</div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-danger" disabled={busy}>Confirm sign-off</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setOffing(null)}><X size={14} /> Cancel</button></div>
        </form>
      )}
      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Name, INDOS, vessel, reason" /></div>
        <select className="bm-select" value={filters.signtype} onChange={(e) => setFilter('signtype', e.target.value)}><option value="">All · Status</option><option value="Signon">On board</option><option value="Signoff">Signed off</option></select>
        <select className="bm-select" value={filters.company_name} onChange={(e) => setFilter('company_name', e.target.value)}><option value="">All · Owner</option>{(opts?.company || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="bm-select" value={filters.dateField} onChange={(e) => setFilter('dateField', e.target.value)}><option value="signondate">Date: sign-on</option><option value="signoffdate">Date: sign-off</option><option value="doe">Date: entered</option></select>
        <CalendarPicker value={filters.from} onChange={(v) => setFilter('from', v)} prefix="bm" size="sm" placeholder="From" />
        <CalendarPicker value={filters.to} onChange={(v) => setFilter('to', v)} prefix="bm" size="sm" placeholder="To" />
        <select className="bm-select" value={filters.rank_id} onChange={(e) => setFilter('rank_id', e.target.value)}><option value="">All · Rank</option>{(opts?.rank || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="bm-select" value={filters.joiner_type} onChange={(e) => setFilter('joiner_type', e.target.value)}><option value="">All · Joiner</option><option value="Newjoiner">Newjoiner</option><option value="Rejoiner">Rejoiner</option><option value="Owner Proposed">Owner proposed</option></select>
        <select className="bm-select" value={filters.reason} onChange={(e) => setFilter('reason', e.target.value)}><option value="">All · Sign-off reason</option>{(data?.reasons || []).map((r) => <option key={r} value={r}>{r}</option>)}</select>
        {(q || Object.values(filters).some(Boolean)) && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => { setQInput(''); setFilters({ signtype: '', company_name: '', vesselname: '', from: '', to: '', dateField: 'signondate', rank_id: '', joiner_type: '', reason: '' }); }}><X size={14} /> Clear</button>}
      </div>
      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No records" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Candidate name</th><th>Indos no</th><th>Rank</th><th>Cdc</th><th>Coc</th><th>Company name</th><th>Name of vessel</th><th>Signed on</th><th>Duration of contract</th><th>Exp. sign-off</th><th>Signoff date</th><th>Reason</th><th>Sign type</th><th>By</th><th></th></tr></thead>
            <tbody>{data.records.map((r) => {
              const on = r.signtype === 'Signon';
              return (
                <tr key={r._id}>
                  <td><strong>{r.candidateName || r.fullname}</strong></td><td>{r.vcan_id}</td><td>{r.rank}</td><td>{r.cdc}</td><td>{r.coc}</td><td>{r.company}</td><td>{r.vesselname}</td>
                  <td className="bm-td-date">{fmtDate(r.signondate)}</td><td>{r.contractduration ? r.contractduration + ' mo' : ''}</td><td className="bm-td-date">{fmtDate(r.expsignoffdate)}</td><td className="bm-td-date">{on ? '' : fmtDate(r.signoffdate)}</td>
                  <td className="bm-td-wrap">{on ? '' : r.reason}</td>
                  <td><span className={'bm-pill ' + (on ? 'bm-pill-good' : 'bm-pill-muted')}>{on ? 'On board' : 'Signed off'}</span></td>
                  <td>{r.doneByName || r.user}<div className="bm-muted">{fmtDate(r.doe)}</div></td>
                  <td className="bm-inline">
                    <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" title="Edit" onClick={() => { setOffing(null); setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, r[f.key] ?? '']))); setEditing(r._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={12} /></button>
                    {on && <button type="button" className="bm-btn bm-btn-sm" title="Sign off" onClick={() => { setEditing(null); setDraft({ signoffdate: new Date().toISOString().slice(0, 10), reason: 'Contract Completed' }); setOffing(r); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><LogOut size={12} /> Sign off</button>}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
