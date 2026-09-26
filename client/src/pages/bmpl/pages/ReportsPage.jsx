// client/src/pages/bmpl/pages/ReportsPage.jsx
// The "Report" menu. One component, seven reports:
//   month-end          movements, proposals and executive output in a period
//   candidate          one seafarer's complete history
//   crew-welfare       everyone currently on board (per owner / vessel)
//   crew-welfare-govt  the same list in the government (RPSL) layout
//   all                month-end + expenses side by side
//   expenses           money out / invoiced in a period
//   signoff            sign-offs in a period, with reasons and contacts
// Every report prints cleanly (window.print) and exports CSV.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer, Download, Search } from 'lucide-react';
import { bmpl, fmtDate, fmtMoney, saveBlob } from '../api';
import { Alert, Empty } from '../ui';
import CalendarPicker from '../../../components/CalendarPicker';

const TITLES = { 'month-end': 'Month End Report', candidate: 'Candidate Information', 'crew-welfare': 'Crew Welfare Report', 'crew-welfare-govt': 'Crew Welfare - GOVT Report', all: 'All Report', expenses: 'BMPL Expenses Report', signoff: 'Signoff Data Report' };
const monthStart = () => new Date().toISOString().slice(0, 8) + '01';
const todayStr = () => new Date().toISOString().slice(0, 10);

