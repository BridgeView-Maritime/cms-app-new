// client/src/pages/bmpl/pages/SeafarerRequirementsPage.jsx
// "Seafarer" (legacy basic_requirement.php) - per-owner joining requirements
// and the interview question bank used when proposing for that owner.
// Rows live in basic_requirement; `type` is 'basic' or 'iqaa'.
import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2, X, ClipboardList, HelpCircle } from 'lucide-react';
import { bmpl } from '../api';
import { Empty, Alert } from '../ui';

const RES = '/r/seafarerRequirements';

function Section({ type, title, icon: Icon, hint, company, rows, ranks, busy, onAdd, onSave, onDelete }) {
  const [draft, setDraft] = useState('');
  const [rank, setRank] = useState('');
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');
  return (
    <div className="bm-card">
      <h2 className="bm-h2"><Icon size={15} /> {title} <span className="bm-muted">({rows.length})</span></h2>
      <p className="bm-muted">{hint}</p>
      {rows.length === 0 ? <Empty title={'Nothing recorded for this owner'} /> : (
        <ol className="bm-reqs">
          {rows.map((r) => (
            <li key={r._id}>
              {editing === r._id ? (
                <form className="bm-inline" onSubmit={(e) => { e.preventDefault(); onSave(r._id, { requirement: editText }).then((ok) => ok && setEditing(null)); }}>
                  <textarea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} disabled={busy} />
                  <button type="submit" className="bm-btn bm-btn-sm bm-btn-primary" disabled={busy}><Save size={12} /></button>
                  <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" onClick={() => setEditing(null)}><X size={12} /></button>
                </form>
              ) : (
                <div className="bm-inline bm-reqs-row">
                  <span className="bm-pre">{r.requirement}</span>
                  {type === 'iqaa' && r._display?.rank && <span className="bm-pill bm-pill-info">{r._display.rank}</span>}
                  <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" onClick={() => { setEditing(r._id); setEditText(r.requirement || ''); }}>Edit</button>
                  <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost bm-btn-danger" disabled={busy} onClick={() => onDelete(r)}><Trash2 size={12} /></button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <form className="bm-inline" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (!draft.trim() || !company) return; onAdd({ companyid: company, type, rank, requirement: draft.trim() }).then((ok) => { if (ok) { setDraft(''); } }); }}>
        <textarea rows={2} style={{ flex: 1 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={type === 'basic' ? 'e.g. Valid US visa required for all officers' : 'Question and expected answer'} disabled={busy || !company} />
        {type === 'iqaa' && <select className="bm-select" value={rank} onChange={(e) => setRank(e.target.value)} disabled={busy}><option value="">All ranks</option>{ranks.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
        <button type="submit" className="bm-btn bm-btn-primary" disabled={busy || !company || !draft.trim()}><Plus size={14} /> Add</button>
      </form>
    </div>
  );
}

export default function SeafarerRequirementsPage() {
  const [opts, setOpts] = useState({ filters: {}, formOptions: {} });
  const [company, setCompany] = useState('');
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { bmpl(RES + '/filter-options').then((d) => { if (d.success) setOpts(d); }); }, []);
  const load = () => { if (!company) { setRows([]); return; } bmpl(RES, { params: { companyid: company, limit: 200 } }).then((d) => (d.success ? setRows(d.records) : setMsg({ type: 'error', text: d.message }))); };
  useEffect(() => { load(); }, [company]);

  const after = (d, ok) => { setBusy(false); if (d.success) { setMsg({ type: 'success', text: ok }); load(); return true; } setMsg({ type: 'error', text: d.message }); return false; };
  const add = async (body) => { setBusy(true); setMsg(null); return after(await bmpl(RES, { method: 'POST', body }), 'Added.'); };
  const save = async (id, body) => { setBusy(true); setMsg(null); return after(await bmpl(RES + '/' + id, { method: 'PUT', body }), 'Saved.'); };
  const del = async (r) => { if (!window.confirm('Delete this entry?')) return false; setBusy(true); return after(await bmpl(RES + '/' + r._id, { method: 'DELETE' }), 'Deleted.'); };

  const companies = opts.filters?.companyid || opts.formOptions?.companyid || [];
  const ranks = opts.formOptions?.rank || [];
  const basic = (rows || []).filter((r) => String(r.type || '').toLowerCase() !== 'iqaa');
  const iqaa = (rows || []).filter((r) => String(r.type || '').toLowerCase() === 'iqaa');

  return (
    <div>
      <div className="bm-page-head"><div><h1>Seafarer requirements</h1><p>What each owner expects of a joining seafarer, and the questions to ask at interview. Shown to the crewing team when proposing candidates for that owner.</p></div></div>
      <Alert msg={msg} />
      <div className="bm-toolbar">
        <select className="bm-select" value={company} onChange={(e) => setCompany(e.target.value)}><option value="">Choose owner…</option>{companies.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </div>
      {!company ? <Empty title="Pick an owner" text="Their requirements and interview questions appear here." /> : !rows ? <div className="bm-loading">Loading…</div> : (
        <div className="bm-grid-2">
          <Section type="basic" title="Basic requirements" icon={ClipboardList} hint="Conditions every candidate proposed to this owner must meet." company={company} rows={basic} ranks={ranks} busy={busy} onAdd={add} onSave={save} onDelete={del} />
          <Section type="iqaa" title="Interview questions" icon={HelpCircle} hint="Questions and expected answers, optionally tied to one rank." company={company} rows={iqaa} ranks={ranks} busy={busy} onAdd={add} onSave={save} onDelete={del} />
        </div>
      )}
    </div>
  );
}
