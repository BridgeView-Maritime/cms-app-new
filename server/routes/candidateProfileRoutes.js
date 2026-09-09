import express from 'express';
import { authenticateCandidate } from '../middleware/candidateAuthMiddleware.js';
import { candidateFilter, LINKS } from '../utils/candidateMatch.js';
import { crudSection as makeCrudSection } from '../utils/crudSection.js';
import { NokDetail } from '../models/NokDetail.js';
import { BankDetail } from '../models/BankDetail.js';
import { PreEmployment } from '../models/PreEmployment.js';
import { Education } from '../models/Education.js';
import { PreSea } from '../models/PreSea.js';
import { ContractNew, ShipContractNew } from '../models/SeaService.js';
import { AddCoc } from '../models/AddCoc.js';
import { AddOffshore } from '../models/AddOffshore.js';
import { AddCertificate } from '../models/AddCertificate.js';
import { AddStcw } from '../models/AddStcw.js';
import { EducationType, PreSeaType, RankType, VesselType,
         CertificateType, CocCertificate, OffCertificate, CocCountry } from '../models/CandidateLookups.js';

const router = express.Router();

// All the candidate-owned CRUD sections share one implementation; this
// just binds it to this router.
const crudSection = (opts) => makeCrudSection({ router, ...opts });

crudSection({
  path: '/nok',
  model: NokDetail,
  link: LINKS.nokdetails,
  fields: ['nokname', 'nokrel', 'nokcontact', 'nokalternate', 'nokaddress', 'nok_emailid',
           'relative_name', 'relative_contact', 'relative_address', 'reason'],
});

crudSection({
  path: '/bank-details',
  model: BankDetail,
  link: LINKS.bank_details,
  fields: ['name', 'accountno', 'code', 'bank_name', 'bank_address'],
  single: true,
});

crudSection({
  path: '/previous-employers',
  model: PreEmployment,
  link: LINKS.preemployment,
  fields: ['compname', 'persname', 'mobileno', 'preemailid'],
});

crudSection({
  path: '/education',
  model: Education,
  link: LINKS.education,
  fields: ['degree', 'subject', 'percentage', 'issuedate', 'university', 'country'],
});

crudSection({
  path: '/presea',
  model: PreSea,
  link: LINKS.addpresea,
  fields: ['presea_name', 'grade', 'periodfrom', 'periodto', 'remarks'],
});

// --- Phase 3: certificates. All four link by emailid + indos. ---
crudSection({
  path: '/coc',
  model: AddCoc,
  link: LINKS.addcoc,
  fields: ['cocname', 'cocnumber', 'coccountry', 'cocissue', 'cocexp'],
});

crudSection({
  path: '/offshore-certificates',
  model: AddOffshore,
  link: LINKS.addoffshore,
  fields: ['certificate', 'number', 'issuedate', 'expdate'],
});

crudSection({
  path: '/other-certificates',
  model: AddCertificate,
  link: LINKS.addcertificate,
  fields: ['certificate', 'number', 'issuedate', 'expdate'],
});

crudSection({
  path: '/stcw',
  model: AddStcw,
  link: LINKS.addstcw,
  fields: ['certificate', 'number', 'institute', 'issuedate', 'expdate'],
});

// ==========================================================================
// SEA SERVICES — read-only: these contracts are created by the company, not
// the candidate. Merged from both legacy contract tables.
// ==========================================================================
router.get('/sea-services', authenticateCandidate, async (req, res) => {
  try {
    const [contracts, shipContracts] = await Promise.all([
      ContractNew.find(candidateFilter(req.candidate, LINKS.contractnew)).lean(),
      ShipContractNew.find(candidateFilter(req.candidate, LINKS.shipcontractnew)).lean(),
    ]);

    // Some legacy rows store company/rank as raw foreign keys to tables that
    // were never migrated (e.g. company "83", rank "339"). A bare id means
    // nothing to a candidate, so surface it as empty but keep the raw value
    // on the payload rather than discarding it.
    const isBareId = (v) => {
      const t = String(v || '').trim();
      return t.length > 0 && Number.isFinite(Number(t));
    };
    const nameOrNull = (v) => (!v || isBareId(v) ? '' : String(v).trim());

    const spanDays = (from, to) => {
      const on = new Date(from);
      const off = new Date(to);
      if (Number.isNaN(on.getTime()) || Number.isNaN(off.getTime())) return null;
      if (on.getFullYear() < 1902 || off < on) return null;
      return Math.round((off - on) / 86400000);
    };

    const normalize = (r, source) => ({
      _id: r._id,
      source,
      company: nameOrNull(r.company_name),
      companyRef: isBareId(r.company_name) ? String(r.company_name) : '',
      vessel: r.vesselname || '',
      vesselType: r.vesseltype || '',
      rank: nameOrNull(r.rank_id),
      rankRef: isBareId(r.rank_id) ? String(r.rank_id) : '',
      signOn: r.signondate || null,
      signOff: r.signoffdate || null,
      // contractduration in the source is a nominal figure that disagrees with
      // the actual dates (e.g. "6" against a 21-day span), so it is computed.
      days: spanDays(r.signondate, r.signoffdate),
      imo: r.imo || '',
    });

    const records = [
      ...contracts.map((r) => normalize(r, 'contract')),
      ...shipContracts.map((r) => normalize(r, 'ship')),
    ].sort((a, b) => new Date(b.signOn || 0) - new Date(a.signOn || 0));

    const totalDays = records.reduce((sum, r) => sum + (r.days || 0), 0);

    return res.status(200).json({ success: true, records, totalDays });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// LOOKUPS — dropdown options, straight from the migrated reference tables.
// ==========================================================================
router.get('/lookups', async (req, res) => {
  try {
    const [eduTypes, preseaTypes, ranks, vesselTypes, certs, cocCerts, offCerts, cocCountries] = await Promise.all([
      EducationType.find({}).lean(),
      PreSeaType.find({}).lean(),
      RankType.find({}).sort({ rank: 1 }).lean(),
      VesselType.find({}).sort({ vesseltype: 1 }).lean(),
      CertificateType.find({}).sort({ certificate: 1 }).lean(),
      CocCertificate.find({}).sort({ certificate: 1 }).lean(),
      OffCertificate.find({}).sort({ certificate: 1 }).lean(),
      CocCountry.find({}).sort({ coc_country: 1 }).lean(),
    ]);

    const active = (rows, flag = 'status') =>
      rows.filter((r) => r[flag] === undefined || String(r[flag]) === '1' || r[flag] === true);

    // Several reference tables hold one row per country (certificatecoc has
    // "Master" for the UK, India, ...). The forms only store the name, so
    // the same label repeated is just a confusing duplicate in a dropdown.
    const names = (rows, field) => {
      const seen = new Set();
      const out = [];
      for (const r of rows) {
        const v = String(r[field] || '').trim();
        if (!v) continue;
        const k = v.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(v);
      }
      return out.sort((a, b) => a.localeCompare(b));
    };

    return res.status(200).json({
      success: true,
      educationTypes: names(active(eduTypes), 'edu_type'),
      preseaTypes: names(active(preseaTypes), 'presea_name'),
      ranks: names(active(ranks), 'rank'),
      vesselTypes: names(active(vesselTypes), 'vesseltype'),
      certificates: names(certs, 'certificate'),
      cocCertificates: names(active(cocCerts), 'certificate'),
      offshoreCertificates: names(offCerts, 'certificate'),
      cocCountries: names(cocCountries, 'coc_country'),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
