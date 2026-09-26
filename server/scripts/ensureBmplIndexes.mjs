// Indexes for the BMPL back-office query paths.
//
// The legacy collections came over from MySQL without their indexes, so every
// filtered list was a collection scan (the invoice builder took ~10s on
// 50k contracts). These are the columns the back-office actually filters and
// sorts on. Safe to re-run: createIndex is a no-op when the index exists.
//
//   node scripts/ensureBmplIndexes.mjs [--drop-unused]
import 'dotenv/config';
import mongoose from 'mongoose';

const INDEXES = {
  collection_contractnew: [
    { keys: { company_name: 1, signondate: -1 }, name: 'bmpl_company_signon' },
    { keys: { signtype: 1, signoffdate: -1 }, name: 'bmpl_signtype_signoff' },
    { keys: { vcan_id: 1 }, name: 'bmpl_vcan' },
    // Pooled Crew groups sign-offs by seafarer, newest first.
    { keys: { signtype: 1, vcan_id: 1, contract_id: -1 }, name: 'bmpl_signtype_vcan_contract' },
    { keys: { contract_id: -1 }, name: 'bmpl_contract_id' },
  ],
  collection_vacancies: [
    { keys: { dstatus: 1, id: -1 }, name: 'bmpl_dstatus_id' },
    { keys: { exp: 1, dov: -1 }, name: 'bmpl_exp_dov' },
    { keys: { company_name: 1 }, name: 'bmpl_company' },
    { keys: { rankname: 1 }, name: 'bmpl_rank' },
    { keys: { user: 1 }, name: 'bmpl_user' },
  ],
  collection_vacanciescandidate: [
    { keys: { status: 1, date: -1 }, name: 'bmpl_status_date' },
    { keys: { vacancyid: 1 }, name: 'bmpl_vacancy' },
    { keys: { indosno: 1 }, name: 'bmpl_indos' },
    { keys: { company_name: 1 }, name: 'bmpl_company' },
    { keys: { user: 1 }, name: 'bmpl_user' },
  ],
  collection_visiter: [
    { keys: { indosno: 1 }, name: 'bmpl_indos' },
    { keys: { email: 1 }, name: 'bmpl_email' },
    { keys: { doe: -1 }, name: 'bmpl_doe' },
    { keys: { rankname: 1 }, name: 'bmpl_rank' },
  ],
  collection_taskassign: [
    { keys: { vacn_id: 1 }, name: 'bmpl_vacancy' },
    { keys: { assignto: 1, ackn: 1 }, name: 'bmpl_assign_ack' },
    { keys: { eid: -1 }, name: 'bmpl_eid' },
  ],
  collection_ksa_visa: [
    { keys: { status: 1, doe: -1 }, name: 'bmpl_status_doe' },
    { keys: { indosno: 1 }, name: 'bmpl_indos' },
    { keys: { companyid: 1 }, name: 'bmpl_company' },
  ],
  collection_invoice: [
    { keys: { status: 1, doe: -1 }, name: 'bmpl_status_doe' },
    { keys: { companyid: 1, vcan_id: 1 }, name: 'bmpl_company_crew' },
    { keys: { invoiceno: -1 }, name: 'bmpl_invoiceno' },
    { keys: { invid: -1 }, name: 'bmpl_invid' },
  ],
  collection_document_upload: [{ keys: { indosno: 1 }, name: 'bmpl_indos' }, { keys: { id: -1 }, name: 'bmpl_id' }],
  collection_travel_schedule: [{ keys: { traveldate: -1 }, name: 'bmpl_traveldate' }, { keys: { indosno: 1 }, name: 'bmpl_indos' }],
  collection_payments: [{ keys: { payment_date: -1 }, name: 'bmpl_paydate' }, { keys: { indosno: 1 }, name: 'bmpl_indos' }],
  collection_medical_request: [{ keys: { cdate: -1 }, name: 'bmpl_cdate' }, { keys: { company: 1 }, name: 'bmpl_company' }],
  collection_flagdoc_new: [{ keys: { cdate: -1 }, name: 'bmpl_cdate' }, { keys: { company: 1 }, name: 'bmpl_company' }],
  collection_invoice_vendor: [{ keys: { status: 1, cdate: -1 }, name: 'bmpl_status_cdate' }],
  collection_grievance: [{ keys: { status: 1, id: -1 }, name: 'bmpl_status_id' }],
  collection_grievance_chat: [{ keys: { g_id: 1 }, name: 'bmpl_grievance' }],
  collection_crew_dg_data: [{ keys: { dgs_status: 1, id: -1 }, name: 'bmpl_status_id' }],
  collection_basic_requirement: [{ keys: { companyid: 1, type: 1 }, name: 'bmpl_company_type' }],
  collection_registration: [{ keys: { cvcategory: 1, regid: -1 }, name: 'bmpl_cvcat_regid' }, { keys: { countryname: 1 }, name: 'bmpl_country' }],
  collection_addresume: [{ keys: { emailid: 1 }, name: 'bmpl_email' }],
};

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
await mongoose.connect(uri);
const db = mongoose.connection.db;
const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

let made = 0, skipped = 0, missing = 0;
for (const [coll, defs] of Object.entries(INDEXES)) {
  if (!existing.has(coll)) { console.log(`  ${coll.padEnd(34)} MISSING collection - skipped`); missing += 1; continue; }
  // Mongoose already created some of these under its own names, so match on
  // the key pattern rather than the name.
  const current = await db.collection(coll).indexes();
  const have = new Set(current.map((i) => JSON.stringify(i.key)));
  for (const def of defs) {
    if (have.has(JSON.stringify(def.keys))) { skipped += 1; continue; }
    const t = Date.now();
    try {
      await db.collection(coll).createIndex(def.keys, { name: def.name, background: true });
      made += 1;
      console.log(`  ${coll.padEnd(34)} + ${def.name.padEnd(24)} ${Date.now() - t}ms`);
    } catch (err) {
      console.log(`  ${coll.padEnd(34)} ! ${def.name.padEnd(24)} ${err.message.slice(0, 80)}`);
    }
  }
}
console.log(`\n${made} created, ${skipped} already present, ${missing} collections absent.`);
await mongoose.disconnect();
