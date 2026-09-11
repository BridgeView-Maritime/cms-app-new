import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AddResume } from '../models/AddResume.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Photos uploaded through this app live in uploads/photos. Photos from the
// old site (addresume.photo1, 95 candidates) would live in
// uploads/legacy-photos if copied across - like CVs, most were not, so a
// record is only turned into a URL when the file is actually there.
export const PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'photos');
const LEGACY_PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'legacy-photos');

export const byLowerEmail = (emailid) => ({
  $expr: { $eq: [{ $toLower: { $ifNull: ['$emailid', ''] } }, String(emailid || '').trim().toLowerCase()] },
});

export function photoUrlFor(filename) {
  if (!filename) return null;
  const name = String(filename);
  const safe = path.basename(name);
  if (safe !== name) return null;
  if (fs.existsSync(path.join(PHOTO_DIR, safe))) return '/uploads/photos/' + encodeURIComponent(safe);
  if (fs.existsSync(path.join(LEGACY_PHOTO_DIR, safe))) return '/uploads/legacy-photos/' + encodeURIComponent(safe);
  return null;
}

export async function findCandidatePhoto(emailid) {
  if (!emailid) return null;
  try {
    const row = await AddResume.findOne(byLowerEmail(emailid), { photo1: 1 }).lean();
    return photoUrlFor(row?.photo1);
  } catch {
    return null;
  }
}
