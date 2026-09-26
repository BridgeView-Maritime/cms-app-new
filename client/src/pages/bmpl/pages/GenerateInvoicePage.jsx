// client/src/pages/bmpl/pages/GenerateInvoicePage.jsx
// The Invoice menu's four custom pages:
//   crew               build an owner invoice from the period's sign-ons
//   vendor             raise a vendor invoice from that vendor's work
//   vendor-list        the vendor invoice register
//   account-documents  company documents, ITR, payments, NRPA invoices
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, Printer, ArrowLeft, Search } from 'lucide-react';
import { bmpl, fmtDate, fmtMoney } from '../api';
import { Alert, Empty, FormField } from '../ui';
import BmplListPage from '../BmplListPage';
import { useBmpl } from '../BmplModule';
import CalendarPicker from '../../../components/CalendarPicker';

const monthStart = () => new Date().toISOString().slice(0, 8) + '01';
const todayStr = () => new Date().toISOString().slice(0, 10);
const n = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };

function InvoiceView({ invoiceno, onBack }) {
  const [d, setD] = useState(null);
  useEffect(() => { bmpl('/invoice-builder/invoices/' + invoiceno).then(setD); }, [invoiceno]);
  if (!d) return <div className="bm-loading">Loading…</div>;
  if (!d.success) return <Alert msg={{ type: 'error', text: d.message }} />;
  const inv = d.invoice, c = d.company, b = d.bank;
  return (
    <div>
      <div className="bm-page-head bm-screen-only"><div><button type="button" className="bm-back bm-btn bm-btn-ghost" onClick={onBack}><ArrowLeft size={14} /> Back</button></div><div className="bm-actions"><button type="button" className="bm-btn bm-btn-primary" onClick={() => window.print()}><Printer size={14} /> Print</button></div></div>
      <div className="bm-letter">
        <div className="bm-letter-head"><div><h2>Bridgeview Maritime Pvt. Ltd.</h2><div>TAX INVOICE</div></div><div style={{ textAlign: 'right' }}>Invoice: <strong>{inv.invoic_no}</strong> (#{inv.invoiceno})<br />Date: {fmtDate(inv.doe)}{inv.po_number ? <><br />PO: {inv.po_number}</> : null}</div></div>
        <p><strong>Bill to:</strong> {c?.company_name || inv.company_name}{c?.address ? <><br />{c.address}</> : null}{c?.gstno ? <><br />GST: {c.gstno}</> : null}{c?.panno ? <> · PAN: {c.panno}</> : null}</p>
        {(inv.fromdate || inv.todate) && <p>Period: {fmtDate(inv.fromdate)} – {fmtDate(inv.todate)}</p>}
        <table>
          <thead><tr><th>#</th><th>Crew</th><th>INDOS</th><th>Rank</th><th>Vessel</th><th>Joined</th><th>Days</th><th>Agency fee</th><th>Crew fee</th><th>Other</th><th>Amount</th></tr></thead>
          <tbody>{d.lines.map((l, i) => <tr key={l._id}><td>{i + 1}</td><td>{l.fullname}</td><td>{l.vcan_id}</td><td>{l.rankname}</td><td>{l.vesselname}</td><td>{fmtDate(l.jdate)}</td><td>{l.dayson_vessel}</td><td>{fmtMoney(l.agencyfee)}</td><td>{fmtMoney(l.crewl_fee)}</td><td>{fmtMoney(n(l.other) + n(l.medical_amount) + n(l.visa_amount) + n(l.travel_amount) + n(l.certificate_amount))}</td><td>{fmtMoney(n(l.total) || n(l.agencyfee) + n(l.crewl_fee) + n(l.other) + n(l.medical_amount) + n(l.visa_amount) + n(l.travel_amount) + n(l.certificate_amount))}</td></tr>)}</tbody>
          <tfoot><tr><th colSpan={10} style={{ textAlign: 'right' }}>Total</th><th>{fmtMoney(d.total)}</th></tr></tfoot>
        </table>
        {b && <p><strong>Bank:</strong> {b.account_name} · {b.bank_name} · A/c {b.account_number} · IFSC {b.rtgs_neft_ifsc}{b.swift_code ? ' · SWIFT ' + b.swift_code : ''}</p>}
        {inv.payment_date && <p>Payment due: {fmtDate(inv.payment_date)}</p>}
        <div className="bm-sign"><div /><div>For Bridgeview Maritime Pvt. Ltd.<br /><br /><br />Authorised Signatory</div></div>
      </div>
    </div>
  );
}

function CrewInvoiceBuilder() {
  const [opts, setOpts] = useState(null);
  const [company, setCompany] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [rows, setRows] = useState(null);
  const [lines, setLines] = useState({}); // contract_id -> {agencyfee, crewl_fee, other, dayson_vessel}
  const [head, setHead] = useState({ invoic_no: '', po_number: '', bank_id: '', payment_date: '', creferenceno: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);

  useEffect(() => { bmpl('/invoice-builder/options').then((d) => { if (d.success) { setOpts(d); setHead((h) => ({ ...h, bank_id: d.banks[0]?.value || '' })); } }); }, []);
  const fetchRows = async () => { if (!company) return; setBusy(true); setRows(null); setLines({}); const d = await bmpl('/invoice-builder/contracts', { params: { company_name: company, from, to } }); setBusy(false); if (d.success) setRows(d.records); else setMsg({ type: 'error', text: d.message }); };
  const days = (r) => { if (!r.signondate) return 0; const end = r.signoffdate ? new Date(r.signoffdate) : new Date(to); const d = Math.round((end - new Date(r.signondate)) / 86400000) + 1; return d > 0 ? d : 0; };
  const toggle = (r) => setLines((l) => { const c = { ...l }; if (c[r.contract_id]) delete c[r.contract_id]; else c[r.contract_id] = { agencyfee: '', crewl_fee: '', other: '', dayson_vessel: String(days(r)) }; return c; });
  const setLine = (id, k, v) => setLines((l) => ({ ...l, [id]: { ...l[id], [k]: v } }));
  const selected = useMemo(() => (rows || []).filter((r) => lines[r.contract_id]), [rows, lines]);
  const total = selected.reduce((s, r) => s + n(lines[r.contract_id].agencyfee) + n(lines[r.contract_id].crewl_fee) + n(lines[r.contract_id].other), 0);
  const create = async () => {
    setBusy(true); setMsg(null);
    const d = await bmpl('/invoice-builder', { method: 'POST', body: { company_name: company, from, to, ...head, lines: selected.map((r) => ({ ...r, ...lines[r.contract_id] })) } });
    setBusy(false);
    if (d.success) { setMsg({ type: 'success', text: d.message }); setLines({}); setView(d.invoiceno); } else setMsg({ type: 'error', text: d.message });
  };
  if (view) return <InvoiceView invoiceno={view} onBack={() => { setView(null); fetchRows(); }} />;
  const suggested = opts && company ? 'BMPL/' + (opts.shortnames[company] || 'INV') + '/' + opts.nextInvoiceNo + '/' + todayStr().slice(0, 4) : '';
  return (
    <div>
      <div className="bm-page-head"><div><h1>Generate Invoice</h1><p>Pick an owner and a period, tick the sign-ons to bill, enter the fees, and raise the invoice. It lands in <Link className="bm-link" to="/dashboard/bmpl/r/invoices">Print Invoice</Link> as "not printed".</p></div></div>
      <Alert msg={msg} />
      <form className="bm-toolbar" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
        <select className="bm-select" value={company} onChange={(e) => setCompany(e.target.value)} required><option value="">Choose owner…</option>{(opts?.company || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <CalendarPicker value={from} onChange={(v) => setFrom(v)} prefix="bm" size="sm" /><CalendarPicker value={to} onChange={(v) => setTo(v)} prefix="bm" size="sm" />
        <button type="submit" className="bm-btn bm-btn-primary" disabled={busy || !company}>Load sign-ons</button>
      </form>
      {rows && (rows.length === 0 ? <Empty title="No sign-ons for this owner in the period" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th></th><th>Crew</th><th>INDOS</th><th>Rank</th><th>Vessel</th><th>Signed on</th><th>Signed off</th><th>Joiner</th><th>Days</th><th>Agency fee</th><th>Crew fee</th><th>Other</th><th>Already invoiced</th></tr></thead>
            <tbody>{rows.map((r) => { const l = lines[r.contract_id]; return (
              <tr key={r.contract_id} className={l ? 'bm-row-active' : ''}>
                <td><input type="checkbox" checked={Boolean(l)} onChange={() => toggle(r)} /></td><td><strong>{r.fullname}</strong></td><td>{r.vcan_id}</td><td>{r.rank}</td><td>{r.vesselname}</td><td className="bm-td-date">{fmtDate(r.signondate)}</td><td className="bm-td-date">{fmtDate(r.signoffdate) || <span className="bm-pill bm-pill-good">On board</span>}</td><td>{r.joiner_type}</td>
                <td>{l ? <input type="number" className="bm-select bm-select-sm" style={{ width: 70 }} value={l.dayson_vessel} onChange={(e) => setLine(r.contract_id, 'dayson_vessel', e.target.value)} /> : days(r)}</td>
                <td>{l && <input type="number" step="any" className="bm-select bm-select-sm" style={{ width: 100 }} value={l.agencyfee} onChange={(e) => setLine(r.contract_id, 'agencyfee', e.target.value)} placeholder="0" />}</td>
                <td>{l && <input type="number" step="any" className="bm-select bm-select-sm" style={{ width: 100 }} value={l.crewl_fee} onChange={(e) => setLine(r.contract_id, 'crewl_fee', e.target.value)} placeholder="0" />}</td>
                <td>{l && <input type="number" step="any" className="bm-select bm-select-sm" style={{ width: 90 }} value={l.other} onChange={(e) => setLine(r.contract_id, 'other', e.target.value)} placeholder="0" />}</td>
                <td>{r.invoiced ? <span className="bm-pill bm-pill-muted">{r.invoiced}</span> : ''}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      ))}
      {selected.length > 0 && (
        <div className="bm-card">
          <h2 className="bm-h2"><Receipt size={15} /> Invoice for {selected.length} crew · total {fmtMoney(total)}</h2>
          <div className="bm-form-grid">
            <FormField field={{ key: 'invoic_no', label: 'Invoice number' }} value={head.invoic_no || suggested} onChange={(k, v) => setHead((h) => ({ ...h, [k]: v }))} />
            <FormField field={{ key: 'po_number', label: 'PO number' }} value={head.po_number} onChange={(k, v) => setHead((h) => ({ ...h, [k]: v }))} />
            <FormField field={{ key: 'creferenceno', label: 'Owner reference' }} value={head.creferenceno} onChange={(k, v) => setHead((h) => ({ ...h, [k]: v }))} />
            <FormField field={{ key: 'bank_id', label: 'Bank account', type: 'lookup' }} options={opts?.banks} value={head.bank_id} onChange={(k, v) => setHead((h) => ({ ...h, [k]: v }))} />
            <FormField field={{ key: 'payment_date', label: 'Payment due', type: 'date' }} value={head.payment_date} onChange={(k, v) => setHead((h) => ({ ...h, [k]: v }))} />
          </div>
          <div className="bm-form-actions"><button type="button" className="bm-btn bm-btn-primary" disabled={busy} onClick={() => create()}>{busy ? 'Raising…' : 'Raise invoice'}</button></div>
        </div>
      )}
    </div>
  );
}

function VendorInvoiceBuilder() {
  const [opts, setOpts] = useState(null);
  const [f, setF] = useState({ invoice: '', vendor: '', invoice_company: '', fromdate: monthStart(), todate: todayStr(), refno: '', items: '' });
  const [lines, setLines] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { bmpl('/invoice-builder/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  const preview = async () => { setBusy(true); const d = await bmpl('/invoice-builder/vendor-lines', { params: { category: f.invoice, vendor: f.vendor, company_name: f.invoice_company, from: f.fromdate, to: f.todate } }); setBusy(false); if (d.success) { setLines(d); setF((x) => ({ ...x, items: String(d.records.length) })); } else setMsg({ type: 'error', text: d.message }); };
  const create = async () => { setBusy(true); setMsg(null); const d = await bmpl('/invoice-builder/vendor', { method: 'POST', body: f }); setBusy(false); if (d.success) { setMsg({ type: 'success', text: d.message }); setLines(null); } else setMsg({ type: 'error', text: d.message }); };
  const cats = [...new Set(['Flag Documents', 'Medical', 'Visa', 'PPE', 'Hotel', 'Travel', 'Other', ...(opts?.categories || [])])];
  return (
    <div>
      <div className="bm-page-head"><div><h1>Generate Vendor Invoice</h1><p>Record a vendor's invoice for a period. Preview shows the requests behind it (medical, visa, flag or payments) so the item count and amount can be checked.</p></div></div>
      <Alert msg={msg} />
      <div className="bm-card">
        <div className="bm-form-grid">
          <FormField field={{ key: 'invoice', label: 'Category', type: 'select', options: cats, required: true }} value={f.invoice} onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))} />
          <FormField field={{ key: 'vendor', label: 'Vendor', type: 'lookup', required: true }} options={opts?.agent} value={f.vendor} onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))} />
          <FormField field={{ key: 'invoice_company', label: 'Owner (optional)', type: 'lookup' }} options={opts?.company} value={f.invoice_company} onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))} />
          <FormField field={{ key: 'fromdate', label: 'From', type: 'date' }} value={f.fromdate} onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))} />
          <FormField field={{ key: 'todate', label: 'To', type: 'date' }} value={f.todate} onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))} />
          <FormField field={{ key: 'refno', label: "Vendor's invoice reference" }} value={f.refno} onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))} />
          <FormField field={{ key: 'items', label: 'Number of items', type: 'number' }} value={f.items} onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))} />
        </div>
        <div className="bm-form-actions"><button type="button" className="bm-btn" disabled={busy || !f.invoice} onClick={preview}>Preview work in period</button><button type="button" className="bm-btn bm-btn-primary" disabled={busy || !f.invoice || !f.vendor} onClick={create}>Record vendor invoice</button></div>
      </div>
      {lines && (lines.records.length === 0 ? <Empty title="Nothing from this vendor in the period" /> : (
        <div className="bm-card">
          <h2 className="bm-h2">{lines.records.length} items · {fmtMoney(lines.total)}</h2>
          <div className="bm-table-wrap"><table className="bm-table"><thead><tr><th>Date</th><th>Seafarer</th><th>INDOS</th><th>Item</th><th>Vessel</th><th>Amount</th></tr></thead><tbody>{lines.records.map((r, i) => <tr key={i}><td className="bm-td-date">{fmtDate(r.date)}</td><td>{r.name}</td><td>{r.indosno}</td><td>{r.item}</td><td>{r.vessel}</td><td className="bm-td-money">{fmtMoney(r.amount)}</td></tr>)}</tbody></table></div>
        </div>
      ))}
      <p className="bm-muted">Register: <Link className="bm-link" to="/dashboard/bmpl/invoices/vendor">Vendor Invoices</Link> · follow-ups: <Link className="bm-link" to="/dashboard/bmpl/r/vendorInvoiceFollowups">Vendor Invoice Followup</Link>.</p>
    </div>
  );
}

