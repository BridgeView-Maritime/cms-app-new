// client/src/hooks/useScrollableRoot.js
// The dashboard's global stylesheet forces `overflow: hidden !important`
// on html/body/#root for its own fixed, non-scrolling shell — and since
// all component CSS ships in one bundle, that rule reaches every route,
// not just the dashboard. It doesn't block scrollIntoView() (programmatic
// scroll still works on an overflow:hidden element), only user-driven
// wheel/touch scroll, which is why a page can look frozen even though a
// nav click still "scrolls" it. Any normally-scrolling public page (the
// landing page, candidate login, candidate dashboard, ...) needs this.
import { useEffect } from 'react';

export function useScrollableRoot() {
  useEffect(() => {
    const targets = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean);
    targets.forEach((el) => el.style.setProperty('overflow-y', 'auto', 'important'));
    return () => {
      targets.forEach((el) => el.style.removeProperty('overflow-y'));
    };
  }, []);
}
