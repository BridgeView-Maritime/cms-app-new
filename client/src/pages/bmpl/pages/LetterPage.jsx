// client/src/pages/bmpl/pages/LetterPage.jsx
// "Visa Letter" and "Nedpass letter" - the visa undertaking register
// (ksa_visa) for a period: LOI status, payment, consulate appointment, and a
// printable request letter to the consulate, worded as the legacy PDF was.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Pencil, Save, Printer, ArrowLeft } from 'lucide-react';
import { bmpl, fmtDate, fmtMoney } from '../api';
import { Pager, Empty, Alert, FormField, ExportButton } from '../ui';
import { useBmpl } from '../BmplModule';
import CalendarPicker from '../../../components/CalendarPicker';

const VIEWS = [['', 'All'], ['loi-pending', 'LOI not received'], ['loi-received', 'LOI received'], ['unpaid', 'Not paid'], ['paid', 'Paid'], ['not-received', 'Visa not received'], ['cancellation', 'Cancellations']];
const yearStart = () => new Date().toISOString().slice(0, 4) + '-01-01';
const todayStr = () => new Date().toISOString().slice(0, 10);
const EDIT = (opts) => [
  { key: 'visa_type', label: 'Visa type', type: 'select', options: opts.types || [] }, { key: 'visa_category', label: 'Category', type: 'select', options: ['New', 'Cancellation'] },
  { key: 'txt_vagent', label: 'Visa agent', type: 'lookup' }, { key: 'consulate', label: 'Consulate', type: 'select', options: ['Mumbai', 'New Delhi'] }, { key: 'appointment', label: 'Appointment', type: 'date' },
  { key: 'loireceiveddate', label: 'LOI received', type: 'date' }, { key: 'agentsentdate', label: 'Sent to agent', type: 'date' }, { key: 'statusin', label: 'Visa status', type: 'select', options: ['RECEIVED', 'NOT RECEIVED'] },
  { key: 'visa_no', label: 'Visa number' }, { key: 'visa_issuance', label: 'Visa issued', type: 'date' }, { key: 'visa_expiry', label: 'Visa expiry', type: 'date' },
  { key: 'vendor_amount', label: 'Vendor amount', type: 'number' }, { key: 'rate', label: 'Rate charged', type: 'number' }, { key: 'paidstatus', label: 'Vendor paid', type: 'select', options: ['Paid', 'Not Paid'] }, { key: 'paytobmpl', label: 'Paid to BMPL', type: 'select', options: ['Paid', 'Not Paid'] }, { key: 'paidby', label: 'Paid by' }, { key: 'paidamount', label: 'Amount paid', type: 'number' },
  { key: 'proceed_country', label: 'Proceeding to' }, { key: 'proceed_city', label: 'City' }, { key: 'commencing_from', label: 'From', type: 'date' }, { key: 'commencing_to', label: 'To', type: 'date' }, { key: 'cancel_remark', label: 'Remark', type: 'textarea' },
];

