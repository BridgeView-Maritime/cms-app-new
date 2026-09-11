/**
 * The legacy tables identify a candidate inconsistently — some carry an
 * email column (`emailid`, `email`, `cemail`, `emp_email`), some an INDOS
 * number (`indos`, `indosno`, `vcan_id`), and the column names differ per
 * table. This builds a single Mongo filter that matches on any of the
 * fields a given table actually uses.
 *
 * Email is compared case-insensitively; INDOS is only used when the
 * candidate actually has one (a blank INDOS must never match the thousands
 * of legacy rows that also have a blank one).
 */
export function candidateFilter(candidate, { emailFields = [], indosFields = [] } = {}) {
  const clauses = [];

  const email = (candidate?.emailid || '').trim().toLowerCase();
  if (email) {
    for (const f of emailFields) {
      clauses.push({ $expr: { $eq: [{ $toLower: { $ifNull: ['$' + f, ''] } }, email] } });
    }
  }

  const indos = (candidate?.indosno || '').trim();
  if (indos) {
    for (const f of indosFields) {
      clauses.push({ $expr: { $eq: [{ $toUpper: { $ifNull: ['$' + f, ''] } }, indos.toUpperCase()] } });
    }
  }

  // Nothing to match on — return a filter that deliberately finds nothing,
  // rather than one that would match every row with a blank key.
  if (!clauses.length) return { _id: null };

  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

/**
 * Values to stamp onto a row the candidate creates, so it links back the
 * same way the legacy rows do.
 */
export function ownershipFields(candidate, { emailFields = [], indosFields = [] } = {}) {
  const out = {};
  const email = (candidate?.emailid || '').trim();
  const indos = (candidate?.indosno || '').trim();
  for (const f of emailFields) out[f] = email;
  for (const f of indosFields) out[f] = indos;
  return out;
}

// Which columns each legacy table uses to identify its candidate.
export const LINKS = {
  nokdetails: { emailFields: ['email'], indosFields: ['indos'] },
  bank_details: { emailFields: ['emailid'], indosFields: ['indosno'] },
  preemployment: { emailFields: ['emailid'], indosFields: ['indosno'] },
  education: { emailFields: ['cemail'], indosFields: ['indos'] },
  addpresea: { emailFields: ['emailid'], indosFields: ['indos'] },
  addcoc: { emailFields: ['emailid'], indosFields: ['indos'] },
  addoffshore: { emailFields: ['emailid'], indosFields: ['indos'] },
  addcertificate: { emailFields: ['emailid'], indosFields: ['indos'] },
  addstcw: { emailFields: ['emailid'], indosFields: ['indos'] },
  contractnew: { emailFields: ['email'], indosFields: ['vcan_id'] },
  shipcontractnew: { emailFields: ['emp_email'], indosFields: ['vcan_id'] },
  // Phase 4/5. appliedjobs has no INDOS column at all, so email is the
  // only link available there.
  savejob: { emailFields: ['emailid'], indosFields: ['indosno'] },
  appliedjobs: { emailFields: ['emailid'], indosFields: [] },
  contract_details: { emailFields: ['emailid'], indosFields: ['indosno'] },
  grievance: { emailFields: ['emailid'], indosFields: ['indosno'] },
  addppe: { emailFields: ['emailid'], indosFields: ['indos'] },
  ppe_request: { emailFields: ['emailid'], indosFields: ['indosno'] },
};
