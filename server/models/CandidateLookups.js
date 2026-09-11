import mongoose from 'mongoose';

// Small reference tables that drive the dropdowns on the candidate forms.
// All migrated from the legacy MySQL lookups.
const lookup = (name, collection, fields) =>
  mongoose.models[name] ||
  mongoose.model(name, new mongoose.Schema({ _mysqlId: Number, id: Number, ...fields }, { strict: false, collection }));

export const EducationType = lookup('EducationType', 'collection_education_type', {
  edu_type: String,
  status: mongoose.Schema.Types.Mixed,
});

export const PreSeaType = lookup('PreSeaType', 'collection_presea', {
  presea_name: String,
  status: mongoose.Schema.Types.Mixed,
});

export const RankType = lookup('RankType', 'collection_rank', {
  rankid: Number,
  Type: String,
  rank: String,
  status: mongoose.Schema.Types.Mixed,
});

export const VesselType = lookup('VesselType', 'collection_vesseltype', {
  vesselid: Number,
  vesseltype: String,
  shipid: String,
  status: mongoose.Schema.Types.Mixed,
});

export const CertificateType = lookup('CertificateType', 'collection_certificate', {
  certificate: String,
});

// Certificate reference lists used by the Phase 3 certificate sections.
export const CocCertificate = lookup('CocCertificate', 'collection_certificatecoc', {
  certificate: String,
  country: String,
  type: String,
  status: mongoose.Schema.Types.Mixed,
});

export const OffCertificate = lookup('OffCertificate', 'collection_offcertificate', {
  certificate: String,
});

export const CocCountry = lookup('CocCountry', 'collection_coc_country', {
  coc_country: String,
});

// Experience Details / Crane Experience dropdowns on the Personal
// Information page (legacy addresume.php).
export const CraneType = lookup('CraneType', 'collection_cranetype', {
  crane_type: String,
  status: mongoose.Schema.Types.Mixed,
});

export const CraneMaker = lookup('CraneMaker', 'collection_cranemaker', {
  crane_maker: String,
  status: mongoose.Schema.Types.Mixed,
});

export const CookCategory = lookup('CookCategory', 'collection_cook_category', {
  cookid: Number,
  cookskill: String,
});