function Letter({ id, onBack }) {
  const [d, setD] = useState(null);
  const { user } = useBmpl();
  useEffect(() => { bmpl('/letters/' + id).then(setD); }, [id]);
  if (!d) return <div className="bm-loading">Loading…</div>;
  if (!d.success) return <Alert msg={{ type: 'error', text: d.message }} />;
  const l = d.letter, p = d.person, c = d.companyDoc;
  const ned = /ned/i.test(l.visa_type || '') || /ned/i.test(l.visa_category || '');
  const addressee = String(l.txt_vagent) === '207' ? ['Head of Consular, Visa Section,', 'The Royal Consulate of Saudi Arabia, New Delhi.'] : l.consulate === 'Mumbai' ? ['The Royal Consulate of Saudi Arabia, Mumbai'] : ['The Royal Embassy of Saudi Arabia, New Delhi'];
  return (
    <div>
      <div className="bm-page-head bm-screen-only">
        <div><button type="button" className="bm-back bm-btn bm-btn-ghost" onClick={onBack}><ArrowLeft size={14} /> Back to list</button></div>
        <div className="bm-actions"><button type="button" className="bm-btn bm-btn-primary" onClick={() => window.print()}><Printer size={14} /> Print letter</button></div>
      </div>
      <div className="bm-letter">
        <div className="bm-letter-head"><div><h2>Bridgeview Maritime Pvt. Ltd.</h2><div>Ship management &amp; crewing · RPSL</div></div><div style={{ textAlign: 'right' }}>Ref No: BMPL/{ned ? 'NED' : 'VISA'}/{l.ksa_id}<br />Date: {fmtDate(l.doe) || fmtDate(todayStr())}</div></div>
        <p>To,<br />{ned ? <>The Manager,<br />{l.agent || 'NED Pass issuing authority'}</> : addressee.map((a) => <span key={a}>{a}<br /></span>)}</p>
        <p><strong>Subject: {ned ? 'Request to issue NED pass for our below mentioned seafarer' : 'Request to issue ' + (l.visa_type || 'KSA VISA') + ' for our below mentioned seafarer'}</strong></p>
        <p>Dear Sir/Madam,</p>
        <p>We are submitting herewith the {ned ? 'NED pass application' : 'business visit visa application'} for the employee of <strong>{c?.company_name || l.company}</strong>{c?.address ? ', ' + c.address : ''} to travel to {l.proceed_country || 'Saudi Arabia'}. He is holding an Indian seaman book.</p>
        <p>Please find enclosed the {ned ? 'application form' : 'visa form'}, passport, photographs and relevant documents as per requirement.</p>
        <table><tbody>
          <tr><th>Name</th><td>{l.name || p?.name}</td><th>Passport No</th><td>{l.passportno || p?.passport}</td></tr>
          <tr><th>Date of birth</th><td>{fmtDate(l.dob) || fmtDate(p?.dob)}</td><th>Rank</th><td>{l.visa_rank || l.rank || p?.rankname}</td></tr>
          <tr><th>INDOS</th><td>{l.indosno}</td><th>Vessel</th><td>{l.vesselname || l.vessel || '—'}</td></tr>
          {(l.commencing_from || l.proceed_city) && <tr><th>Period</th><td>{fmtDate(l.commencing_from)}{l.commencing_to ? ' – ' + fmtDate(l.commencing_to) : ''}</td><th>City</th><td>{l.proceed_city || '—'}</td></tr>}
        </tbody></table>
        <p>We request you to kindly grant {ned ? 'the pass' : 'his visa'} to enable him to travel.</p>
        <p>Best Regards,</p>
        <div className="bm-sign"><div><br /><br />______________________<br />Authorised Signatory<br />{l.staff || user?.username}<br />Bridgeview Maritime Pvt. Ltd.</div><div>{l.agent && <>Visa agent: {l.agent}</>}</div></div>
      </div>
    </div>
  );
}

const EXPORT_COLUMNS = [{ key: 'ksa_id', label: '#' }, { key: 'name', label: 'Seafarer' }, { key: 'indosno', label: 'INDOS' }, { key: 'passportno', label: 'Passport' }, { key: 'company', label: 'Owner' }, { key: 'visa_type', label: 'Visa type' }, { key: 'visa_category', label: 'Category' }, { key: 'agent', label: 'Agent' }, { label: 'LOI received', get: (r) => fmtDate(r.loireceiveddate) }, { label: 'Appointment', get: (r) => fmtDate(r.appointment) }, { key: 'consulate', label: 'Consulate' }, { key: 'vendor_amount', label: 'Vendor amount' }, { key: 'paidstatus', label: 'Vendor paid' }, { key: 'paytobmpl', label: 'Paid to BMPL' }, { key: 'statusin', label: 'Visa status' }, { key: 'visa_no', label: 'Visa no.' }, { label: 'Raised', get: (r) => fmtDate(r.doe) }, { key: 'created_by', label: 'By' }];

