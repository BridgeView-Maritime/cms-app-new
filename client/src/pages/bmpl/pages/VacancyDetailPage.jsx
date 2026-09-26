// client/src/pages/bmpl/pages/VacancyDetailPage.jsx
// One vacancy: details, the candidates proposed against it, the sourcing
// tasks assigned for it, and the actions (edit / close / propose / assign).
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Save, X, Lock, Unlock, UserPlus, ClipboardList } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Alert, Empty, FormField } from '../ui';
import { VACANCY_FORM, vacancyOptionsFor } from './VacanciesPage';

const pill = (s) => 'bm-pill ' + (s === 'Selected' ? 'bm-pill-good' : s === 'Pending' ? 'bm-pill-warn' : s === 'Rejected' || s === 'Backout' ? 'bm-pill-bad' : 'bm-pill-muted');

export default function VacancyDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [opts, setOpts] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [propose, setPropose] = useState(null); // {indosno, remark}
  const [assign, setAssign] = useState(null); // {assignto}
  const [closing, setClosing] = useState(null); // {reason}

  const load = () => bmpl('/vacancies/' + id).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); bmpl('/vacancies/options').then((d) => { if (d.success) setOpts(d); }); }, [id]);

  const run = async (fn, okMsg) => {
    setBusy(true); setMsg(null);
    const d = await fn();
    setBusy(false);
    if (d.success) { setMsg({ type: 'success', text: okMsg || d.message }); await load(); return true; }
    setMsg({ type: 'error', text: d.message }); return false;
  };
  const save = async (e) => { e.preventDefault(); if (await run(() => bmpl('/vacancies/' + id, { method: 'PUT', body: draft }))) setEditing(false); };
  const setStatus = (pid, status) => run(() => bmpl('/proposals/' + pid, { method: 'PUT', body: { status } }));

  if (!data) return <div className="bm-loading">{msg ? <Alert msg={msg} /> : 'Loading…'}</div>;
  const v = data.vacancy;
  const open = v.exp === 'Open';
  const vesselOptions = draft.company_name && opts?.vesselsByCompany?.[draft.company_name] ? opts.vesselsByCompany[draft.company_name] : opts?.vessel;
  const facts = [
    ['Owner', v.company], ['Vessel', v.vessel], ['Rank', v.rank], ['Openings', v.noopening], ['Salary', [v.salary, v.currency, v.type_days === 'Perday' ? '/day' : '/mo'].filter(Boolean).join(' ')],
    ['Contract', v.cduration && v.cduration + ' months'], ['Location', v.jlocation], ['Nationality', v.nationality], ['Visa', v.visatype], ['Joiner', v.excrew], ['Rank type', v.rank_type],
    ['Ship category', v.shipCategory], ['Sub-category', v.shipSubcat], ['Age limit', v.agelimit], ['Job area', v.txt_jobarea], ['Priority', v.priority], ['TAT', v.tat && v.tat + ' h'],
    ['Owner contact', v.crew_name], ['Raised', fmtDate(v.dov, true) + (v.user ? ' by ' + v.user : '')], ['Closed', v.exp === 'Close' ? fmtDate(v.doc, true) : ''], ['Last note', v.editremark],
  ].filter(([, val]) => val);

  return (
    <div>
      <div className="bm-page-head">
        <div>
          <Link to="/dashboard/bmpl/vacancies" className="bm-back"><ArrowLeft size={14} /> Vacancies</Link>
          <h1>Vacancy #{v.id} · {v.rank} <span className={'bm-pill ' + (open ? 'bm-pill-good' : 'bm-pill-muted')}>{v.exp}</span></h1>
          <p>{v.company}{v.vessel ? ' · ' + v.vessel : ''}{v.jlocation ? ' · ' + v.jlocation : ''}</p>
        </div>
        <div className="bm-actions">
          {!editing && <button type="button" className="bm-btn" onClick={() => { setDraft(Object.fromEntries(VACANCY_FORM({}).map((f) => [f.key, v[f.key] ?? '']))); setEditing(true); }}><Pencil size={14} /> Edit</button>}
          {open && <button type="button" className="bm-btn" onClick={() => setPropose({ indosno: '', remark: '' })}><UserPlus size={14} /> Propose candidate</button>}
          {open && <button type="button" className="bm-btn" onClick={() => setAssign({ assignto: '' })}><ClipboardList size={14} /> Assign task</button>}
          {open ? <button type="button" className="bm-btn bm-btn-danger" onClick={() => setClosing({ reason: '' })}><Lock size={14} /> Close</button>
            : <button type="button" className="bm-btn" disabled={busy} onClick={() => run(() => bmpl('/vacancies/' + id + '/close', { method: 'POST', body: { reopen: true } }))}><Unlock size={14} /> Reopen</button>}
        </div>
      </div>
      <Alert msg={msg} />

      {editing && opts && (
        <form onSubmit={save} className="bm-card">
          <div className="bm-form-grid">{VACANCY_FORM(opts).map((f) => <FormField key={f.key} field={f} value={draft[f.key]} options={f.key === 'vessel_id' ? vesselOptions : vacancyOptionsFor(opts, f.key)} onChange={(k, val) => setDraft((d) => ({ ...d, [k]: val }))} disabled={busy} />)}
            <FormField field={{ key: 'editremark', label: 'Edit note' }} value={draft.editremark} onChange={(k, val) => setDraft((d) => ({ ...d, [k]: val }))} disabled={busy} /></div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary" disabled={busy}><Save size={14} /> Save</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setEditing(false)}><X size={14} /> Cancel</button></div>
        </form>
      )}

      {propose && (
        <form className="bm-card" onSubmit={async (e) => { e.preventDefault(); if (await run(() => bmpl('/vacancies/' + id + '/propose', { method: 'POST', body: propose }))) setPropose(null); }}>
          <h2 className="bm-h2">Propose a candidate</h2>
          <div className="bm-form-grid">
            <FormField field={{ key: 'indosno', label: 'INDOS number', required: true }} value={propose.indosno} onChange={(k, val) => setPropose((p) => ({ ...p, [k]: val }))} disabled={busy} />
            <FormField field={{ key: 'salary', label: 'Offered salary' }} value={propose.salary ?? v.salary} onChange={(k, val) => setPropose((p) => ({ ...p, [k]: val }))} disabled={busy} />
            <FormField field={{ key: 'joiner_type', label: 'Joiner type', type: 'select', options: ['Newjoiner', 'Rejoiner', 'Owner Proposed'] }} value={propose.joiner_type ?? v.excrew} onChange={(k, val) => setPropose((p) => ({ ...p, [k]: val }))} disabled={busy} />
            <FormField field={{ key: 'remark', label: 'Remark', type: 'textarea' }} value={propose.remark} onChange={(k, val) => setPropose((p) => ({ ...p, [k]: val }))} disabled={busy} />
          </div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary" disabled={busy}>Propose</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setPropose(null)}>Cancel</button></div>
        </form>
      )}

      {assign && opts && (
        <form className="bm-card" onSubmit={async (e) => { e.preventDefault(); if (await run(() => bmpl('/tasks', { method: 'POST', body: { vacancyId: v.id, assignto: assign.assignto } }))) setAssign(null); }}>
          <h2 className="bm-h2">Assign sourcing task</h2>
          <div className="bm-form-grid"><FormField field={{ key: 'assignto', label: 'Assign to', type: 'lookup', required: true }} options={opts.staff} value={assign.assignto} onChange={(k, val) => setAssign({ assignto: val })} disabled={busy} /></div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary" disabled={busy || !assign.assignto}>Assign</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setAssign(null)}>Cancel</button></div>
        </form>
      )}

      {closing && (
        <form className="bm-card" onSubmit={async (e) => { e.preventDefault(); if (await run(() => bmpl('/vacancies/' + id + '/close', { method: 'POST', body: closing }))) setClosing(null); }}>
          <h2 className="bm-h2">Close vacancy #{v.id}</h2>
          <div className="bm-form-grid"><FormField field={{ key: 'reason', label: 'Reason', type: 'textarea' }} value={closing.reason} onChange={(k, val) => setClosing({ reason: val })} disabled={busy} /></div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-danger" disabled={busy}>Close vacancy</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setClosing(null)}>Cancel</button></div>
        </form>
      )}

      <div className="bm-grid-2">
        <div className="bm-card">
          <h2 className="bm-h2">Details</h2>
          <dl className="bm-dl bm-dl-dense">{facts.map(([k, val]) => <div key={k} className="bm-dl-row"><dt>{k}</dt><dd>{val}</dd></div>)}</dl>
          {v.remark && <><h3 className="bm-h3">Requirement</h3><p className="bm-pre">{v.remark}</p></>}
        </div>
        <div className="bm-card">
          <h2 className="bm-h2">Sourcing tasks ({data.tasks.length})</h2>
          {data.tasks.length === 0 ? <Empty title="Not assigned to anyone yet" /> : (
            <ul className="bm-list">{data.tasks.map((t) => (
              <li key={t._id}><span><strong>{t.assignedTo || t.assignto}</strong> <span className="bm-muted">by {t.assignby} · {fmtDate(t.dov, true)}</span></span>
                <span className={'bm-pill ' + (String(t.ackn) === '1' ? 'bm-pill-good' : 'bm-pill-warn')}>{String(t.ackn) === '1' ? 'Acknowledged ' + fmtDate(t.ackndate) : 'Awaiting ack'}</span></li>
            ))}</ul>
          )}
          {data.history?.length > 0 && (
            <>
              <h3 className="bm-h3">Change history ({data.history.length})</h3>
              <ul className="bm-list">{data.history.map((h) => (
                <li key={h._id}>
                  <span>{h.change || 'Edited'}{h.salary ? ' · salary ' + h.salary : ''}{h.noopening ? ' · ' + h.noopening + ' opening(s)' : ''} <span className="bm-muted">by {h.by || '-'}</span></span>
                  <span>{fmtDate(h.on, true)}</span>
                </li>
              ))}</ul>
            </>
          )}
          {data.proposedToCompany.length > 0 && <><h3 className="bm-h3">Sent to owner</h3><ul className="bm-list">{data.proposedToCompany.map((p) => <li key={p._id}><span><strong>{p.indosno}</strong> <span className="bm-muted">{p.status}</span></span><span>{fmtDate(p.date)}</span></li>)}</ul></>}
        </div>
      </div>

      <div className="bm-card">
        <h2 className="bm-h2">Proposed candidates ({data.proposals.length})</h2>
        {data.proposals.length === 0 ? <Empty title="Nobody proposed yet" text={open ? 'Use "Propose candidate" above.' : ''} /> : (
          <div className="bm-table-wrap">
            <table className="bm-table">
              <thead><tr><th>Candidate</th><th>INDOS</th><th>Rank</th><th>Salary</th><th>Joiner</th><th>Proposed</th><th>By</th><th>Status</th><th>Remark</th><th></th></tr></thead>
              <tbody>{data.proposals.map((p) => (
                <tr key={p._id}>
                  <td>{p.person ? <Link className="bm-link" to={'/dashboard/bmpl/candidates/' + p.person._id}><strong>{p.person.name}</strong></Link> : <span className="bm-muted">Unknown</span>}</td>
                  <td>{p.indosno}</td><td>{p.rank}</td><td>{p.salary} {p.currency_type === v.currency_type ? v.currency : ''}</td><td>{p.joiner_type}</td><td className="bm-td-date">{fmtDate(p.date)}</td><td>{p.user}</td>
                  <td><span className={pill(p.status)}>{(data.statuses.find((s) => s.key === p.status) || {}).label || p.status}</span></td>
                  <td className="bm-td-wrap">{p.remark}</td>
                  <td><select className="bm-select bm-select-sm" value="" disabled={busy} onChange={(e) => e.target.value && setStatus(p._id, e.target.value)}>
                    <option value="">Set status…</option>{data.statuses.filter((s) => s.key !== p.status).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
