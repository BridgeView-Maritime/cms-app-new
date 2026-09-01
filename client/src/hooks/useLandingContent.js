// client/src/hooks/useLandingContent.js
// Shared admin-editable site content (topbar/footer/etc.) — used by every
// page that renders LandingHeader/LandingFooter, not just the landing page
// itself, so branding/contact info stays consistent everywhere.
import { useState, useEffect } from 'react';
import { LANDING_ENDPOINTS } from '../config/api';
import { DEFAULT_LANDING_CONTENT, mergeLandingContent } from '../config/landingContentDefaults';

export function useLandingContent() {
  const [content, setContent] = useState(DEFAULT_LANDING_CONTENT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LANDING_ENDPOINTS.CONTENT);
        const data = await res.json();
        if (!cancelled && data?.success && data.data) {
          setContent(mergeLandingContent(data.data));
        }
      } catch (err) {
        console.warn('Landing content fetch failed, using defaults.', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return content;
}
