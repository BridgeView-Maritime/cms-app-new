// client/src/pages/bmpl/pages/SourcingTasksPage.jsx
// "Manage Task" - vacancies assigned to sourcing officers (taskassign),
// with the legacy page's acknowledge / re-assign / delete actions and the
// count of candidates already proposed against each vacancy.
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Trash2, UserCog, X, Search } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, ExportButton } from '../ui';
import { useBmpl } from '../BmplModule';
import CalendarPicker from '../../../components/CalendarPicker';

const EXPORT_COLUMNS = [{ key: 'vacn_id', label: 'Vacancy #' }, { label: 'Owner', get: (r) => r.vacancy?.company }, { label: 'Vessel', get: (r) => r.vacancy?.vessel }, { label: 'Rank', get: (r) => r.vacancy?.rank || r.rank }, { label: 'Location', get: (r) => r.vacancy?.location }, { label: 'Openings', get: (r) => r.vacancy?.noopening }, { label: 'Salary', get: (r) => [r.vacancy?.salary, r.vacancy?.currency].filter(Boolean).join(' ') }, { key: 'proposals', label: 'Proposed' }, { key: 'selected', label: 'Selected' }, { label: 'State', get: (r) => r.vacancy?.exp }, { label: 'Assigned to', get: (r) => r.assignedTo || r.assignto }, { key: 'assignby', label: 'Assigned by' }, { label: 'On', get: (r) => fmtDate(r.dov, true) }, { label: 'Acknowledged', get: (r) => (String(r.ackn) === '1' ? fmtDate(r.ackndate) : 'Pending') }];

