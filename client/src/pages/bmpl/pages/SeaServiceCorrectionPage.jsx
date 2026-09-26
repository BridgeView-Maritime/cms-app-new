// client/src/pages/bmpl/pages/SeaServiceCorrectionPage.jsx
// "Sea Service correction" - grievances raised by seafarers from their portal
// (wrong sea time, missing sign-off, etc.) and the reply thread with them.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Send, Lock, Unlock, FileText } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert } from '../ui';

export default function SeaServiceCorrectionPage() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('1');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(null); // detail payload
  const [reply, setReply] = useState('');
  const [closeRemark, setCloseRemark] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  const load = () => bmpl('/grievances', { params: { q, open, page, limit: 25 } }).then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, [q, open, page]);
  const openOne = async (id) => { const d = await bmpl('/grievances/' + id); if (d.success) { setSel(d); setReply(''); setCloseRemark(''); } else setMsg({ type: 'error', text: d.message }); };
  const act = async (fn) => { setBusy(true); setMsg(null); const d = await fn(); setBusy(false); if (d.success) { await openOne(sel.grievance._id); load(); } else setMsg({ type: 'error', text: d.message }); };

  return (
    <div>
      <div className="bm-page-head"><div><h1>Sea Service correction</h1><p>Requests from seafarers to correct their sea-service records. Reply in the thread; close when the record is fixed.</p></div></div>
      <Alert msg={msg} />
      <div className="bm-split bm-split-wide">
        <div className="bm-card">
          <div className="bm-toolbar">
            <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Title, INDOS, email, text" /></div>
            <select className="bm-select" value={open} onChange={(e) => { setOpen(e.target.value); setPage(1); }}><option value="1">Open</option><option value="0">Closed</option><option value="">All</option></select>
          </div>
          {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No grievances" /> : (
            <div className="bm-table-wrap">
              <table className="bm-table">
                <thead><tr><th>Seafarer</th><th>Title</th><th>Raised</th><th>Replies</th><th>State</th></tr></thead>
                <tbody>{data.records.map((g) => (
                  <tr key={g._id} className={'bm-row-link' + (sel?.grievance?._id === g._id ? ' bm-row-active' : '')} onClick={() => openOne(g._id)}>
                    <td><strong>{g.person?.name || g.indosno || g.emailid}</strong><div className="bm-muted">{g.indosno}{g.person?.rankname ? ' · ' + g.person.rankname : ''}</div></td>
                    <td className="bm-td-wrap">{g.g_title}</td><td className="bm-td-date">{fmtDate(g.cdate)}</td><td>{g.replies}{g.lastReply ? <div className="bm-muted">{fmtDate(g.lastReply)}</div> : null}</td>
                    <td><span className={'bm-pill ' + (g.open ? 'bm-pill-warn' : 'bm-pill-good')}>{g.open ? 'Open' : 'Closed'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
        </div>

        <div className="bm-card">
          {!sel ? <Empty title="Select a grievance" text="The thread and the seafarer's contracts appear here." /> : (
            <>
              <div className="bm-page-head" style={{ marginBottom: 8 }}>
                <div>
                  <h2 className="bm-h2" style={{ margin: 0 }}>{sel.grievance.g_title || 'Grievance #' + sel.grievance.id}</h2>
                  <p className="bm-muted" style={{ margin: 0 }}>{sel.grievance.person ? <Link className="bm-link" to={'/dashboard/bmpl/candidates/' + sel.grievance.person._id}>{sel.grievance.person.name}</Link> : sel.grievance.indosno} · {sel.grievance.emailid} · raised {fmtDate(sel.grievance.cdate, true)}</p>
                </div>
                <span className={'bm-pill ' + (sel.grievance.open ? 'bm-pill-warn' : 'bm-pill-good')}>{sel.grievance.open ? 'Open' : 'Closed'}</span>
              </div>
              {sel.grievance.g_remark && <p className="bm-pre">{sel.grievance.g_remark}</p>}
              {(sel.grievance.doc_1 || sel.grievance.doc_2) && <p className="bm-inline">{[sel.grievance.doc_1, sel.grievance.doc_2].filter(Boolean).map((f) => <span key={f} className="bm-file" title="Attached on the old site; file not migrated"><FileText size={12} /> {f}</span>)}</p>}
              {!sel.grievance.open && sel.grievance.g_close_remark && <p className="bm-muted">Closed: {sel.grievance.g_close_remark}</p>}

              <h3 className="bm-h3">Thread ({sel.chat.length})</h3>
              {sel.chat.length === 0 ? <p className="bm-muted">No replies yet.</p> : <div className="bm-thread">{sel.chat.map((c) => <div key={c._id} className="bm-thread-msg"><small>{c.user} · {fmtDate(c.cdate, true)}</small>{c.chat}</div>)}</div>}
              <form className="bm-inline" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (reply.trim()) act(() => bmpl('/grievances/' + sel.grievance._id + '/reply', { method: 'POST', body: { chat: reply.trim() } })).then(() => setReply('')); }}>
                <input type="text" className="bm-select" style={{ flex: 1, maxWidth: 'none' }} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the seafarer…" disabled={busy} />
                <button type="submit" className="bm-btn bm-btn-primary bm-btn-sm" disabled={busy || !reply.trim()}><Send size={12} /> Reply</button>
              </form>
              <div className="bm-inline" style={{ marginTop: 10 }}>
                {sel.grievance.open ? (
                  <><input type="text" className="bm-select" style={{ flex: 1, maxWidth: 'none' }} value={closeRemark} onChange={(e) => setCloseRemark(e.target.value)} placeholder="Closing remark (what was corrected)" disabled={busy} />
                    <button type="button" className="bm-btn bm-btn-sm" disabled={busy} onClick={() => act(() => bmpl('/grievances/' + sel.grievance._id + '/close', { method: 'POST', body: { remark: closeRemark } }))}><Lock size={12} /> Close</button></>
                ) : <button type="button" className="bm-btn bm-btn-sm" disabled={busy} onClick={() => act(() => bmpl('/grievances/' + sel.grievance._id + '/close', { method: 'POST', body: { reopen: true } }))}><Unlock size={12} /> Reopen</button>}
              </div>

              <h3 className="bm-h3">Sea service on record ({sel.contracts.length})</h3>
              {sel.contracts.length === 0 ? <p className="bm-muted">No contracts found for this INDOS.</p> : (
                <div className="bm-table-wrap"><table className="bm-table">
                  <thead><tr><th>Owner</th><th>Vessel</th><th>Rank</th><th>Sign-on</th><th>Sign-off</th><th>Reason</th></tr></thead>
                  <tbody>{sel.contracts.map((c) => <tr key={c._id}><td>{c.company}</td><td>{c.vesselname}</td><td>{c.rank}</td><td className="bm-td-date">{fmtDate(c.signondate)}</td><td className="bm-td-date">{c.signtype === 'Signon' ? <span className="bm-pill bm-pill-good">On board</span> : fmtDate(c.signoffdate)}</td><td>{c.reason}</td></tr>)}</tbody>
                </table></div>
              )}
              <p className="bm-muted" style={{ marginTop: 8 }}>Fix the record itself under <Link className="bm-link" to="/dashboard/bmpl/crew-signon">Crew Signon</Link>.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