function AccountDocuments() {
  const { resources } = useBmpl();
  const tabs = [['accountDocuments', 'Company documents'], ['itrDocuments', 'ITR'], ['payments', 'Payments'], ['nrpaInvoices', 'NRPA invoices'], ['bankAccounts', 'Bank accounts']].filter(([k]) => resources[k]);
  const [key, setKey] = useState(tabs[0]?.[0] || '');
  return (
    <div>
      <div className="bm-page-head"><div><h1>Account Documents</h1><p>Statutory documents of the company, ITR filings, payments made and NRPA invoices.</p></div></div>
      <div className="bm-tabs">{tabs.map(([k, l]) => <button key={k} type="button" className={'bm-tab' + (k === key ? ' bm-tab-active' : '')} onClick={() => setKey(k)}>{l}</button>)}</div>
      {key && <BmplListPage key={key} resourceKey={key} embedded />}
    </div>
  );
}

export default function GenerateInvoicePage({ kind }) {
  if (kind === 'vendor') return <VendorInvoiceBuilder />;
  if (kind === 'account-documents') return <AccountDocuments />;
  if (kind === 'vendor-list') return <div><div className="bm-page-head"><div><h1>Vendor Invoices</h1><p>Invoices received from vendors. Raise a new one under <Link className="bm-link" to="/dashboard/bmpl/invoices/generate-vendor">Generate Vendor Invoice</Link>.</p></div></div><BmplListPage resourceKey="vendorInvoices" embedded /></div>;
  return <CrewInvoiceBuilder />;
}
