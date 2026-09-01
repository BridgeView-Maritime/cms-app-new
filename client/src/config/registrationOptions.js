// client/src/config/registrationOptions.js
// Standard maritime industry terminology used as select options on the
// registration form. Country lists come from the real, live
// collection_country data (fetched via CANDIDATE_ENDPOINTS.COUNTRIES) —
// only these are kept here, since no authoritative rank/COC/vessel-type
// list exists in this system yet.

export const CV_CATEGORIES = ['Marine', 'Offshore', 'Onshore'];

export const COC_OPTIONS = [
  'Master (FG)',
  'Chief Mate (FG)',
  'Officer of the Watch (Deck)',
  '2nd Mate (FG)',
  '3rd Mate (FG)',
  'Chief Engineer (MEO Class I)',
  '2nd Engineer (MEO Class II)',
  'Officer in Charge of an Engineering Watch',
  'ETO COC',
  'GMDSS GOC',
  'Not Applicable / Rating',
];

export const RANK_OPTIONS = [
  'Master',
  'Chief Officer',
  '2nd Officer',
  '3rd Officer',
  'Deck Cadet',
  'Bosun',
  'Able Seaman (AB)',
  'Ordinary Seaman (OS)',
  'Chief Engineer',
  '2nd Engineer',
  '3rd Engineer',
  '4th Engineer',
  'Engine Cadet',
  'ETO',
  'Oiler',
  'Motorman / Wiper',
  'Fitter',
  'Cook',
  'Steward',
  'GP Rating',
];

export const VESSEL_TYPE_OPTIONS = [
  'Container',
  'Bulk Carrier',
  'Crude Oil Tanker',
  'Product / Chemical Tanker',
  'LPG Carrier',
  'LNG Carrier',
  'General Cargo',
  'RoRo',
  'Passenger / Cruise',
  'Offshore Supply Vessel (PSV/OSV)',
  'Anchor Handling Tug Supply (AHTS)',
  'Tug',
  'Dredger',
  'Reefer',
  'Fishing Vessel',
];

export const MAX_VESSEL_TYPES = 5;
