// client/src/pages/bmpl/pages/ShoreCvsPage.jsx
// "Shore Candidate All CV" (mode shore) and "Other Nationality Crew"
// (mode other): candidates from the public registration, sliced by CV
// category or by country.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, Download } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Pager, Empty, Alert, FieldSearch } from '../ui';
import { downloadCsv } from './ReportsPage';

export default function ShoreCvsPage({ mode = 'shore' }) {
  const navigate = useNavigate();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [rank, setRank] = useState('');
  const [country, setCountry] = useState('');
  const [fieldSearch, setFieldSearch] = useState({ name: '', indosno: '', email: '', phone: '', city: '', passport: '', cdc: '', shiptype: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => { const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { let c = false; bmpl('/cvs', { params: { mode, q, rank, country, page, limit: 25, ...fieldSearch } }).then((d) => { if (c) return; if (d.success) setData(d); else setMsg({ type: 'error', text: d.message }); }); return () => { c = true; }; }, [mode, q, rank, country, page, fieldSearch]);
  const shore = mode === 'shore';

  return (
    <div>
      <div className="bm-page-head">
        <div><h1>{shore ? 'Shore Candidate All CV' : 'Other Nationality Crew'}</h1><p>{shore ? 'Candidates who registered for shore (office) positions.' : 'Registered candidates whose country is not India.'}</p></div>
        {data?.records?.length > 0 && <button type="button" className="bm-btn" onClick={() => downloadCsv(mode + '-cvs', data.records, [{ key: 'uname', label: 'Name' }, { key: 'emailid', label: 'Email' }, { key: 'phoneno', label: 'Phone' }, { key: 'rank', label: 'Rank' }, { key: 'indosno', label: 'INDOS' }, { label: 'Passport', get: (r) => r.resume?.passportno || '' }, { label: 'Date of birth', get: (r) => fmtDate(r.dob || r.resume?.dob) }, { label: 'Available from', get: (r) => fmtDate(r.resume?.availablefrom) }, { key: 'countryname', label: 'Country' }, { key: 'city', label: 'City' }, { label: 'Registered', get: (r) => fmtDate(r.reg_date) }])}><Download size={14} /> CSV</button>}
      </div>
      <Alert msg={msg} />
      <div className="bm-toolbar">
        <div className="bm-search"><Search size={15} /><input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Name, email, INDOS, phone, city" /></div>
        <select className="bm-select" value={rank} onChange={(e) => { setRank(e.target.value); setPage(1); }}><option value="">All · {shore ? 'Position' : 'Rank'}</option>{(data?.ranks || []).map((r) => <option key={r} value={r}>{r}</option>)}</select>
        {!shore && <select className="bm-select" value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }}><option value="">All · Country</option>{(data?.countries || []).map((c) => <option key={c} value={c}>{c}</option>)}</select>}
        {(q || rank || country || Object.values(fieldSearch).some(Boolean)) && <button type="button" className="bm-btn bm-btn-ghost" onClick={() => { setQInput(''); setRank(''); setCountry(''); setFieldSearch(Object.fromEntries(Object.keys(fieldSearch).map((k) => [k, '']))); }}><X size={14} /> Clear</button>}
      </div>
      <FieldSearch
        fields={[{ key: 'name', label: 'Name' }, { key: 'indosno', label: 'INDOS' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'city', label: 'City' }, { key: 'passport', label: 'Passport (from CV)' }, { key: 'cdc', label: 'CDC (from CV)' }, { key: 'shiptype', label: 'Ship type (from CV)' }]}
        value={fieldSearch}
        onApply={(v) => { setFieldSearch(v); setPage(1); }}
      />
      {!data ? <div className="bm-loading">Loading…</div> : data.records.length === 0 ? <Empty title="No candidates match" /> : (
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead><tr><th>Full name</th><th>{shore ? 'Position' : 'Rank'}</th><th>Indos no</th><th>Passport</th><th>Date of birth</th><th>Mobile</th><th>Email id</th><th>Available date</th><th>Country</th><th>City</th><th>Resume</th><th>On board</th><th>Registered</th><th>Status</th></tr></thead>
            <tbody>{data.records.map((r) => (
              <tr key={r._id} className={r.indosno ? 'bm-row-link' : ''} onClick={() => r.indosno && navigate('/dashboard/bmpl/candidates?q=' + encodeURIComponent(r.indosno))}>
                <td><strong>{r.uname}</strong>{r.resume?.fullname && r.resume.fullname !== r.uname ? <div className="bm-muted">{r.resume.fullname}</div> : null}</td>
                <td>{r.rank || r.resume?.presentrank}{r.resume?.shore_department ? <div className="bm-muted">{r.resume.shore_department}</div> : null}</td>
                <td>{r.indosno}</td>
                <td>{r.resume?.passportno || r.resume?.passport}</td>
                <td className="bm-td-date">{fmtDate(r.dob || r.resume?.dob)}</td>
                <td>{r.phoneno}</td><td>{r.emailid}</td>
                <td className="bm-td-date">{fmtDate(r.resume?.availablefrom)}</td>
                <td>{r.countryname}{r.resume?.nationality ? <div className="bm-muted">{r.resume.nationality}</div> : null}</td><td>{r.city}{r.state ? ', ' + r.state : ''}</td>
                <td>{r.resume ? <span className="bm-pill bm-pill-good">CV {fmtDate(r.resume.cdate)}</span> : <span className="bm-muted">none</span>}</td>
                <td>{r.onboard ? <span className="bm-pill bm-pill-info">{r.onboard}</span> : ''}</td>
                <td className="bm-td-date">{fmtDate(r.reg_date)}<div className="bm-muted">{r.via}</div></td>
                <td><span className={'bm-pill ' + (String(r.status).toLowerCase() === 'active' ? 'bm-pill-good' : 'bm-pill-muted')}>{r.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
      {shore && <p className="bm-muted">Shore vacancies are under <Link className="bm-link" to="/dashboard/bmpl/r/shoreVacancies">Shore Job</Link>.</p>}
    </div>
  );
}
