// client/src/pages/bmpl/BmplModule.jsx
// The BMPL back-office, mounted inside the admin dashboard at /dashboard/bmpl.
// Loads the navigation and resource definitions the signed-in staff member
// is allowed to see, draws the 15-group menu, and routes to either the
// generic list/record pages or a hand-built workflow page.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { bmpl } from './api';
import BmplListPage from './BmplListPage';
import BmplRecordPage from './BmplRecordPage';
import { CUSTOM_PAGES } from './customPages';
import '../../styles/bmpl.css';

const Ctx = createContext({ resources: {}, menu: [], user: null, reload: () => {} });
export const useBmpl = () => useContext(Ctx);

function itemPath(item) {
  return item.type === 'resource' ? '/dashboard/bmpl/r/' + item.key : '/dashboard/bmpl/' + item.route;
}

function Placeholder({ label, legacyPage }) {
  return (
    <div className="bm-empty bm-empty-tall">
      <Icons.Construction size={28} />
      <strong>{label}</strong>
      <span>This page has not been rebuilt yet. It replaces <code>{legacyPage}</code> on the old site.</span>
    </div>
  );
}

export default function BmplModule() {
  const [init, setInit] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState({});
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  const load = async () => {
    const d = await bmpl('/init');
    if (d.success) setInit(d); else setError(d.message);
  };
  useEffect(() => { load(); }, []);

  // Keep the group containing the current page open.
  useEffect(() => {
    if (!init) return;
    for (const g of init.menu) {
      if (g.items.some((it) => location.pathname.startsWith(itemPath(it).split('?')[0]) && itemPath(it) !== '/dashboard/bmpl/')) {
        setOpen((o) => ({ ...o, [g.key]: true }));
      }
    }
  }, [init, location.pathname]);

  const ctx = useMemo(() => ({ resources: init?.resources || {}, menu: init?.menu || [], user: init?.user || null, reload: load }), [init]);

  if (error) return <div className="bm-alert bm-alert-error">{error}</div>;
  if (!init) return <div className="bm-loading">Loading BMPL back-office…</div>;

  const allItems = init.menu.flatMap((g) => g.items);

  return (
    <Ctx.Provider value={ctx}>
      <div className="bm-shell">
        <button type="button" className="bm-nav-toggle" onClick={() => setNavOpen((v) => !v)}>
          <Icons.Menu size={16} /> BMPL menu
        </button>
        <aside className={'bm-nav' + (navOpen ? ' bm-nav-open' : '')}>
          <div className="bm-nav-head">
            <Icons.Anchor size={16} />
            <div>
              <strong>BMPL Back-office</strong>
              <span>{init.user.username}{init.user.bmpl?.department ? ' · ' + init.user.bmpl.department : ''}</span>
            </div>
          </div>
          {init.menu.map((g) => {
            const Icon = Icons[g.icon] || Icons.Folder;
            const single = g.items.length === 1;
            if (single) {
              const it = g.items[0];
              return (
                <NavLink key={g.key} to={itemPath(it)} end={itemPath(it) === '/dashboard/bmpl/'} className={({ isActive }) => 'bm-nav-link bm-nav-top' + (isActive ? ' bm-nav-active' : '')} onClick={() => setNavOpen(false)}>
                  <Icon size={15} /> <span>{g.label}</span>
                </NavLink>
              );
            }
            return (
              <div key={g.key} className="bm-nav-group">
                <button type="button" className="bm-nav-link bm-nav-top" onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}>
                  <Icon size={15} /> <span>{g.label}</span>
                  <Icons.ChevronDown size={13} className={open[g.key] ? 'bm-chev-open' : ''} />
                </button>
                {open[g.key] && (
                  <div className="bm-nav-items">
                    {g.items.map((it) => (
                      <NavLink key={it.type + ':' + (it.key || it.route)} to={itemPath(it)} className={({ isActive }) => 'bm-nav-link' + (isActive ? ' bm-nav-active' : '')} onClick={() => setNavOpen(false)}>
                        {it.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        <main className="bm-main">
          <Routes>
            <Route index element={CUSTOM_PAGES['']} />
            <Route path="r/:resource" element={<BmplListPage />} />
            <Route path="r/:resource/:id" element={<BmplRecordPage />} />
            {[...new Map(allItems.filter((it) => it.type === 'page' && it.route).map((it) => [it.route.split('?')[0], it])).entries()].map(([route, it]) => {
              const el = CUSTOM_PAGES[route] || <Placeholder label={it.label} legacyPage={it.legacyPage} />;
              return <Route key={route} path={route} element={el} />;
            })}
            {/* Custom pages reachable by deep link but not in this user's menu list */}
            {Object.entries(CUSTOM_PAGES).filter(([route]) => route && !allItems.some((it) => it.type === 'page' && it.route.split('?')[0] === route)).map(([route, el]) => (
              <Route key={route} path={route} element={el} />
            ))}
            <Route path="*" element={<Navigate to="/dashboard/bmpl" replace />} />
          </Routes>
        </main>
      </div>
    </Ctx.Provider>
  );
}
