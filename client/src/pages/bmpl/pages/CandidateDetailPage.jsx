// client/src/pages/bmpl/pages/CandidateDetailPage.jsx
// One seafarer, end to end: crewing record, public-site profile, proposals,
// contracts (sea service), documents, travel, visas, medicals, interview
// notes and any back-out record.
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Save, X, User, Briefcase, Anchor, FileText, Plane, Stamp, Stethoscope, Flag, MessageSquare, AlertTriangle } from 'lucide-react';
import { bmpl, fmtDate, fmtMoney } from '../api';
import { Alert, FormField, Empty } from '../ui';

const EDIT_FIELDS = [
  { key: 'name', label: 'Full name', required: true }, { key: 'email', label: 'Email' }, { key: 'mobile', label: 'Mobile' }, { key: 'indosno', label: 'INDOS' },
  { key: 'passport', label: 'Passport' }, { key: 'rankname', label: 'Rank' }, { key: 'cvcategory', label: 'CV category', type: 'select', options: ['Marine', 'Offshore', 'Onshore'] },
  { key: 'purpose', label: 'Purpose' }, { key: 'type', label: 'Source' }, { key: 'cdc', label: 'CDC' }, { key: 'coc', label: 'COC' }, { key: 'salary', label: 'Expected salary' },
  { key: 'aadharno', label: 'Aadhar' }, { key: 'pancardno', label: 'PAN' }, { key: 'sidno', label: 'SID' }, { key: 'dp_license', label: 'DP licence' },
  { key: 'documentsr', label: 'Documents status' }, { key: 'dremark', label: 'Remark', type: 'textarea' },
];

const KV = ({ k, v }) => (v === null || v === undefined || String(v).trim() === '' ? null : <div className="bm-dl-row"><dt>{k}</dt><dd>{String(v)}</dd></div>);
const pill = (s) => 'bm-pill ' + (s === 'Selected' ? 'bm-pill-good' : s === 'Pending' ? 'bm-pill-warn' : /reject|back|closed/i.test(s) ? 'bm-pill-bad' : 'bm-pill-muted');