export function toCsv(rows, columns) {
  const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))].join('\n');
}
export function downloadCsv(name, rows, columns) {
  saveBlob(new Blob(['﻿' + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' }), name + '.csv');
}

function Table({ rows, columns, empty = 'Nothing in this period' }) {
  if (!rows || rows.length === 0) return <Empty title={empty} />;
  return (
    <div className="bm-table-wrap">
      <table className="bm-table">
        <thead><tr>{columns.map((c) => <th key={c.key || c.label}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r._id || i}>{columns.map((c) => <td key={c.key || c.label} className={c.className}>{typeof c.render === 'function' ? c.render(r) : typeof c.get === 'function' ? c.get(r) : r[c.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
function Counts({ title, rows, unit = '' }) {
  if (!rows || rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.n ?? r.amount ?? 0), 1);
  return (
    <div className="bm-card">
      <h2 className="bm-h2">{title}</h2>
      <ul className="bm-bars">{rows.slice(0, 15).map((r) => <li key={r.label}><span className="bm-bars-label" title={r.label}>{r.label}</span><span className="bm-bars-track"><span style={{ width: Math.round(((r.n ?? r.amount) / max) * 100) + '%' }} /></span><strong>{r.amount !== undefined ? fmtMoney(r.amount) : r.n}{unit}</strong></li>)}</ul>
    </div>
  );
}
const Tiles = ({ items }) => <div className="bm-tiles">{items.map(([label, value]) => <div key={label} className="bm-tile"><span>{label}</span><strong>{typeof value === 'number' ? value.toLocaleString() : value ?? '—'}</strong></div>)}</div>;

export default function ReportsPage({ report }) {
  const [sp] = useSearchParams();
  const [from, setFrom] = useState(sp.get('from') || monthStart());
  const [to, setTo] = useState(sp.get('to') || todayStr());
  const [company, setCompany] = useState('');
  const [reason, setReason] = useState('');
  const [q, setQ] = useState(sp.get('q') || '');
  const [indos, setIndos] = useState('');
  const [opts, setOpts] = useState({ company: [] });
  const [data, setData] = useState(null);
  const [extra, setExtra] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { bmpl('/reports/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  const run = async () => {
    setBusy(true); setMsg(null); setData(null); setExtra(null);
    const params = { from, to, company_name: company, reason };
    let d;
    if (report === 'candidate') { if (!q.trim()) { setBusy(false); return; } d = await bmpl('/reports/candidate', { params: { q: q.trim(), indos } }); }
    else if (report === 'crew-welfare' || report === 'crew-welfare-govt') d = await bmpl('/reports/crew-welfare', { params: { company_name: company } });
    else if (report === 'expenses') d = await bmpl('/reports/expenses', { params });
    else if (report === 'signoff') d = await bmpl('/reports/signoff', { params });
    else { d = await bmpl('/reports/month-end', { params }); if (report === 'all' && d.success) { const e = await bmpl('/reports/expenses', { params }); if (e.success) setExtra(e); } }
    setBusy(false);
    if (d.success) setData(d); else setMsg({ type: 'error', text: d.message });
  };
  useEffect(() => { if (report !== 'candidate' || q) run(); }, [report, indos]);

  const title = TITLES[report] || 'Report';
  const periodLabel = report === 'candidate' ? '' : report.startsWith('crew-welfare') ? 'as of ' + fmtDate(todayStr()) : fmtDate(from) + ' – ' + fmtDate(to);
  const csv = useMemo(() => {
    if (!data) return null;
    if (report === 'signoff') return ['signoffs', data.records, [{ key: 'vcan_id', label: 'INDOS' }, { key: 'fullname', label: 'Name' }, { key: 'company', label: 'Owner' }, { key: 'vessel', label: 'Vessel' }, { key: 'rank', label: 'Rank' }, { key: 'signondate', label: 'Sign-on' }, { key: 'signoffdate', label: 'Sign-off' }, { key: 'reason', label: 'Reason' }, { key: 'remark', label: 'Remark' }, { key: 'davailable', label: 'Available' }, { key: 'email', label: 'Email' }, { key: 'mobile', label: 'Mobile' }]];
    if (report.startsWith('crew-welfare')) return ['crew-onboard', data.records, [{ key: 'vcan_id', label: 'INDOS' }, { key: 'fullname', label: 'Name' }, { key: 'rank', label: 'Rank' }, { key: 'company', label: 'Owner' }, { key: 'vessel', label: 'Vessel' }, { key: 'signondate', label: 'Sign-on' }, { key: 'contractduration', label: 'Contract' }, { key: 'expsignoffdate', label: 'Exp. sign-off' }, { key: 'daysOnboard', label: 'Days' }, { key: 'joiner', label: 'Joiner' }, { key: 'passport', label: 'Passport' }, { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' }, { key: 'nok', label: 'NOK' }, { key: 'relation', label: 'Relation' }, { key: 'nokdetails', label: 'NOK contact' }]];
    if (report === 'expenses') return ['expenses', data.payments, [{ key: 'payment_date', label: 'Date' }, { key: 'category', label: 'Category' }, { key: 'fullname', label: 'Candidate' }, { key: 'indosno', label: 'INDOS' }, { key: 'payment_to', label: 'Paid to' }, { key: 'payment_method', label: 'Method' }, { key: 'payment_amount', label: 'Amount' }, { key: 'payment_status', label: 'Status' }, { key: 'add_by', label: 'By' }]];
    if (report === 'candidate') return ['candidate-' + (data.person?.indosno || ''), data.contracts, [{ key: 'company', label: 'Owner' }, { key: 'vesselname', label: 'Vessel' }, { key: 'rank', label: 'Rank' }, { key: 'signondate', label: 'Sign-on' }, { key: 'signoffdate', label: 'Sign-off' }, { key: 'reason', label: 'Reason' }]];
    return ['signons', data.signons, [{ key: 'vcan_id', label: 'INDOS' }, { key: 'fullname', label: 'Name' }, { key: 'company', label: 'Owner' }, { key: 'vessel', label: 'Vessel' }, { key: 'rank', label: 'Rank' }, { key: 'joiner', label: 'Joiner' }, { key: 'date', label: 'Sign-on' }]];
  }, [data, report]);

  return (
    <div className="bm-report">
      <div className="bm-page-head">
        <div><h1>{title}</h1><p className="bm-print-only">{periodLabel}</p><p className="bm-screen-only">{report === 'candidate' ? 'Everything on record for one seafarer: contracts, proposals, vaccinations, visas, documents and payments.' : report.startsWith('crew-welfare') ? 'Everyone currently signed on, by owner and vessel, with next of kin.' : report === 'expenses' ? 'Payments made, vendor charges and invoices raised in the period.' : report === 'signoff' ? 'Sign-offs in the period, with reason and contact details.' : 'Movements, proposals, vacancies and executive output in the period.'}</p></div>
        <div className="bm-actions">
          {csv && csv[1]?.length > 0 && <button type="button" className="bm-btn" onClick={() => downloadCsv(csv[0] + '-' + from + '-' + to, csv[1], csv[2])}><Download size={14} /> CSV</button>}
          <button type="button" className="bm-btn" onClick={() => window.print()}><Printer size={14} /> Print</button>
        </div>
      </div>
      <Alert msg={msg} />
      <form className="bm-toolbar" onSubmit={(e) => { e.preventDefault(); run(); }}>
        {report === 'candidate' ? (
          <div className="bm-search"><Search size={15} /><input type="search" value={q} onChange={(e) => { setQ(e.target.value); setIndos(''); }} placeholder="INDOS, name, email, passport or mobile" autoFocus /></div>
        ) : (
          <>
            {!report.startsWith('crew-welfare') && <><CalendarPicker value={from} onChange={(v) => setFrom(v)} prefix="bm" size="sm" /><CalendarPicker value={to} onChange={(v) => setTo(v)} prefix="bm" size="sm" /></>}
            <select className="bm-select" value={company} onChange={(e) => setCompany(e.target.value)}><option value="">All owners</option>{opts.company.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            {report === 'signoff' && <select className="bm-select" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">All reasons</option>{(data?.reasons || []).map((r) => <option key={r} value={r}>{r}</option>)}</select>}
            {['month-end', 'all', 'expenses', 'signoff'].includes(report) && <div className="bm-inline">{[['This month', monthStart(), todayStr()], ['Last month', new Date(new Date().getFullYear(), new Date().getMonth() - 1, 2).toISOString().slice(0, 8) + '01', new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10)], ['This year', todayStr().slice(0, 4) + '-01-01', todayStr()]].map(([l, f, t]) => <button key={l} type="button" className="bm-btn bm-btn-sm bm-btn-ghost" onClick={() => { setFrom(f); setTo(t); }}>{l}</button>)}</div>}
          </>
        )}
        <button type="submit" className="bm-btn bm-btn-primary" disabled={busy}>{busy ? 'Running…' : 'Run report'}</button>
      </form>

      {busy && !data && <div className="bm-loading">Building the report…</div>}
      {!busy && !data && report === 'candidate' && <Empty title="Search for a seafarer" text="Type an INDOS number or name and run the report." />}

      {data && (report === 'month-end' || report === 'all') && <MonthEnd d={data} />}
      {data && report === 'all' && extra && <ExpensesReport d={extra} compact />}
      {data && report === 'expenses' && <ExpensesReport d={data} />}
      {data && report === 'signoff' && <SignoffReport d={data} />}
      {data && report.startsWith('crew-welfare') && <CrewWelfare d={data} govt={report === 'crew-welfare-govt'} />}
      {data && report === 'candidate' && <CandidateReport d={data} onPick={(i) => setIndos(i)} />}
    </div>
  );
}

function MonthEnd({ d }) {
  const t = d.totals;
  return (
    <>
      <Tiles items={[['Sign-ons', t.signons], ['Sign-offs', t.signoffs], ['Proposals made', t.proposals], ['Selected', t.selected], ['Vacancies raised', t.vacanciesRaised], ['Vacancies closed', t.vacanciesClosed], ['Tasks assigned', t.tasksAssigned], ['Tasks acknowledged', t.tasksAcknowledged], ['Candidates added', t.candidatesAdded]]} />
      <div className="bm-card">
        <h2 className="bm-h2">Executive output (proposals in the period)</h2>
        <Table rows={d.executives} empty="No proposals in this period" columns={[{ key: 'user', label: 'Executive' }, { key: 'proposed', label: 'Candidates proposed' }, { key: 'pending', label: 'Under process' }, { key: 'selected', label: 'Selected' }, { label: 'Selection rate', get: (r) => (r.proposed ? Math.round((r.selected / r.proposed) * 100) + '%' : '—') }, { label: 'Owners selected for', get: (r) => r.companies.join(', ') }]} />
      </div>
      <div className="bm-grid-2">
        <Counts title="Sign-ons by owner" rows={d.signonsByCompany} /><Counts title="Sign-ons by rank" rows={d.signonsByRank} />
        <Counts title="Sign-ons by joiner type" rows={d.signonsByJoiner} /><Counts title="Sign-ons recorded by" rows={d.signonsByUser} />
        <Counts title="Sign-offs by owner" rows={d.signoffsByCompany} /><Counts title="Sign-offs by reason" rows={d.signoffsByReason} />
        <Counts title="Proposals by status" rows={d.proposalsByStatus} /><Counts title="Proposals by owner" rows={d.proposalsByCompany} />
        <Counts title="Sourced by" rows={d.sourcers} />
      </div>
      <div className="bm-card"><h2 className="bm-h2">Sign-ons ({d.totals.signons})</h2><Table rows={d.signons} columns={[{ key: 'fullname', label: 'Name' }, { key: 'vcan_id', label: 'INDOS' }, { key: 'company', label: 'Owner' }, { key: 'vessel', label: 'Vessel' }, { key: 'rank', label: 'Rank' }, { key: 'joiner', label: 'Joiner' }, { key: 'vacancy', label: 'Vacancy' }, { label: 'Signed on', get: (r) => fmtDate(r.date), className: 'bm-td-date' }]} /></div>
      <div className="bm-card"><h2 className="bm-h2">Sign-offs ({d.totals.signoffs})</h2><Table rows={d.signoffs} columns={[{ key: 'fullname', label: 'Name' }, { key: 'vcan_id', label: 'INDOS' }, { key: 'company', label: 'Owner' }, { key: 'vessel', label: 'Vessel' }, { key: 'rank', label: 'Rank' }, { key: 'reason', label: 'Reason' }, { label: 'Signed off', get: (r) => fmtDate(r.date), className: 'bm-td-date' }]} /></div>
    </>
  );
}

function ExpensesReport({ d, compact }) {
  const t = d.totals;
  return (
    <>
      <Tiles items={[['Payments made', fmtMoney(t.payments)], ['Invoiced to owners', fmtMoney(t.invoiced)], ['Invoices', t.invoicesCount], ['Visa vendor charges', fmtMoney(t.visaVendor)], ['Medical charges', fmtMoney(t.medical)], ['Vendor invoices', t.vendorInvoices]]} />
      <div className="bm-grid-2"><Counts title="Payments by category" rows={d.paymentsByCategory} /><Counts title="Invoiced by owner" rows={d.invoicedByCompany} /></div>
      {!compact && (
        <>
          <div className="bm-card"><h2 className="bm-h2">Payments ({d.payments.length})</h2><Table rows={d.payments} columns={[{ label: 'Date', get: (r) => fmtDate(r.payment_date), className: 'bm-td-date' }, { key: 'category', label: 'Category' }, { key: 'fullname', label: 'Candidate' }, { key: 'indosno', label: 'INDOS' }, { key: 'payment_to', label: 'Paid to' }, { key: 'payment_method', label: 'Method' }, { label: 'Amount', get: (r) => fmtMoney(r.payment_amount), className: 'bm-td-money' }, { key: 'payment_status', label: 'Status' }, { key: 'add_by', label: 'By' }]} /></div>
          <div className="bm-card"><h2 className="bm-h2">Invoices raised ({d.invoices.length})</h2><Table rows={d.invoices} columns={[{ label: 'Date', get: (r) => fmtDate(r.doe), className: 'bm-td-date' }, { key: 'invoic_no', label: 'Invoice' }, { key: 'company', label: 'Owner' }, { key: 'fullname', label: 'Crew' }, { key: 'vesselname', label: 'Vessel' }, { key: 'rankname', label: 'Rank' }, { label: 'Amount', get: (r) => fmtMoney(r.amount), className: 'bm-td-money' }, { label: 'Paid', get: (r) => (Number(r.cancelinvoice) ? 'Cancelled' : r.invoice_payed || '—') }]} /></div>
          <div className="bm-card"><h2 className="bm-h2">Visa requests ({d.visas.length})</h2><Table rows={d.visas} columns={[{ label: 'Date', get: (r) => fmtDate(r.doe), className: 'bm-td-date' }, { key: 'name', label: 'Candidate' }, { key: 'indosno', label: 'INDOS' }, { key: 'company', label: 'Owner' }, { key: 'visa_type', label: 'Visa' }, { key: 'visa_category', label: 'Category' }, { label: 'Vendor amount', get: (r) => fmtMoney(r.vendor_amount || r.rate), className: 'bm-td-money' }, { key: 'paidstatus', label: 'Paid' }, { key: 'paytobmpl', label: 'To BMPL' }]} /></div>
          <div className="bm-card"><h2 className="bm-h2">Medical requests ({d.medicals.length})</h2><Table rows={d.medicals} columns={[{ label: 'Date', get: (r) => fmtDate(r.cdate), className: 'bm-td-date' }, { key: 'indosno', label: 'INDOS' }, { key: 'company', label: 'Owner' }, { key: 'medical', label: 'Medical' }, { label: 'Amount', get: (r) => fmtMoney(r.amount || r.rate), className: 'bm-td-money' }, { key: 'paymentby', label: 'Paid by' }]} /></div>
          <div className="bm-card"><h2 className="bm-h2">Vendor invoices ({d.vendorInvoices.length})</h2><Table rows={d.vendorInvoices} columns={[{ label: 'Date', get: (r) => fmtDate(r.cdate), className: 'bm-td-date' }, { key: 'inv_count', label: '#' }, { key: 'invoice', label: 'Category' }, { key: 'vendorName', label: 'Vendor' }, { key: 'company', label: 'Owner' }, { key: 'items', label: 'Items' }, { label: 'Period', get: (r) => fmtDate(r.fromdate) + ' – ' + fmtDate(r.todate) }, { key: 'doneby', label: 'By' }]} /></div>
        </>
      )}
    </>
  );
}

function SignoffReport({ d }) {
  return (
    <>
      <Tiles items={[['Sign-offs', d.records.length], ['Owners', d.byCompany.length], ['Reasons', d.byReason.length]]} />
      <div className="bm-grid-2"><Counts title="By reason" rows={d.byReason} /><Counts title="By owner" rows={d.byCompany} /></div>
      <div className="bm-card"><Table rows={d.records} columns={[{ key: 'fullname', label: 'Name' }, { key: 'vcan_id', label: 'INDOS' }, { key: 'company', label: 'Owner' }, { key: 'vessel', label: 'Vessel' }, { key: 'rank', label: 'Rank' }, { label: 'Sign-on', get: (r) => fmtDate(r.signondate), className: 'bm-td-date' }, { label: 'Sign-off', get: (r) => fmtDate(r.signoffdate), className: 'bm-td-date' }, { key: 'reason', label: 'Reason' }, { key: 'remark', label: 'Remark', className: 'bm-td-wrap' }, { label: 'Available', get: (r) => fmtDate(r.davailable), className: 'bm-td-date' }, { key: 'email', label: 'Email' }, { key: 'mobile', label: 'Mobile' }, { key: 'by', label: 'By' }]} /></div>
    </>
  );
}

function CrewWelfare({ d, govt }) {
  const groups = useMemo(() => { const m = new Map(); for (const r of d.records) { const k = r.company || '—'; if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return [...m.entries()].sort((a, b) => b[1].length - a[1].length); }, [d]);
  const cols = govt
    ? [{ label: 'Sr.', get: (r) => r.sr }, { key: 'fullname', label: 'Name of seafarer' }, { key: 'vcan_id', label: 'INDOS' }, { key: 'passport', label: 'Passport' }, { key: 'rank', label: 'Rank' }, { key: 'vessel', label: 'Vessel' }, { label: 'Date of joining', get: (r) => fmtDate(r.signondate), className: 'bm-td-date' }, { label: 'Contract', get: (r) => (r.contractduration ? r.contractduration + ' months' : '') }, { label: 'Expected relief', get: (r) => fmtDate(r.expsignoffdate), className: 'bm-td-date' }, { label: 'Port / country of joining', get: (r) => [r.port, r.country].filter(Boolean).join(', ') }, { label: 'Next of kin', get: (r) => [r.nok, r.relation].filter(Boolean).join(' - ') }, { key: 'nokdetails', label: 'NOK contact' }]
    : [{ key: 'fullname', label: 'Name' }, { key: 'vcan_id', label: 'INDOS' }, { key: 'rank', label: 'Rank' }, { key: 'vessel', label: 'Vessel' }, { label: 'Signed on', get: (r) => fmtDate(r.signondate), className: 'bm-td-date' }, { label: 'Days', get: (r) => r.daysOnboard }, { label: 'Exp. sign-off', render: (r) => <span className={r.expsignoffdate && r.expsignoffdate < todayStr() ? 'bm-pill bm-pill-bad' : ''}>{fmtDate(r.expsignoffdate)}</span> }, { key: 'joiner', label: 'Joiner' }, { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' }, { label: 'NOK', get: (r) => [r.nok, r.relation, r.nokdetails].filter(Boolean).join(' · ') }];
  return (
    <>
      <Tiles items={[['Crew on board', d.records.length], ['Owners', d.byCompany.length], ['Vessels', d.byVessel.length], ['Past expected sign-off', d.overdue]]} />
      {!govt && <div className="bm-grid-2"><Counts title="By owner" rows={d.byCompany} /><Counts title="By rank" rows={d.byRank} /></div>}
      {govt && d.agencies?.length > 0 && <div className="bm-card bm-print-only"><h2 className="bm-h2">RPSL</h2>{d.agencies.map((a) => <div key={a._id}><strong>{a.rpsl_name}</strong> {a.address} · {a.email} · {a.mobile}</div>)}</div>}
      {groups.map(([company, rows]) => <div key={company} className="bm-card"><h2 className="bm-h2">{company} <span className="bm-muted">({rows.length})</span></h2><Table rows={rows.map((r, i) => ({ ...r, sr: i + 1 }))} columns={cols} /></div>)}
    </>
  );
}

function CandidateReport({ d, onPick }) {
  const p = d.person;
  if (!p) return <Empty title="No seafarer matches" />;
  return (
    <>
      {d.matches.length > 1 && <div className="bm-chips bm-screen-only">{d.matches.map((m) => <button key={m._id} type="button" className={'bm-btn bm-btn-sm ' + (m._id === p._id ? 'bm-btn-primary' : 'bm-btn-ghost')} onClick={() => onPick(m.indosno)}>{m.name} · {m.indosno}</button>)}</div>}
      <div className="bm-card">
        <h2 className="bm-h2">{p.name} <span className="bm-muted">· {p.indosno}</span> <Link className="bm-link bm-screen-only" to={'/dashboard/bmpl/candidates/' + p._id}>open profile</Link></h2>
        <dl className="bm-dl bm-dl-dense">{[['Rank', p.rankname], ['Passport', p.passport], ['Date of birth', fmtDate(p.dob)], ['Nationality', p.nationality], ['Email', p.email], ['Mobile', p.mobile], ['Address', p.address], ['On file since', fmtDate(p.doe)], ['Total sea time on record', d.seaDays ? Math.round(d.seaDays / 30) + ' months (' + d.seaDays + ' days)' : '']].filter(([, v]) => v).map(([k, v]) => <div key={k} className="bm-dl-row"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </div>
      <div className="bm-card"><h2 className="bm-h2">Sea service ({d.contracts.length})</h2><Table rows={d.contracts} empty="No contracts on record" columns={[{ key: 'company', label: 'Owner' }, { key: 'vesselname', label: 'Vessel' }, { key: 'rank', label: 'Rank' }, { label: 'Sign-on', get: (r) => fmtDate(r.signondate), className: 'bm-td-date' }, { label: 'Sign-off', get: (r) => fmtDate(r.signoffdate) || 'On board', className: 'bm-td-date' }, { key: 'reason', label: 'Reason' }, { key: 'joiner_type', label: 'Joiner' }]} /></div>
      <div className="bm-card"><h2 className="bm-h2">Proposals ({d.proposals.length})</h2><Table rows={d.proposals} empty="Never proposed" columns={[{ label: 'Vacancy', get: (r) => '#' + r.vacancyid }, { key: 'company', label: 'Owner' }, { key: 'rank', label: 'Rank' }, { key: 'salary', label: 'Salary' }, { key: 'status', label: 'Status' }, { label: 'Date', get: (r) => fmtDate(r.date), className: 'bm-td-date' }, { key: 'user', label: 'By' }, { key: 'remark', label: 'Remark', className: 'bm-td-wrap' }]} /></div>
      <div className="bm-grid-2">
        <div className="bm-card"><h2 className="bm-h2">Vaccinations ({d.vaccines.length})</h2><Table rows={d.vaccines} empty="None recorded" columns={[{ key: 'vaccine_name', label: 'Vaccine' }, { label: 'Dose 1', get: (r) => fmtDate(r.takendate) }, { key: 'vaccine_name2', label: 'Vaccine 2' }, { label: 'Dose 2', get: (r) => fmtDate(r.takendate2) }, { key: 'company', label: 'Owner' }]} /></div>
        <div className="bm-card"><h2 className="bm-h2">Visas ({d.visas.length})</h2><Table rows={d.visas} empty="None recorded" columns={[{ key: 'visa_type', label: 'Visa' }, { key: 'visa_category', label: 'Category' }, { key: 'company_name', label: 'Owner' }, { key: 'visa_no', label: 'Visa no.' }, { label: 'Issued', get: (r) => fmtDate(r.visa_issuance) }, { label: 'Expiry', get: (r) => fmtDate(r.visa_expiry) }, { key: 'paidstatus', label: 'Paid' }]} /></div>
        <div className="bm-card"><h2 className="bm-h2">Payments ({d.payments.length})</h2><Table rows={d.payments} empty="None recorded" columns={[{ label: 'Date', get: (r) => fmtDate(r.payment_date) }, { key: 'category', label: 'Category' }, { key: 'payment_to', label: 'Paid to' }, { label: 'Amount', get: (r) => fmtMoney(r.payment_amount) }, { key: 'payment_status', label: 'Status' }]} /></div>
        <div className="bm-card"><h2 className="bm-h2">Documents on file</h2>{d.documents.length === 0 ? <Empty title="No document set" /> : <dl className="bm-dl bm-dl-dense">{['passport', 'cdc', 'coc', 'stcw', 'medical', 'covid', 'visa', 'photo'].filter((k) => d.documents[0][k]).map((k) => <div key={k} className="bm-dl-row"><dt>{k.toUpperCase()}</dt><dd>{String(d.documents[0][k]).split('/').pop()}{fmtDate(d.documents[0][k + '_expiry']) && <span className="bm-muted"> · expires {fmtDate(d.documents[0][k + '_expiry'])}</span>}</dd></div>)}</dl>}</div>
      </div>
    </>
  );
}
