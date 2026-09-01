import { AddResume } from '../models/AddResume.js';

// Legacy dates come as 'YYYY-MM-DD', 'DD-MM-YY', or the MySQL zero-date
// placeholder '0000-00-00' — this normalizes to 'YYYY-MM-DD' or returns
// '' when the value isn't usable.
function parseLegacyDate(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('0000-00-00')) return '';

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? '' : trimmed.slice(0, 10);
  }

  // DD-MM-YY (seen in older rows, e.g. "31-12-69")
  const shortMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (shortMatch) {
    const [, dd, mm, yy] = shortMatch;
    if (+dd > 31 || +mm > 12) return '';
    const year = +yy <= 30 ? `20${yy}` : `19${yy}`; // heuristic century pivot
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  return '';
}

// Registration field -> [AddResume field(s), transform?]. First AddResume
// field with a usable value wins.
const FIELD_MAP = {
  dob: { sources: ['dob'], transform: parseLegacyDate },
  applied_rank: { sources: ['appliedrank'] },
  rank: { sources: ['presentrank'] },
  coc: { sources: ['coc'] },
  passport_no: { sources: ['passportno', 'passport'] },
  indosno: { sources: ['indosno'] },
  sidno: { sources: ['sidno'] },
  pancardno: { sources: ['pancardno'] },
  aadharno: { sources: ['aadharno'] },
  address: { sources: ['address'] },
  city: { sources: ['city'] },
  state: { sources: ['state'] },
  countryname: { sources: ['country'] },
  countrycode: { sources: ['countrycode'] },
  phoneno: { sources: ['mobileno', 'phoneno'] },
  cvcategory: { sources: ['cvcategory'] },
  vesseltypes: {
    sources: ['shiptype'],
    transform: (v) => (typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : null),
  },
};

const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Read-time only — never writes to the database. Fills in whichever
 * `candidateObj` fields are still empty using the candidate's matching
 * legacy `collection_addresume` record (by emailid), if one exists. The
 * gap closes for real the first time the candidate saves their profile,
 * since the filled-in values flow through the normal PUT /profile save.
 */
export async function applyLegacyResumeFallback(candidateObj) {
  if (!candidateObj?.emailid) return candidateObj;

  const escaped = candidateObj.emailid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const legacy = await AddResume.findOne({ emailid: { $regex: `^${escaped}$`, $options: 'i' } }).lean();
  if (!legacy) return candidateObj;

  const appliedFields = [];
  for (const [targetField, { sources, transform }] of Object.entries(FIELD_MAP)) {
    if (!isEmpty(candidateObj[targetField])) continue;

    for (const sourceField of sources) {
      const raw = legacy[sourceField];
      const value = transform ? transform(raw) : (typeof raw === 'string' ? raw.trim() : raw);
      if (!isEmpty(value)) {
        candidateObj[targetField] = value;
        appliedFields.push(targetField);
        break;
      }
    }
  }

  if (appliedFields.length) {
    candidateObj._legacyFallbackFields = appliedFields;
  }
  return candidateObj;
}