export default function CandidateDetailPage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('overview');

  const load = () => bmpl('/candidates/' + id).then((r) => { if (r.success) { setD(r); setDraft(Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, r.candidate[f.key] ?? '']))); } else setMsg({ type: 'error', text: r.message }); });
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await bmpl('/candidates/' + id, { method: 'PUT', body: draft });
    setBusy(false);
    if (r.success) { setEditing(false); setMsg({ type: 'success', text: 'Saved.' }); load(); } else setMsg({ type: 'error', text: r.message });
  };

  if (!d) return <div className="bm-loading">Loading…</div>;
  const c = d.candidate;
  const reg = d.registration, ar = d.addresume;
  const seaDays = d.contracts.reduce((n, x) => { const a = new Date(x.signondate), b = new Date(x.signoffdate); return (Number.isNaN(a) || Number.isNaN(b) || b < a || a.getFullYear() < 1902) ? n : n + Math.round((b - a) / 86400000); }, 0);

  const TABS = [
    ['overview', 'Overview', User], ['proposals', 'Proposals (' + d.proposals.length + ')', Briefcase], ['contracts', 'Sea service (' + d.contracts.length + ')', Anchor],
    ['documents', 'Documents (' + d.documents.length + ')', FileText], ['travel', 'Travel (' + d.travel.length + ')', Plane], ['visas', 'Visas (' + d.visas.length + ')', Stamp],
    ['medical', 'Medical / Flag (' + (d.medicals.length + d.flags.length) + ')', Stethoscope], ['notes', 'Interview notes (' + d.questions.length + ')', MessageSquare],
  ];

  return (
    <div>
      <div className="bm-page-head">
        <div>
          <Link to="/dashboard/bmpl/candidates" className="bm-back"><ArrowLeft size={14} /> Candidates</Link>
          <h1>{c.name}</h1>
          <p>{[c.rankname, c.indosno && 'INDOS ' + c.indosno, c.passport && 'Passport ' + c.passport, c.cvcategory].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="bm-actions">
          {d.blacklist.length > 0 && <span className="bm-pill bm-pill-bad"><AlertTriangle size={12} /> Back-out record</span>}
          {!editing && <button type="button" className="bm-btn bm-btn-primary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>}
        </div>
      </div>
      <Alert msg={msg} />

      {editing && (
        <form onSubmit={save} className="bm-card">
          <div className="bm-form-grid">{EDIT_FIELDS.map((f) => <FormField key={f.key} field={f} value={draft[f.key]} onChange={(k, v) => setDraft((x) => ({ ...x, [k]: v }))} disabled={busy} />)}</div>
          <div className="bm-form-actions">
            <button type="submit" className="bm-btn bm-btn-primary" disabled={busy}><Save size={14} /> Save</button>
            <button type="button" className="bm-btn bm-btn-ghost" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
          </div>
        </form>
      )}

      <div className="bm-tiles">
        <div className="bm-tile"><span>Proposals</span><strong>{d.proposals.length}</strong><small>{d.proposals.filter((p) => p.status === 'Selected').length} selected</small></div>
        <div className="bm-tile"><span>Contracts</span><strong>{d.contracts.length}</strong><small>{seaDays ? Math.round(seaDays / 30) + ' months at sea' : '—'}</small></div>
        <div className="bm-tile"><span>Documents on file</span><strong>{d.documents.length}</strong></div>
        <div className="bm-tile"><span>Public-site account</span><strong>{reg ? 'Yes' : 'No'}</strong><small>{reg?.status ? 'status ' + reg.status : 'not registered online'}</small></div>
      </div>

      <div className="bm-tabs">{TABS.map(([k, label, Icon]) => <button key={k} type="button" className={'bm-tab' + (tab === k ? ' bm-tab-active' : '')} onClick={() => setTab(k)}><Icon size={13} /> {label}</button>)}</div>

      {tab === 'overview' && (
        <div className="bm-grid-2">
          <div className="bm-card">
            <h2 className="bm-h2">Crewing record</h2>
            <dl className="bm-dl bm-dl-dense">
              <KV k="Email" v={c.email} /><KV k="Mobile" v={c.mobile} /><KV k="Rank" v={c.rankname} /><KV k="INDOS" v={c.indosno} /><KV k="Passport" v={c.passport} />
              <KV k="CDC" v={c.cdc} /><KV k="COC" v={c.coc} /><KV k="Expected salary" v={c.salary} /><KV k="Purpose" v={c.purpose} /><KV k="Source" v={c.type} />
              <KV k="Added by" v={c.addedby} /><KV k="Added" v={fmtDate(c.doe, true)} /><KV k="Documents" v={c.documentsr} /><KV k="DP licence" v={c.dp_license} />
              <KV k="Aadhar" v={c.aadharno} /><KV k="PAN" v={c.pancardno} /><KV k="SID" v={c.sidno} /><KV k="Remark" v={c.dremark} />
            </dl>
            {d.blacklist.length > 0 && (
              <div className="bm-alert bm-alert-error" style={{ marginTop: 14 }}>
                {d.blacklist.map((b) => <div key={b._id}><strong>{b.nature || 'Back out'}</strong> · {fmtDate(b.bdate)} · vacancy #{b.vacancyid} — {b.immediate_cause || b.remark}</div>)}
              </div>
            )}
          </div>
          <div className="bm-card">
            <h2 className="bm-h2">Public-site profile</h2>
            {!reg && !ar ? <Empty title="No online profile" text="This seafarer has not registered on the candidate portal (matched by email)." /> : (
              <dl className="bm-dl bm-dl-dense">
                <KV k="Username" v={reg?.uname} /><KV k="Email" v={reg?.emailid || ar?.emailid} /><KV k="Phone" v={reg?.phoneno || ar?.mobileno} /><KV k="Present rank" v={reg?.rank || ar?.presentrank} />
                <KV k="Applied rank" v={reg?.applied_rank || ar?.appliedrank} /><KV k="Passport" v={reg?.passport_no || ar?.passportno} /><KV k="Passport expiry" v={fmtDate(ar?.expdate)} />
                <KV k="Seaman book" v={ar?.seamanbno} /><KV k="Available from" v={fmtDate(ar?.availablefrom)} /><KV k="Available to" v={fmtDate(ar?.availableto)} />
                <KV k="Vessel types" v={Array.isArray(reg?.vesseltypes) ? reg.vesseltypes.join(', ') : ar?.shiptype} /><KV k="City" v={reg?.city || ar?.city} /><KV k="Country" v={reg?.countryname || ar?.country} />
                <KV k="Registered" v={fmtDate(reg?.cdate || reg?.createdAt)} /><KV k="Status" v={reg?.status} />
              </dl>
            )}
          </div>
        </div>
      )}

      {tab === 'proposals' && (
        d.proposals.length === 0 ? <Empty title="No proposals" /> : (
          <div className="bm-table-wrap"><table className="bm-table">
            <thead><tr><th>Vacancy</th><th>Owner</th><th>Rank</th><th>Vessel</th><th>Status</th><th>Joiner</th><th>Salary</th><th>Proposed</th><th>By</th><th>Feedback</th></tr></thead>
            <tbody>{d.proposals.map((p) => (
              <tr key={p._id}><td>{p.vacancy ? <Link to={'/dashboard/bmpl/vacancies?q=' + p.vacancyid} className="bm-link">#{p.vacancyid}</Link> : '#' + (p.vacancyid || '—')}</td><td>{p._display.company_name}</td><td>{p.rank}</td><td>{p.vacancy?.vessel || '—'}</td><td><span className={pill(p.status)}>{p.status}</span></td><td>{p.joiner_type}</td><td>{p.salary} {p.type_days}</td><td className="bm-td-date">{fmtDate(p.date)}</td><td>{p.user}</td><td>{p.feedback}</td></tr>
            ))}</tbody>
          </table></div>
        )
      )}

      {tab === 'contracts' && (
        d.contracts.length === 0 ? <Empty title="No contracts" /> : (
          <div className="bm-table-wrap"><table className="bm-table">
            <thead><tr><th>Contract</th><th>Owner</th><th>Vessel</th><th>Rank</th><th>Type</th><th>Sign on</th><th>Sign off</th><th>Duration</th><th>Reason</th><th>Joiner</th></tr></thead>
            <tbody>{d.contracts.map((x) => (
              <tr key={x._id}><td>#{x.contract_id}</td><td>{x._display.company_name}</td><td>{x.vesselname}</td><td>{x._display.rank_id}</td><td><span className={'bm-pill ' + (x.signtype === 'Signon' ? 'bm-pill-good' : 'bm-pill-muted')}>{x.signtype}</span></td><td className="bm-td-date">{fmtDate(x.signondate)}</td><td className="bm-td-date">{fmtDate(x.signoffdate)}</td><td>{x.contractduration} mo</td><td>{x.reason}</td><td>{x.joiner_type}</td></tr>
            ))}</tbody>
          </table></div>
        )
      )}

      {tab === 'documents' && (
        d.documents.length === 0 ? <Empty title="No documents on file" /> : d.documents.map((doc) => (
          <div className="bm-card" key={doc._id}>
            <h2 className="bm-h2"><FileText size={14} /> {doc.vacancyid ? 'Vacancy #' + doc.vacancyid : 'Document set'} <span className="bm-muted" style={{ fontWeight: 500, fontSize: 12 }}>· filed {fmtDate(doc.cdate)} by {doc.user}</span></h2>
            <dl className="bm-dl bm-dl-dense">
              {['passport', 'cdc', 'coc', 'stcw', 'medical', 'covid', 'visa', 'photo', 'pscrb', 'stsdsd'].filter((k) => doc[k]).map((k) => <div key={k} className="bm-dl-row"><dt>{k.toUpperCase()}</dt><dd>{String(doc[k]).split('/').pop()}{fmtDate(doc[k + '_expiry']) && <span className="bm-muted"> · expires {fmtDate(doc[k + '_expiry'])}</span>}</dd></div>)}
            </dl>
          </div>
        ))
      )}

      {tab === 'travel' && (
        d.travel.length === 0 ? <Empty title="No travel recorded" /> : (
          <div className="bm-table-wrap"><table className="bm-table">
            <thead><tr><th>Date</th><th>From</th><th>To</th><th>Arrival</th><th>Details</th><th>Ticket</th><th>Visa</th><th>Vacancy</th></tr></thead>
            <tbody>{d.travel.map((t) => <tr key={t._id}><td className="bm-td-date">{fmtDate(t.traveldate)}</td><td>{t.travelplace}</td><td>{t.placeto}</td><td className="bm-td-date">{fmtDate(t.arrivaldate)}</td><td>{t.travel_details}</td><td>{t.ticket}</td><td>{t.visa}</td><td>#{t.vacancyid}</td></tr>)}</tbody>
          </table></div>
        )
      )}

      {tab === 'visas' && (
        d.visas.length === 0 ? <Empty title="No visa applications" /> : (
          <div className="bm-table-wrap"><table className="bm-table">
            <thead><tr><th>Visa</th><th>Category</th><th>Visa no.</th><th>Owner</th><th>Vessel</th><th>Amount</th><th>Paid</th><th>Applied</th><th>By</th></tr></thead>
            <tbody>{d.visas.map((v) => <tr key={v._id}><td>{v.visa_type}</td><td>{v.visa_category}</td><td>{v.visa_no}</td><td>{v.company_name}</td><td>{v.vessel}</td><td>{fmtMoney(v.vendor_amount)}</td><td>{v.paidstatus}</td><td className="bm-td-date">{fmtDate(v.doe)}</td><td>{v.created_by}</td></tr>)}</tbody>
          </table></div>
        )
      )}

      {tab === 'medical' && (
        <>
          <div className="bm-card"><h2 className="bm-h2"><Stethoscope size={14} /> Medical requests</h2>
            {d.medicals.length === 0 ? <Empty title="None" /> : <ul className="bm-list">{d.medicals.map((m) => <li key={m._id}><span>{m.medical} · {m.vesselname} · paid by {m.paymentby} · {fmtMoney(m.amount)}</span><span>{fmtDate(m.cdate)}</span></li>)}</ul>}
          </div>
          <div className="bm-card"><h2 className="bm-h2"><Flag size={14} /> Flag documents</h2>
            {d.flags.length === 0 ? <Empty title="None" /> : <ul className="bm-list">{d.flags.map((f) => <li key={f._id}><span>{f.certificate} · {f.vesselname} · {f.certificate_status} · {fmtMoney(f.amount)}</span><span>{fmtDate(f.req_date)}</span></li>)}</ul>}
          </div>
        </>
      )}

      {tab === 'notes' && (
        d.questions.length === 0 ? <Empty title="No interview notes" /> : <div className="bm-card"><ul className="bm-list">{d.questions.map((q) => <li key={q._id}><span>{q.question || q.eng_que}</span><span className="bm-muted">{fmtDate(q.cdate)}</span></li>)}</ul></div>
      )}
    </div>
  );
}