export default function LetterPage({ kind }) {
  const ned = kind === 'nedpass';
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(todayStr());
  const [view, setView] = useState('');
  const [company, setCompany] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [letterId, setLetterId] = useState(null);

  useEffect(() => { bmpl('/letters/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  const load = () => bmpl('/letters', { params: { kind, from, to, view, companyid: company, q, page, limit: 25 } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [kind, from, to, view, company, q, page]);
  const save = async (e) => { e.preventDefault(); setBusy(true); setMsg(null); const d = await bmpl('/letters/' + editing, { method: 'PUT', body: draft }); setBusy(false); if (d.success) { setEditing(null); load(); } else setMsg({ type: 'error', text: d.message }); };

  if (letterId) return <Letter id={letterId} onBack={() => setLetterId(null)} />;
  return (
    <div>
      <div className="bm-page-head"><div><h1>{ned ? 'Nedpass letter' : 'Visa Letter'}</h1><p>{ned ? 'NED pass requests: LOI, payment and status per seafarer, with a printable request letter.' : 'Visa undertakings (KSA and others): LOI, agent, consulate appointment, payment and visa status, with the printable consulate letter.'}</p></div><div className="bm-actions"><ExportButton path={'/letters'} params={{ kind, from, to, view, companyid: company, q }} columns={EXPORT_COLUMNS} name={ned ? 'nedpass-letters' : 'visa-letters'} disabled={!data?.total} onDone={setMsg} /></div></div>
      <Alert msg={msg} />
      {editing && (
        <form onSubmit={save} className="bm-card">
          <h2 className="bm-h2">Update visa record</h2>
          <div className="bm-form-grid">{EDIT(opts).map((f) => <FormField key={f.key} field={f} value={draft[f.key]} options={f.key === 'txt_vagent' ? opts.agent : undefined} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} disabled={busy} />)}</div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary" disabled={busy}><Save size={14} /> Save</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setEditing(null)}><X size={14} /> Cancel</button></div>
        </form>
      )}
      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Name, INDOS, passport, owner, visa no." /></div>
        <CalendarPicker value={from} onChange={(v) => { setFrom(v); setPage(1); }} prefix="bm" size="sm" /><CalendarPicker value={to} onChange={(v) => { setTo(v); setPage(1); }} prefix="bm" size="sm" />
        <select className="bm-select" value={view} onChange={(e) => { setView(e.target.value); setPage(1); }}>{VIEWS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="bm-select" value={company} onChange={(e) => { setCompany(e.target.value); setPage(1); }}><option value="">All · Owner</option>{(opts.company || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </div>
      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title={ned ? 'No NED pass requests in this period' : 'No visa requests match'} text={ned ? 'NED pass records are visa records whose type mentions “NED”. Add them under Visa Letter or the KSA Visa list.' : ''} /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>#</th><th>Seafarer</th><th>Owner</th><th>Visa</th><th>Agent</th><th>LOI</th><th>Appointment</th><th>Vendor amount</th><th>Paid</th><th>To BMPL</th><th>Visa status</th><th>Raised</th><th></th></tr></thead>
            <tbody>{data.records.map((r) => (
              <tr key={r._id}>
                <td>{r.ksa_id}</td><td><strong>{r.name}</strong><div className="bm-muted">{r.indosno} · {r.passportno}{r.rank ? ' · ' + r.rank : ''}</div></td><td>{r.company}</td>
                <td>{r.visa_type}<div className="bm-muted">{r.visa_category}</div></td><td>{r.agent}</td>
                <td>{r.loiReceived ? <span className="bm-pill bm-pill-good">{fmtDate(r.loireceiveddate)}</span> : <span className="bm-pill bm-pill-warn">Pending</span>}</td>
                <td className="bm-td-date">{fmtDate(r.appointment)}{r.consulate ? <div className="bm-muted">{r.consulate}</div> : null}</td>
                <td className="bm-td-money">{fmtMoney(r.vendor_amount || r.rate)}</td>
                <td><span className={'bm-pill ' + (r.paidstatus === 'Paid' ? 'bm-pill-good' : 'bm-pill-muted')}>{r.paidstatus || '—'}</span></td><td>{r.paytobmpl}</td>
                <td><span className={'bm-pill ' + (/^\s*RECEIVED/i.test(r.statusin || '') ? 'bm-pill-good' : 'bm-pill-warn')}>{(r.statusin || '').trim() || '—'}</span>{r.visa_no ? <div className="bm-muted">{r.visa_no}</div> : null}</td>
                <td className="bm-td-date">{fmtDate(r.doe)}<div className="bm-muted">{r.created_by}</div></td>
                <td className="bm-inline"><button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" title="Edit" onClick={() => { setDraft(Object.fromEntries(EDIT(opts).map((f) => [f.key, r[f.key] ?? '']))); setEditing(r._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={12} /></button><button type="button" className="bm-btn bm-btn-sm" title="Letter" onClick={() => setLetterId(r._id)}><Printer size={12} /> Letter</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
      <p className="bm-muted">Full visa records, including cancellations and receipts, are under <Link className="bm-link" to="/dashboard/bmpl/r/ksaVisas">KSA Visa</Link>.</p>
    </div>
  );
}
