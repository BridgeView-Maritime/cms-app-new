// The legacy schema stores foreign keys as bare ids in text columns
// (vacancies.company_name = "128", rank_id = "339"). These maps turn them
// back into names. They are small reference tables, so they are loaded once
// and refreshed every few minutes rather than joined on every request.
import { LegacyBoCompany } from '../models/legacy/LegacyBoCompany.js';
import { LegacyBoRank } from '../models/legacy/LegacyBoRank.js';
import { LegacyBoCountry } from '../models/legacy/LegacyBoCountry.js';
import { LegacyVessel } from '../models/legacy/LegacyVessel.js';
import { LegacyCurrency } from '../models/legacy/LegacyCurrency.js';
import { LegacyShipSubcat } from '../models/legacy/LegacyShipSubcat.js';
import { LegacyCategShiptype } from '../models/legacy/LegacyCategShiptype.js';
import { LegacyCompanylogin } from '../models/legacy/LegacyCompanylogin.js';
import { LegacyAgentDetails } from '../models/legacy/LegacyAgentDetails.js';
import { LegacyDoctor } from '../models/legacy/LegacyDoctor.js';
import { LegacyShoreRank } from '../models/legacy/LegacyShoreRank.js';

const TTL_MS = 5 * 60 * 1000;

// name -> { model, key, label(doc), extra?(doc) }
const SOURCES = {
  company: { model: LegacyBoCompany, key: 'com_id', label: (d) => String(d.company_name || '').trim(), extra: (d) => ({ short: d.company_shortname || '' }) },
  rank: { model: LegacyBoRank, key: 'id', label: (d) => String(d.rankname || '').trim(), extra: (d) => ({ type: d.type || '', category: d.catagory || '' }) },
  country: { model: LegacyBoCountry, key: 'id', label: (d) => String(d.countryname || '').trim() },
  vessel: { model: LegacyVessel, key: 'vessel_id', label: (d) => String(d.vesselname || '').trim(), extra: (d) => ({ imo: d.IMO_Number || '', company: d.company_name || '', type: d.vesseltype || '', flag: d.Flag || '', category: d.vessel_category || '' }) },
  currency: { model: LegacyCurrency, key: 'cu_id', label: (d) => String(d.currency_type || '').trim() },
  shipSubcat: { model: LegacyShipSubcat, key: 'shsub_id', label: (d) => String(d.subcat_name || '').trim() },
  shipCategory: { model: LegacyCategShiptype, key: 'c_st', label: (d) => String(d.ship_type || '').trim() },
  staff: { model: LegacyCompanylogin, key: 'id', label: (d) => String(d.fullname || d.username || '').trim(), extra: (d) => ({ username: d.username || '', dept: d.dept || '' }) },
  staffByUsername: { model: LegacyCompanylogin, key: 'username', label: (d) => String(d.fullname || d.username || '').trim(), extra: (d) => ({ id: d.id, dept: d.dept || '' }) },
  agent: { model: LegacyAgentDetails, key: 'id', label: (d) => String(d.Agent_name || '').trim() },
  doctor: { model: LegacyDoctor, key: 'id', label: (d) => String(d.doctorname || '').trim() },
  shoreRank: { model: LegacyShoreRank, key: 'id', label: (d) => String(d.rankname || '').trim() },
};

const cache = new Map(); // name -> { at, map: Map<string, {label, ...extra}> }

export async function lookup(name) {
  const src = SOURCES[name];
  if (!src) throw new Error('unknown lookup ' + name);
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.map;
  const rows = await src.model.find({}).lean();
  const map = new Map();
  for (const d of rows) {
    const k = String(d[src.key] ?? '').trim();
    if (!k) continue;
    map.set(k, { label: src.label(d), ...(src.extra ? src.extra(d) : {}) });
  }
  cache.set(name, { at: Date.now(), map });
  return map;
}

export function invalidate(name) {
  if (name) cache.delete(name); else cache.clear();
}

/** Name for an id, or the raw value when it does not resolve (never blank a real value). */
export async function nameOf(source, id) {
  if (id === null || id === undefined || id === '') return '';
  const map = await lookup(source);
  return map.get(String(id).trim())?.label || String(id);
}

/**
 * Adds `_display` to each row: { field: label } for every field listed in
 * `mapping` ({ field: lookupName }). Unresolvable ids keep the raw value so
 * nothing on screen silently turns blank.
 */
export async function resolveRows(rows, mapping) {
  const names = [...new Set(Object.values(mapping))];
  const maps = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await lookup(n)])));
  return rows.map((r) => {
    const _display = {};
    for (const [field, source] of Object.entries(mapping)) {
      const v = r[field];
      if (v === null || v === undefined || v === '') { _display[field] = ''; continue; }
      _display[field] = maps[source].get(String(v).trim())?.label || String(v);
    }
    return { ...r, _display };
  });
}

/** Options for a select: [{ value, label }] sorted by label. */
export async function optionsOf(source, { onlyActive } = {}) {
  const map = await lookup(source);
  const out = [];
  for (const [value, info] of map) if (info.label) out.push({ value, label: info.label });
  return out.sort((a, b) => a.label.localeCompare(b.label));
}
