// client/src/pages/bmpl/BmplListPage.jsx
// The generic list behind every declarative resource: search, filters
// (including the legacy date ranges), sortable columns, paging, per-row
// actions, CSV export, print, and links into the record page.
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, X, ArrowUpDown, Info, Download, Printer } from 'lucide-react';
import { bmpl, downloadCsvFromApi } from './api';
import { Cell, Pager, Empty, Alert, RowActions } from './ui';
import { useBmpl } from './BmplModule';
import CalendarPicker from '../../components/CalendarPicker';

// Date-range filters carry two query keys; everything else carries one.
const filterKeys = (def) => (def?.filters || []).flatMap((f) => (f.type === 'daterange' ? [f.key + '_from', f.key + '_to'] : [f.key]));

export default function BmplListPage({ resourceKey: fixedKey, embedded = false, by, byValue, title }) {
  const params = useParams();
  const key = fixedKey || params.resource;
  const { resources } = useBmpl();
  const def = resources[key];
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  const [qInput, setQInput] = useState(sp.get('q') || '');
  const [q, setQ] = useState(sp.get('q') || '');
  const [filters, setFilters] = useState(() => Object.fromEntries(filterKeys(def).map((k) => [k, sp.get(k) || ''])));
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(null);
  const [options, setOptions] = useState({});
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);

  useEffect(() => {
    if (!def?.filters?.length) return;
    bmpl('/r/' + key + '/filter-options').then((d) => { if (d.success) setOptions(d.filters || {}); });
  }, [key, def]);

  const query = useMemo(() => {
    const p = { q, ...filters };
    if (sort) { p.sort = sort.key; p.dir = sort.dir; }
    if (by) { p.by = by; p.byValue = byValue; }
    return p;
  }, [q, filters, sort, by, byValue]);

  const load = () => {
    if (!def) return;
    setMsg((m) => (m?.type === 'error' ? null : m));
    bmpl('/r/' + key, { params: { ...query, page, limit: 25 } }).then((d) => { if (d.success) setData(d); else setMsg({ type: 'error', text: d.message }); });
  };
  useEffect(() => { load(); }, [key, def, query, page]);

  // Keep search/filters in the URL so a page can be linked to.
  useEffect(() => {
    if (embedded) return;
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    for (const [k, v] of Object.entries(filters)) if (v) next.set(k, v);
    setSp(next, { replace: true });
  }, [q, filters, embedded, setSp]);

  const columns = useMemo(() => def?.columns || [], [def]);
  if (!def) return <Empty title="Section not available" text="You do not have access to this section, or it does not exist." />;

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const hasFilters = Boolean(q) || Object.values(filters).some(Boolean);
  const toggleSort = (c) => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' }));
  const recordPath = (r) => '/dashboard/bmpl/r/' + key + '/' + r._id;
  const runAction = async (row, action, body) => {
    setBusy(true); setMsg(null);
    const d = await bmpl('/r/' + key + '/' + row._id + '/action/' + action.key, { method: 'POST', body: body || {} });
    setBusy(false);
    if (d.success) { setMsg({ type: 'success', text: d.message }); load(); return true; }
    setMsg({ type: 'error', text: d.message }); return false;
  };
  const exportCsv = async () => {
    setBusy(true);
    const d = await downloadCsvFromApi('/r/' + key + '/export', query, def.title);
    setBusy(false);
    if (!d.ok) setMsg({ type: 'error', text: d.message });
  };

  return (
    <div className={embedded ? 'bm-embedded' : ''}>
      {!embedded && (
        <div className="bm-page-head">
          <div>
            <h1>{title || def.title}</h1>
            {def.note && <p className="bm-note"><Info size={13} /> {def.note}</p>}
          </div>
          <div className="bm-actions">
            <button type="button" className="bm-btn" onClick={exportCsv} disabled={busy || !data?.total}><Download size={14} /> CSV</button>
            <button type="button" className="bm-btn" onClick={() => window.print()}><Printer size={14} /> Print</button>
            {def.creatable && <Link to={'/dashboard/bmpl/r/' + key + '/new'} className="bm-btn bm-btn-primary"><Plus size={15} /> New</Link>}
          </div>
        </div>
      )}

      <Alert msg={msg} />

      {(def.search?.length > 0 || def.filters?.length > 0) && (
        <div className="bm-toolbar">
          {def.search?.length > 0 && (
            <div className="bm-search">
              <Search size={15} />
              <input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder={'Search ' + def.search.slice(0, 3).join(', ') + (def.search.length > 3 ? '…' : '')} />
            </div>
          )}
          {(def.filters || []).map((f) => (f.type === 'daterange' ? (
            <span key={f.key} className="bm-daterange" title={f.label}>
              <label>{f.label}</label>
              <CalendarPicker value={filters[f.key + '_from']} onChange={(v) => setFilter(f.key + '_from', v)} prefix="bm" size="sm" placeholder="From" />
              <CalendarPicker value={filters[f.key + '_to']} onChange={(v) => setFilter(f.key + '_to', v)} prefix="bm" size="sm" placeholder="To" />
            </span>
          ) : (
            <select key={f.key} className="bm-select" value={filters[f.key] || ''} onChange={(e) => setFilter(f.key, e.target.value)}>
              <option value="">All · {f.label}</option>
              {(options[f.key] || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )))}
          {hasFilters && (
            <button type="button" className="bm-btn bm-btn-ghost" onClick={() => { setQInput(''); setQ(''); setFilters(Object.fromEntries(Object.keys(filters).map((k) => [k, '']))); setPage(1); }}>
              <X size={14} /> Clear
            </button>
          )}
          {embedded && <button type="button" className="bm-btn bm-btn-sm" onClick={exportCsv} disabled={busy || !data?.total}><Download size={13} /> CSV</button>}
        </div>
      )}

      {!data ? (
        <div className="bm-loading">Loading…</div>
      ) : data.records.length === 0 ? (
        <Empty title="No records" text={hasFilters ? 'Nothing matches the current search or filters.' : def.creatable ? 'Use New to add the first record.' : undefined} />
      ) : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} onClick={() => toggleSort(c)} className={sort?.key === c.key ? 'bm-th-sorted' : ''}>
                    {c.label}{sort?.key === c.key && <ArrowUpDown size={11} />}
                  </th>
                ))}
                {def.actions?.length > 0 && <th className="bm-screen-only">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.records.map((r) => (
                <tr key={r._id} onClick={() => navigate(recordPath(r))} className="bm-row-link">
                  {columns.map((c) => <td key={c.key} className={'bm-td-' + (c.type || 'text')}><Cell column={c} row={r} /></td>)}
                  {def.actions?.length > 0 && (
                    <td className="bm-screen-only" onClick={(e) => e.stopPropagation()}>
                      <RowActions actions={def.actions} row={r} busy={busy} onRun={(a, body) => runAction(r, a, body)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </div>
  );
}
