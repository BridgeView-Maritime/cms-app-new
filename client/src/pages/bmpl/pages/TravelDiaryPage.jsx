// client/src/pages/bmpl/pages/TravelDiaryPage.jsx
// "Travel Diary" - travel_schedule: who is flying where, when, and the
// ticket / visa / expense details.
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, X, Pencil, Save } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, FormField, ExportButton } from '../ui';
import CalendarPicker from '../../../components/CalendarPicker';

const FIELDS = [
  { key: 'indosno', label: 'INDOS', required: true }, { key: 'vacancyid', label: 'Vacancy #' },
  { key: 'travelplace', label: 'From' }, { key: 'placeto', label: 'To' }, { key: 'traveldate', label: 'Travel date', type: 'date', required: true }, { key: 'arrivaldate', label: 'Arrival date', type: 'date' },
  { key: 'ticket', label: 'Ticket / PNR' }, { key: 'visa', label: 'Visa', type: 'select', options: ['Yes', 'No'] }, { key: 'visa_county', label: 'Visa country' },
  { key: 'itarranged', label: 'Ticket arranged by', type: 'select', options: ['BMPL', 'Owner', 'Candidate'] }, { key: 'itarrangedby', label: 'Arranged by (name)' }, { key: 'itamount', label: 'Ticket amount' }, { key: 'itamounttype', label: 'Ticket currency' }, { key: 'ipaidto_bmpl', label: 'Paid to BMPL', type: 'select', options: ['Yes', 'No'] },
  { key: 'oexpensive', label: 'Other expense' }, { key: 'oamount', label: 'Other amount' }, { key: 'ocurrency', label: 'Other currency' }, { key: 'opaidto_bmpl', label: 'Other paid to BMPL', type: 'select', options: ['Yes', 'No'] },
  { key: 'lg', label: 'LG' }, { key: 'OKTB', label: 'OK to board', type: 'select', options: ['Yes', 'No'] }, { key: 'dtarranged', label: 'Domestic travel arranged', type: 'select', options: ['Yes', 'No'] }, { key: 'arrangedby', label: 'Domestic arranged by' },
  { key: 'travel_details', label: 'Travel details', type: 'textarea' }, { key: 'oremark', label: 'Remark', type: 'textarea' },
];

const EXPORT_COLUMNS = [{ label: 'Candidate', get: (r) => r.person?.name }, { key: 'indosno', label: 'INDOS' }, { key: 'travelplace', label: 'From' }, { key: 'placeto', label: 'To' }, { label: 'Travel', get: (r) => fmtDate(r.traveldate) }, { label: 'Arrival', get: (r) => fmtDate(r.arrivaldate) }, { key: 'ticket', label: 'Ticket' }, { key: 'itamount', label: 'Ticket amount' }, { key: 'itarranged', label: 'Arranged by' }, { key: 'visa', label: 'Visa' }, { key: 'OKTB', label: 'OKTB' }, { key: 'travel_details', label: 'Details' }, { key: 'oremark', label: 'Remark' }, { key: 'user', label: 'By' }];

export default function TravelDiaryPage() {
  const [sp] = useSearchParams();
  const [qInput, setQInput] = useState(sp.get('indos') || '');
  const [q, setQ] = useState(sp.get('indos') || '');
  const [range, setRange] = useState({ from: '', to: '', upcoming: sp.get('upcoming') || '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | _id
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  const load = () => bmpl('/travel', { params: { q, page, limit: 25, ...range } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [q, page, range]);

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const d = editing === 'new' ? await bmpl('/travel', { method: 'POST', body: draft }) : await bmpl('/travel/' + editing, { method: 'PUT', body: draft });
    setBusy(false);
    if (d.success) { setEditing(null); setMsg({ type: 'success', text: d.message }); load(); } else setMsg({ type: 'error', text: d.message });
  };
  const startEdit = (r) => { setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, r[f.key] ?? '']))); setEditing(r._id); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div>
      <div className="bm-page-head">
        <div><h1>Travel Diary</h1><p>Joining and repatriation travel. Add an entry when the ticket is booked; update it with arrival and expense details.</p></div>
