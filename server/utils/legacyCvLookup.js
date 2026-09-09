import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PreviousCv } from '../models/PreviousCv.js';
import { AddResume } from '../models/AddResume.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Where legacy CV files would live if they were copied across from the old
// site's /upload folder. Records exist for candidates whose files were never
// carried over, so each entry reports whether it's actually downloadable.
const LEGACY_DIR = path.join(__dirname, '..', 'uploads', 'legacy-cv');

function describe(filename, { latest = false, uploadedAt = null } = {}) {
  const name = String(filename);
  // Guard against path traversal coming from legacy data before touching disk.
  const safe = path.basename(name);
  const available = safe === name && fs.existsSync(path.join(LEGACY_DIR, safe));
  return {
    filename: name,
    uploadedAt,
    latest,
    available,
    url: available ? '/uploads/legacy-cv/' + encodeURIComponent(safe) : null,
  };
}

/**
 * Read-time only. Reproduces how the old site sourced a candidate's CVs:
 * `addresume.photo` held the current CV, while `previous_cv` held the
 * history. Each entry is flagged with whether the underlying file actually
 * made it across, so a missing file shows as a record rather than a dead link.
 */
export async function findLegacyResumes(emailid) {
  if (!emailid) return [];

  const lowered = emailid.trim().toLowerCase();
  const byLowerEmail = { $expr: { $eq: [{ $toLower: '$emailid' }, lowered] } };
  const out = [];

  try {
    const current = await AddResume.findOne(byLowerEmail, { photo: 1 }).lean();
    if (current && current.photo) out.push(describe(current.photo, { latest: true }));
  } catch {
    // collection_addresume not available - fall through to history only
  }

  try {
    const rows = await PreviousCv.find(byLowerEmail).sort({ id: -1 }).limit(10).lean();
    for (const r of rows) {
      if (!r.cv) continue;
      if (out.some((e) => e.filename === String(r.cv))) continue; // don't repeat the current CV
      out.push(describe(r.cv, { uploadedAt: r.date || null }));
    }
  } catch {
    // collection_previous_cv not migrated yet - just show whatever we have
  }

  return out;
}