export default function SourcingTasksPage() {
  const { user } = useBmpl();
  const [sp] = useSearchParams();
  const [filters, setFilters] = useState({ ack: sp.get('ack') || '', assignto: '', mine: sp.get('mine') || '', company_name: '', from: '', to: '' });
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState({ staff: [], company: [] });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reassign, setReassign] = useState(null); // task being reassigned

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  const load = () => bmpl('/tasks', { params: { page, limit: 30, q, ...filters } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [page, filters, q]);
  useEffect(() => { bmpl('/vacancies/options').then((d) => { if (d.success) setOpts(d); }); }, []);
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const run = async (fn, ok) => { setBusy(true); setMsg(null); const d = await fn(); setBusy(false); if (d.success) { setMsg({ type: 'success', text: ok || d.message }); load(); return true; } setMsg({ type: 'error', text: d.message }); return false; };
  const ack = (id) => run(() => bmpl('/tasks/' + id + '/ack', { method: 'POST' }), 'Acknowledged.');
  const remove = (t) => { if (window.confirm('Delete the task for vacancy #' + t.vacn_id + '?')) run(() => bmpl('/tasks/' + t._id, { method: 'DELETE' })); };
  const myId = user?.bmpl?.legacy_id;
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.bmpl?.all_access;

  return (
    <div>
      <div className="bm-page-head">
        <div><h1>Manage Task</h1><p>Vacancies handed to sourcing officers. Assign from a vacancy's page; acknowledge, re-assign or drop them here.</p></div>
        <div className="bm-actions"><ExportButton path={'/tasks'} params={{ q, ...filters }} columns={EXPORT_COLUMNS} name={'sourcing-tasks'} disabled={!data?.total} onDone={setMsg} /></div>
      </div>
      <Alert msg={msg} />

      {reassign && (
        <form
          className="bm-card"
          onSubmit={async (e) => { e.preventDefault(); if (await run(() => bmpl('/tasks/' + reassign.task._id, { method: 'PUT', body: { assignto: reassign.assignto } }), 'Task reassigned.')) setReassign(null); }}
        >
          <h2 className="bm-h2"><UserCog size={15} /> Re-assign vacancy #{reassign.task.vacn_id}</h2>
          <p className="bm-muted">Currently with {reassign.task.assignedTo || reassign.task.assignto}. The new owner will have to acknowledge it again.</p>
          <div className="bm-inline">
            <select className="bm-select" value={reassign.assignto} onChange={(e) => setReassign((r) => ({ ...r, assignto: e.target.value }))} required>
              <option value="">Assign to…</option>
              {(opts.staff || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button type="submit" className="bm-btn bm-btn-primary" disabled={busy || !reassign.assignto}>Re-assign</button>
            <button type="button" className="bm-btn bm-btn-ghost" onClick={() => setReassign(null)}><X size={14} /> Cancel</button>
          </div>
        </form>
      )}

      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Vacancy number" /></div>
        <select className="bm-select" value={filters.ack} onChange={(e) => setFilter('ack', e.target.value)}><option value="">All · Acknowledgement</option><option value="0">Awaiting acknowledgement</option><option value="1">Acknowledged</option></select>
        <select className="bm-select" value={filters.assignto} onChange={(e) => setFilter('assignto', e.target.value)}><option value="">All · Assigned to</option>{(opts.staff || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="bm-select" value={filters.company_name} onChange={(e) => setFilter('company_name', e.target.value)}><option value="">All · Owner</option>{(opts.company || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <span className="bm-daterange"><label>Assigned</label>
          <CalendarPicker value={filters.from} onChange={(v) => setFilter('from', v)} prefix="bm" size="sm" />
          <CalendarPicker value={filters.to} onChange={(v) => setFilter('to', v)} prefix="bm" size="sm" />
        </span>
        {myId != null && <label className="bm-inline"><input type="checkbox" checked={Boolean(filters.mine)} onChange={(e) => setFilter('mine', e.target.checked ? '1' : '')} /> Only mine</label>}
      </div>

      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No tasks" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Job id</th><th>Date of entry</th><th>Company details</th><th>Vessel</th><th>Opening details</th><th>Remark</th><th>Salary</th><th>Day/month</th><th>TAT</th><th>No of propose</th><th>Assigned to</th><th>Assigned by</th><th>Ack</th><th className="bm-screen-only">Actions</th></tr></thead>
            <tbody>{data.records.map((t) => {
              const acked = String(t.ackn) === '1';
              const canAck = !acked && (String(t.assignto) === String(myId) || isAdmin);
              return (
                <tr key={t._id}>
                  <td>{t.vacancy ? <Link className="bm-link" to={'/dashboard/bmpl/vacancies/' + t.vacancy._id}><strong>#{t.vacn_id}</strong></Link> : <strong>#{t.vacn_id}</strong>}</td>
                  <td className="bm-td-date">{fmtDate(t.dov, true)}</td>
                  <td><strong>{t.vacancy?.company}</strong><div className="bm-muted">{[t.vacancy?.rank || t.rank, t.vacancy?.excrew].filter(Boolean).join(' · ')}</div></td>
                  <td>{t.vacancy?.vessel}<div className="bm-muted">{t.vacancy?.location}</div></td>
                  <td>{t.vacancy?.noopening} opening(s){t.vacancy && <div className="bm-muted">{t.vacancy.exp}</div>}</td>
                  <td className="bm-td-wrap">{t.vacancy?.remark}</td>
                  <td>{t.vacancy?.salary} {t.vacancy?.currency}</td>
                  <td>{t.vacancy?.type_days === 'Perday' ? 'Per day' : 'Per month'}</td>
                  <td>{t.vacancy?.tat ? t.vacancy.tat + ' h' : ''}</td>
                  <td>{t.proposals}{t.selected ? <span className="bm-muted"> · {t.selected} sel.</span> : ''}</td>
                  <td>{t.assignedTo || t.assignto}</td><td>{t.assignby}</td>
                  <td>{acked ? <span className="bm-pill bm-pill-good">{fmtDate(t.ackndate)}</span> : <span className="bm-pill bm-pill-warn">Pending</span>}</td>
                  <td className="bm-inline bm-screen-only">
                    {canAck && <button type="button" className="bm-btn bm-btn-sm" disabled={busy} onClick={() => ack(t._id)}><Check size={12} /> Acknowledge</button>}
                    <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" disabled={busy} title="Re-assign" onClick={() => setReassign({ task: t, assignto: '' })}><UserCog size={12} /></button>
                    {isAdmin && <button type="button" className="bm-btn bm-btn-sm bm-btn-ghost bm-btn-danger" disabled={busy} title="Delete task" onClick={() => remove(t)}><Trash2 size={12} /></button>}
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
