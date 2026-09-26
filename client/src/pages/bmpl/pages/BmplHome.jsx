// client/src/pages/bmpl/pages/BmplHome.jsx
// The BMPL back-office dashboard: live pipeline counts and the latest
// movements, each tile a shortcut into the relevant page.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, Hourglass, CheckCircle2, ClipboardList, Anchor, LogOut, Plane, Receipt, UserCheck, TrendingUp } from 'lucide-react';
import { bmpl, fmtDate } from '../api';
import { Alert, Empty } from '../ui';
import { useBmpl } from '../BmplModule';

const P = '/dashboard/bmpl/';

export default function BmplHome() {
  const { user, menu } = useBmpl();
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => { bmpl('/stats').then((d) => (d.success ? setData(d) : setMsg({ type: 'error', text: d.message }))); }, []);

  const c = data?.counts || {};
  const tiles = [
    { to: P + 'vacancies?exp=Open', icon: Briefcase, label: 'Open vacancies', value: c.openVacancies },
    { to: P + 'candidates', icon: Users, label: 'Candidates on file', value: c.candidates },
    { to: P + 'proposals?status=Pending', icon: Hourglass, label: 'Proposals under process', value: c.pendingProposals },
    { to: P + 'documentation-tasks', icon: CheckCircle2, label: 'Selected - in documentation', value: c.selected },
    { to: P + 'sourcing-tasks?ack=0', icon: ClipboardList, label: 'Tasks awaiting acknowledgement', value: c.unackedTasks, sub: c.openTasksMine ? c.openTasksMine + ' assigned to you' : undefined },
    { to: P + 'crew-signon?signtype=Signon', icon: Anchor, label: 'Sign-ons, last 30 days', value: c.signonsMonth },
    { to: P + 'crew-signon?signtype=Signoff', icon: LogOut, label: 'Sign-offs, last 30 days', value: c.signoffsMonth },
    { to: P + 'travel-diary?upcoming=1', icon: Plane, label: 'Travelling in the next 7 days', value: c.travelSoon },
    { to: P + 'r/invoices', icon: Receipt, label: 'Invoices on record', value: c.unprintedInvoices },
  ];

  return (
    <div>
      <div className="bm-page-head">
        <div>
          <h1>Welcome{user?.username ? ', ' + user.username : ''}</h1>
          <p>{menu.length} sections available to you. Numbers below are live from the crewing records.</p>
        </div>
      </div>
      <Alert msg={msg} />
      {!data ? <div className="bm-loading">Loading…</div> : (
        <>
          <div className="bm-tiles">
            {tiles.map((t) => (
              <Link key={t.label} to={t.to} className="bm-tile">
                <span><t.icon size={13} /> {t.label}</span>
                <strong>{(t.value ?? 0).toLocaleString()}</strong>
                {t.sub && <small>{t.sub}</small>}
              </Link>
            ))}
          </div>

          <div className="bm-grid-2">
            <div className="bm-card">
              <h2 className="bm-h2"><Briefcase size={15} /> Latest vacancies</h2>
              {data.recentVacancies.length === 0 ? <Empty title="No vacancies" /> : (
                <ul className="bm-list">
                  {data.recentVacancies.map((v) => (
                    <li key={v._id}>
                      <Link to={P + 'vacancies/' + v._id} className="bm-link"><strong>#{v.id}</strong> {v.rank} · {v.company}{v.vessel ? ' · ' + v.vessel : ''}</Link>
                      <span className={'bm-pill ' + (v.exp === 'Open' ? 'bm-pill-good' : 'bm-pill-muted')}>{v.exp}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bm-card">
              <h2 className="bm-h2"><UserCheck size={15} /> Latest proposals</h2>
              {data.recentProposals.length === 0 ? <Empty title="No proposals" /> : (
                <ul className="bm-list">
                  {data.recentProposals.map((p) => (
                    <li key={p._id}>
                      <span><strong>{p.indosno}</strong> {p.rank} · {p.company} <span className="bm-muted">by {p.user}</span></span>
                      <span className={'bm-pill ' + (p.status === 'Selected' ? 'bm-pill-good' : p.status === 'Pending' ? 'bm-pill-warn' : 'bm-pill-muted')}>{p.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {(data.myTasks?.length > 0 || data.trend?.length > 0) && (
            <div className="bm-grid-2">
              <div className="bm-card">
                <h2 className="bm-h2"><ClipboardList size={15} /> My tasks</h2>
                {!data.myTasks?.length ? <Empty title="Nothing assigned to you" text="Vacancies assigned to you for sourcing appear here." /> : (
                  <ul className="bm-list">
                    {data.myTasks.map((t) => (
                      <li key={t._id}>
                        <span>{t.vacancy_id ? <Link to={P + 'vacancies/' + t.vacancy_id} className="bm-link"><strong>#{t.vacancyId}</strong></Link> : <strong>#{t.vacancyId}</strong>} {t.rank}{t.company ? ' · ' + t.company : ''}{t.vessel ? ' · ' + t.vessel : ''}</span>
                        <span className={'bm-pill ' + (t.acknowledged ? 'bm-pill-good' : 'bm-pill-warn')}>{t.acknowledged ? 'Acknowledged' : 'To acknowledge'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bm-card">
                <h2 className="bm-h2"><TrendingUp size={15} /> Last six months</h2>
                <ul className="bm-bars">
                  {data.trend.map((m) => {
                    const max = Math.max(...data.trend.map((x) => Math.max(x.signons, x.signoffs, x.proposals)), 1);
                    return (
                      <li key={m.month}>
                        <span className="bm-bars-label">{m.month}</span>
                        <span className="bm-bars-track" title={m.signons + ' sign-ons, ' + m.signoffs + ' sign-offs, ' + m.proposals + ' proposals'}><span style={{ width: Math.round((m.signons / max) * 100) + '%' }} /></span>
                        <strong>{m.signons} on</strong>
                      </li>
                    );
                  })}
                </ul>
                <p className="bm-muted">Bars show sign-ons; hover for sign-offs and proposals in the same month.</p>
              </div>
            </div>
          )}

          {data.travel.length > 0 && (
            <div className="bm-card">
              <h2 className="bm-h2"><Plane size={15} /> Travelling this week</h2>
              <ul className="bm-list">
                {data.travel.map((t) => (
                  <li key={t._id}><span><strong>{t.indosno}</strong> {t.from} → {t.to} {t.details && <span className="bm-muted">· {t.details}</span>}</span><span>{fmtDate(t.date)}</span></li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