<div className="bm-actions"><ExportButton path={'/travel'} params={{ q, ...range }} columns={EXPORT_COLUMNS} name={'travel-diary'} disabled={!data?.total} onDone={setMsg} /><button type="button" className="bm-btn bm-btn-primary" onClick={() => { setDraft({ indosno: qInput.toUpperCase(), visa: 'No', itarranged: 'BMPL' }); setEditing(editing === 'new' ? null : 'new'); }}><Plus size={15} /> New entry</button></div></div>
      <Alert msg={msg} />
      {editing && (
        <form onSubmit={save} className="bm-card">
          <h2 className="bm-h2">{editing === 'new' ? 'New travel entry' : 'Edit travel entry'}</h2>
          <div className="bm-form-grid">{FIELDS.map((f) => <FormField key={f.key} field={f} value={draft[f.key]} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} disabled={busy || (editing !== 'new' && f.key === 'indosno')} />)}</div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary" disabled={busy}><Save size={14} /> Save</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setEditing(null)}><X size={14} /> Cancel</button></div>
        </form>
      )}
      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="INDOS, place, details" /></div>
        <CalendarPicker value={range.from} onChange={(v) => { setRange((r) => ({ ...r, from: v })); setPage(1); }} prefix="bm" size="sm" placeholder="Travel from" />
        <CalendarPicker value={range.to} onChange={(v) => { setRange((r) => ({ ...r, to: v })); setPage(1); }} prefix="bm" size="sm" placeholder="Travel to" />
        <label className="bm-inline"><input type="checkbox" checked={Boolean(range.upcoming)} onChange={(e) => { setRange((r) => ({ ...r, upcoming: e.target.checked ? '1' : '' })); setPage(1); }} /> Upcoming only</label>
        {(q || range.from || range.to || range.upcoming) && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => { setQInput(''); setRange({ from: '', to: '', upcoming: '' }); }}><X size={14} /> Clear</button>}
      </div>
      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No travel entries" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Candidate</th><th>Route</th><th>Travel</th><th>Arrival</th><th>Ticket</th><th>Arranged</th><th>Visa</th><th>OKTB</th><th>Details</th><th>Entered</th><th></th></tr></thead>
            <tbody>{data.records.map((r) => (
              <tr key={r._id}>
                <td>{r.person ? <Link className="bm-link" to={'/dashboard/bmpl/candidates/' + r.person._id}><strong>{r.person.name}</strong></Link> : <strong>{r.indosno}</strong>}<div className="bm-muted">{r.indosno}{r.person?.rankname ? ' · ' + r.person.rankname : ''}{r.vacancyid && r.vacancyid !== '0' ? ' · #' + r.vacancyid : ''}</div></td>
                <td>{r.travelplace} → {r.placeto}</td><td className="bm-td-date">{fmtDate(r.traveldate)}</td><td className="bm-td-date">{fmtDate(r.arrivaldate)}</td>
                <td>{r.ticket}{r.itamount ? <div className="bm-muted">{r.itamount} {r.itamounttype}</div> : null}</td><td>{r.itarranged}{r.itarrangedby ? <div className="bm-muted">{r.itarrangedby}</div> : null}</td>
                <td>{r.visa}{r.visa_county ? <div className="bm-muted">{r.visa_county}</div> : null}</td><td>{r.OKTB}</td>
                <td className="bm-td-wrap">{r.travel_details}{r.oremark ? <div className="bm-muted">{r.oremark}</div> : null}</td>
                <td className="bm-td-date">{fmtDate(r.dateenter)}<div className="bm-muted">{r.user}</div></td>
                <td><button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" onClick={() => startEdit(r)}><Pencil size={12} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
