// client/src/pages/bmpl/pages/CmsControlPanelPage.jsx
// "CMS Control Panel" - which staff member may open which back-office page.
// Mirrors the legacy cms_usersubmenu rights: a user either has all_access or
// a list of legacy page names.
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Save, ShieldCheck, UserPlus } from 'lucide-react';
import { bmpl } from '../api';
import { Alert, Empty } from '../ui';

export default function CmsControlPanelPage() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [sel, setSel] = useState(null); // user being edited
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [addQ, setAddQ] = useState('');
  const [addHits, setAddHits] = useState([]);

  const load = () => bmpl('/control-panel/users').then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message })));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (addQ.trim().length < 2) { setAddHits([]); return; } const t = setTimeout(() => bmpl('/control-panel/candidates', { params: { q: addQ.trim() } }).then((d) => setAddHits(d.users || [])), 300); return () => clearTimeout(t); }, [addQ]);

  const users = useMemo(() => (data?.users || []).filter((u) => (!onlyActive || u.status === 'Active') && (!q || (u.username + ' ' + u.email + ' ' + (u.bmpl?.department || '')).toLowerCase().includes(q.toLowerCase()))), [data, q, onlyActive]);
  const pick = (u) => { setSel(u); setDraft({ all_access: Boolean(u.bmpl?.all_access), pages: [...(u.bmpl?.pages || [])], department: u.bmpl?.department || '', status: u.status }); };
  const toggle = (page) => setDraft((d) => ({ ...d, pages: d.pages.includes(page) ? d.pages.filter((p) => p !== page) : [...d.pages, page] }));
  const toggleGroup = (g, on) => setDraft((d) => { const set = new Set(d.pages); for (const it of g.items) (on ? set.add(it.legacyPage) : set.delete(it.legacyPage)); return { ...d, pages: [...set] }; });
  const save = async () => {
    setBusy(true); setMsg(null);
    const d = await bmpl('/control-panel/users/' + sel._id, { method: 'PUT', body: draft });
    setBusy(false);
    if (d.success) { setMsg({ type: 'success', text: draft.status !== 'Active' ? 'Saved. ' + sel.username + ' is now ' + draft.status.toLowerCase() + '.' : 'Permissions saved for ' + sel.username + '.' }); await load(); setSel(null); setDraft(null); } else setMsg({ type: 'error', text: d.message });
  };

  return (
    <div>
      <div className="bm-page-head"><div><h1>CMS Control Panel</h1><p>Staff accounts and the back-office sections each one can open. Changes apply on the user's next page load.</p></div></div>
      <Alert msg={msg} />
      <div className="bm-split bm-split-wide">
        <div className="bm-card">
          <div className="bm-toolbar">
            <div className="bm-search"><Search size={15} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Username, email, department" /></div>
            <label className="bm-inline"><input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> Active only</label>
          </div>
          {!data ? <div className="bm-loading">Loading…</div> : users.length === 0 ? <Empty title="No staff match" /> : (
            <div className="bm-table-wrap">
              <table className="bm-table">
                <thead><tr><th>User</th><th>Department</th><th>Role</th><th>Status</th><th>Access</th></tr></thead>
                <tbody>{users.map((u) => (
                  <tr key={u._id} className={'bm-row-link' + (sel?._id === u._id ? ' bm-row-active' : '')} onClick={() => pick(u)}>
                    <td><strong>{u.username}</strong><div className="bm-muted">{u.email}</div></td><td>{u.bmpl?.department}</td><td>{u.role}</td>
                    <td><span className={'bm-pill ' + (u.status === 'Active' ? 'bm-pill-good' : 'bm-pill-muted')}>{u.status}</span></td>
                    <td>{u.bmpl?.all_access ? <span className="bm-pill bm-pill-info"><ShieldCheck size={11} /> All sections</span> : (u.bmpl?.pages || []).length + ' pages'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <h3 className="bm-h3"><UserPlus size={12} /> Give another admin user access</h3>
          <div className="bm-search"><Search size={15} /><input type="search" value={addQ} onChange={(e) => setAddQ(e.target.value)} placeholder="Search all admin users by username or email" /></div>
          {addHits.length > 0 && <ul className="bm-list">{addHits.map((u) => <li key={u._id}><span><strong>{u.username}</strong> <span className="bm-muted">{u.email} · {u.role}</span></span><button type="button" className="bm-btn bm-btn-sm" onClick={() => { pick({ ...u, bmpl: { all_access: false, pages: [], department: '' } }); setAddQ(''); }}>{u.hasBmpl ? 'Edit' : 'Grant access'}</button></li>)}</ul>}
        </div>

        <div className="bm-card">
          {!sel ? <Empty title="Pick a staff member" text="Their sections appear here." /> : (
            <>
              <div className="bm-page-head" style={{ marginBottom: 10 }}>
                <div><h2 className="bm-h2" style={{ margin: 0 }}>{sel.username}</h2><p className="bm-muted" style={{ margin: 0 }}>{sel.email}{sel.bmpl?.legacy_username ? ' · legacy login ' + sel.bmpl.legacy_username : ''}</p></div>
                <button type="button" className="bm-btn bm-btn-primary" disabled={busy} onClick={save}><Save size={14} /> {busy ? 'Saving…' : 'Save'}</button>
              </div>
              <div className="bm-form-grid">
                <label className="bm-field"><span>Department</span><input type="text" value={draft.department} onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))} /></label>
                <label className="bm-field"><span>Account status</span><select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}><option>Active</option><option>Inactive</option><option>Blocked</option></select></label>
                <label className="bm-field bm-field-wide bm-inline"><input type="checkbox" checked={draft.all_access} onChange={(e) => setDraft((d) => ({ ...d, all_access: e.target.checked }))} /> <span>All sections (super user)</span></label>
              </div>
              <div className={'bm-perm-grid' + (draft.all_access ? ' bm-disabled' : '')}>
                {data.menus.filter((g) => g.items.length).map((g) => {
                  const n = g.items.filter((it) => draft.pages.includes(it.legacyPage)).length;
                  return (
                    <div key={g.key} className="bm-perm-group">
                      <h3>{g.label} <span className="bm-inline"><span className="bm-muted">{n}/{g.items.length}</span><button type="button" className="bm-btn bm-btn-sm bm-btn-ghost" disabled={draft.all_access} onClick={() => toggleGroup(g, n < g.items.length)}>{n < g.items.length ? 'All' : 'None'}</button></span></h3>
                      {g.items.map((it) => <label key={it.legacyPage + it.label}><input type="checkbox" disabled={draft.all_access} checked={draft.all_access || draft.pages.includes(it.legacyPage)} onChange={() => toggle(it.legacyPage)} /> {it.label}</label>)}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
