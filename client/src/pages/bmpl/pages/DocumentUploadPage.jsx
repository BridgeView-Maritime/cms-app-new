// client/src/pages/bmpl/pages/DocumentUploadPage.jsx
// "Document Upload" - one document set per INDOS; files go to
// uploads/bmpl-docs. With `dgMode` it renders the legacy "DG Related Icon"
// page, which was only a verification guide with links.
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, Upload, Save, ExternalLink, FileText } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, ExportButton } from '../ui';
import { AUTH_ENDPOINTS } from '../../../config/api';
import CalendarPicker from '../../../components/CalendarPicker';

const LABEL = { passport: 'Passport', cdc: 'CDC', coc: 'COC', stcw: 'STCW', medical: 'Medical', covid: 'Covid vaccination', visa: 'Visa', photo: 'Photo', pscrb: 'PSCRB', stsdsd: 'STSDSD', huet: 'HUET', h2s: 'H2S', ilo: 'ILO medical', confined_space: 'Confined space', merlin_check: 'Merlin check', pde: 'PDE', signature: 'Signature' };

function DocSet({ r, busy, onUpload, onExpiry }) {
  const [expiry, setExpiry] = useState(Object.fromEntries(r.documents.map((d) => [d.key, /^\d{4}-\d{2}-\d{2}$/.test(String(d.expiry).slice(0, 10)) && !String(d.expiry).startsWith('0000') ? String(d.expiry).slice(0, 10) : ''])));
  const [dirty, setDirty] = useState(false);
  return (
    <div className="bm-card">
      <div className="bm-page-head" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="bm-h2" style={{ margin: 0 }}>{r.person ? <Link className="bm-link" to={'/dashboard/bmpl/candidates/' + r.person._id}>{r.person.name}</Link> : <span className="bm-muted">Unknown candidate</span>} <span className="bm-muted">· {r.indosno}</span></h2>
          <p className="bm-muted" style={{ margin: 0 }}>{r.person?.rankname}{r.vacancyid && r.vacancyid !== '0' ? ' · vacancy #' + r.vacancyid : ''} · set #{r.id} added {fmtDate(r.cdate)} by {r.user}</p>
          <p className="bm-inline" style={{ margin: '4px 0 0' }}>
            {r.onboard
              ? <span className={'bm-pill ' + (r.onboard.signtype === 'Signon' ? 'bm-pill-good' : 'bm-pill-muted')}>{r.onboard.signtype === 'Signon' ? 'On board ' + r.onboard.vessel : 'Signed off ' + fmtDate(r.onboard.signoffdate)}</span>
              : <span className="bm-pill bm-pill-muted">No contract on record</span>}
            {(r.proposalFiles || []).map((f) => <span key={f.key} className="bm-file" title={'Uploaded on the old site: ' + f.file}><FileText size={12} /> {f.label}</span>)}
          </p>
        </div>
        {dirty && <button type="button" className="bm-btn bm-btn-primary bm-btn-sm" disabled={busy} onClick={async () => { if (await onExpiry(r._id, Object.fromEntries(Object.entries(expiry).map(([k, v]) => [k + '_expiry', v])))) setDirty(false); }}><Save size={13} /> Save expiries</button>}
      </div>
      <div className="bm-table-wrap">
        <table className="bm-table">
          <thead><tr><th>Document</th><th>File</th><th>Expiry</th><th>Upload</th></tr></thead>
          <tbody>{r.documents.map((d) => {
            const exp = expiry[d.key];
            const expired = exp && exp < new Date().toISOString().slice(0, 10);
            return (
              <tr key={d.key}>
                <td><strong>{LABEL[d.key] || d.key}</strong></td>
                <td>{d.file ? (d.url ? <a className="bm-link" href={AUTH_ENDPOINTS.REACT_APP_API_URL + d.url} target="_blank" rel="noreferrer"><FileText size={12} /> {d.file.split('/').pop()}</a> : <span className="bm-file" title="Legacy file - not migrated"><FileText size={12} /> {d.file.split('/').pop()}</span>) : <span className="bm-muted">—</span>}</td>
                <td><CalendarPicker value={exp} onChange={(v) => { setExpiry((x) => ({ ...x, [d.key]: v })); setDirty(true); }} prefix="bm" size="sm" />{expired && <span className="bm-pill bm-pill-bad" style={{ marginLeft: 6 }}>Expired</span>}</td>
                <td><label className="bm-btn bm-btn-sm bm-btn-ghost"><Upload size={12} /> {d.file ? 'Replace' : 'Upload'}<input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(r._id, d.key, f, exp); e.target.value = ''; }} /></label></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

const EXPORT_COLUMNS = [{ label: 'Candidate', get: (r) => r.person?.name }, { key: 'indosno', label: 'INDOS' }, { key: 'vacancyid', label: 'Vacancy #' }, { label: 'Uploaded', get: (r) => r.documents.filter((d) => d.file).map((d) => d.key).join(' ') }, { label: 'Expiring', get: (r) => r.documents.filter((d) => d.expiry && !String(d.expiry).startsWith('0000')).map((d) => d.key + ':' + String(d.expiry).slice(0, 10)).join(' ') }, { key: 'user', label: 'By' }, { label: 'Added', get: (r) => fmtDate(r.cdate) }];

export default function DocumentUploadPage({ dgMode }) {
  const [sp] = useSearchParams();
  const [qInput, setQInput] = useState(sp.get('indos') || '');
  const [indos, setIndos] = useState(sp.get('indos') || '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ indosno: '', vacancyid: '' });

  useEffect(() => { const t = setTimeout(() => { setIndos(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  const load = () => bmpl('/documents', { params: { indos, page, limit: 10 } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { if (!dgMode) load(); }, [indos, page, dgMode]);

  const upload = async (id, type, file, expiry) => {
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.append('file', file); if (expiry) fd.append('expiry', expiry);
    const d = await bmpl('/documents/' + id + '/upload/' + type, { method: 'POST', body: fd });
    setBusy(false);
    if (d.success) { setMsg({ type: 'success', text: LABEL[type] + ' uploaded.' }); load(); } else setMsg({ type: 'error', text: d.message });
  };
  const saveExpiry = async (id, body) => { setBusy(true); const d = await bmpl('/documents/' + id, { method: 'PUT', body }); setBusy(false); if (d.success) { load(); return true; } setMsg({ type: 'error', text: d.message }); return false; };
  const create = async (e) => { e.preventDefault(); setBusy(true); const d = await bmpl('/documents', { method: 'POST', body: draft }); setBusy(false); if (d.success) { setAdding(false); setQInput(draft.indosno.toUpperCase()); } else setMsg({ type: 'error', text: d.message }); };

  if (dgMode) {
    return (
      <div>
        <div className="bm-page-head"><div><h1>DG Related Icons</h1><p>How to verify a seafarer's certificates with the Directorate General of Shipping before proposing them.</p></div></div>
        <div className="bm-grid-2">
          <div className="bm-card">
            <h2 className="bm-h2">Verify documents</h2>
            <ul className="bm-list">
              <li><span><strong>COC</strong> - Certificate of Competency: check the number, grade and validity on the DG Shipping e-Governance portal.</span></li>
              <li><span><strong>CDC</strong> - Continuous Discharge Certificate: confirm the CDC number and issuing MMD against the seafarer's INDOS record.</span></li>
              <li><span><strong>Passport</strong> - match the passport number, expiry and name against the CDC and INDOS.</span></li>
              <li><span><strong>Tar book</strong> - collect the training record book issued to the seafarer and verify the sea time with the company's sign-on records.</span></li>
            </ul>
            <p><a className="bm-btn" href="https://www.dgshipping.gov.in" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open DG Shipping portal</a></p>
          </div>
          <div className="bm-card">
            <h2 className="bm-h2">Where the documents live in this system</h2>
            <ul className="bm-list">
              <li><Link className="bm-link" to="/dashboard/bmpl/document-upload">Document Upload</Link> <span className="bm-muted">files and expiries per INDOS</span></li>
              <li><Link className="bm-link" to="/dashboard/bmpl/pending-dg">Pending Issues with DG</Link> <span className="bm-muted">crew data awaiting DG correction</span></li>
              <li><Link className="bm-link" to="/dashboard/bmpl/sea-service-correction">Sea Service correction</Link> <span className="bm-muted">grievances raised by seafarers</span></li>
              <li><Link className="bm-link" to="/dashboard/bmpl/r/dgCirculars">DG Circulars</Link> <span className="bm-muted">circulars on file</span></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bm-page-head">
        <div><h1>Document Upload</h1><p>One document set per seafarer (by INDOS). Upload PDFs or images and keep the expiry dates current.</p></div>
        <div className="bm-actions"><ExportButton path={'/documents'} params={{ indos }} columns={EXPORT_COLUMNS} name={'documents'} disabled={!data?.total} onDone={setMsg} /><button type="button" className="bm-btn bm-btn-primary" onClick={() => setAdding((a) => !a)}><Plus size={15} /> New document set</button></div>
      </div>
      <Alert msg={msg} />
      {adding && (
        <form onSubmit={create} className="bm-card">
          <div className="bm-form-grid">
            <label className="bm-field"><span>INDOS number *</span><input type="text" value={draft.indosno} onChange={(e) => setDraft((d) => ({ ...d, indosno: e.target.value }))} required /></label>
            <label className="bm-field"><span>Vacancy # (optional)</span><input type="text" value={draft.vacancyid} onChange={(e) => setDraft((d) => ({ ...d, vacancyid: e.target.value }))} /></label>
          </div>
          <div className="bm-form-actions"><button type="submit" className="bm-btn bm-btn-primary" disabled={busy}>Create</button><button type="button" className="bm-btn bm-btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
        </form>
      )}
      <div className="bm-toolbar"><div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="INDOS number" /></div></div>
      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title={indos ? 'No document set for ' + indos.toUpperCase() : 'No document sets'} text={indos ? 'Create one with "New document set".' : ''} /> : (
        <div className="bm-stack">{data.records.map((r) => <DocSet key={r._id} r={r} busy={busy} onUpload={upload} onExpiry={saveExpiry} />)}</div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
