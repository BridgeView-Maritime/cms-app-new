// client/src/pages/bmpl/pages/CancelledJoinersPage.jsx
// "Cancelled Joiners" - proposals that were withdrawn (backout / rejected /
// vacancy closed), with the reason recorded on the proposal.
import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, ExportButton } from '../ui';
import { ProposalRow } from './ProposalsPage';

const EXPORT_COLUMNS = [{ label: 'Candidate', get: (r) => r.person?.name }, { key: 'indosno', label: 'INDOS' }, { key: 'vacancyid', label: 'Vacancy #' }, { key: 'company', label: 'Owner' }, { key: 'rank', label: 'Rank' }, { label: 'Proposed', get: (r) => fmtDate(r.date) }, { key: 'user', label: 'By' }, { key: 'status', label: 'Status' }, { key: 'remark', label: 'Reason' }, { key: 'feedback', label: 'Feedback' }];

export default function CancelledJoinersPage() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [company, setCompany] = useState('');
  const [opts, setOpts] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { bmpl('/vacancies/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  const load = () => bmpl('/cancelled-joiners', { params: { q, page, limit: 25, company_name: company } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [q, page, company]);
  const put = async (id, body) => { setBusy(true); setMsg(null); const d = await bmpl('/proposals/' + id, { method: 'PUT', body }); setBusy(false); if (d.success) { load(); return true; } setMsg({ type: 'error', text: d.message }); return false; };

  return (
    <div>
      <div className="bm-page-head"><div><h1>Cancelled Joiners</h1><p>Candidates who backed out, were rejected, or whose vacancy closed after proposal.</p></div><div className="bm-actions"><ExportButton path={'/cancelled-joiners'} params={{ q, company_name: company }} columns={EXPORT_COLUMNS} name={'cancelled-joiners'} disabled={!data?.total} onDone={setMsg} /></div></div>
      <Alert msg={msg} />
      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="INDOS, passport, remark" /></div>
        <select className="bm-select" value={company} onChange={(e) => { setCompany(e.target.value); setPage(1); }}><option value="">All · Owner</option>{(opts?.company || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        {(q || company) && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => { setQInput(''); setCompany(''); }}><X size={14} /> Clear</button>}
      </div>
      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No cancelled joiners" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Candidate</th><th>Job id</th><th>Company name</th><th>Vessel</th><th>Rank</th><th>Salary</th><th>Joiner type</th><th>Date of approval</th><th>Sourced by</th><th>Assigned to</th><th>Remark</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.records.map((p) => <ProposalRow key={p._id} p={p} statuses={data.statuses} busy={busy} onStatus={(id, status) => put(id, { status })} onSave={put} extra={(r) => <td className="bm-td-wrap">{r.remark}{r.feedback ? <div className="bm-muted">{r.feedback}</div> : null}</td>} />)}</tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
