// server/utils/resumeParser.js
// Best-effort field extraction from a resume's raw PDF text. Resumes come
// in wildly varying layouts, so every pattern here is deliberately
// tolerant (optional whitespace/newlines, case-insensitive) and every
// field is allowed to come back empty — the registration form always
// lets the candidate review and correct whatever this finds, it never
// submits silently on their behalf.

const grab = (text, pattern) => {
  const m = text.match(pattern);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
};

// First plausible dd.mm.yyyy / dd-mm-yyyy / dd/mm/yyyy date within `windowChars`
// characters after `label` (tables often put the date right after the label
// with only whitespace or other cells in between).
const grabDateNear = (text, label, windowChars = 60) => {
  const idx = text.search(label);
  if (idx === -1) return '';
  const slice = text.slice(idx, idx + windowChars);
  const m = slice.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (!m) return '';
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  const dd = d.padStart(2, '0');
  const mm = mo.padStart(2, '0');
  // Basic sanity check — reject obviously-invalid day/month before trusting it.
  if (+dd > 31 || +mm > 12) return '';
  return `${year}-${mm}-${dd}`;
};

export function extractResumeFields(rawText) {
  const text = rawText || '';

  const fullName = grab(text, /Name\s*:?\s*(.*?)(?:\n|Applied\s*for|Contact\s*no|Email)/i);
  const rank = grab(text, /Applied\s*for\s*:?\s*(.*?)(?:\n|Contact\s*no|Email)/i);
  const phoneno = grab(text, /Contact\s*no\.?\s*:?\s*(\+?\d[\d\s-]{6,14}\d)/i);
  const email = grab(text, /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

  const dob = grabDateNear(text, /D\.?\s*O\.?\s*B\.?/i, 80);

  const passport_no = grab(text, /Passport\s+([A-Z][0-9A-Z]{5,9})\b/i);
  const indosno = grab(text, /INDOS\s*No\.?\s*:?\s*([A-Z0-9]{5,12})/i);

  // Address: legacy resumes commonly list it as the last cell in the
  // personal-details row, right before the next section heading.
  const address = grab(
    text,
    /(?:Vill\.|Village|Address)\s*:?\s*(.*?)(?:\n\s*\n|DOCUMENT\s*DETAILS|COURSE\s*DETAILS|EXPERIENCE)/i
  );

  const found = {};
  const fields = { fullName, rank, phoneno, email, dob, passport_no, indosno, address };
  Object.entries(fields).forEach(([k, v]) => { if (v) found[k] = true; });

  return { fields, fieldsFound: Object.keys(found) };
}
