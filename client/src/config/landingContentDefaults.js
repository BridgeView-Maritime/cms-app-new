// client/src/config/landingContentDefaults.js
// Mirrors the Mongoose schema defaults in server/models/LandingContent.js.
// Used as a fallback so the landing page and its admin editor always have
// something sensible to render before the API responds (or if it's offline).

export const DEFAULT_LANDING_CONTENT = {
  topbar: {
    phone1: '+91 22 27564962',
    phone2: '+91 9757108735',
    email: 'admin@bridgeviewmaritime.com',
    rpslText: 'RPSL No. MUM-218 · Valid till 30-12-2026',
  },
  hero: {
    eyebrow: 'Recruitment & Placement Since 2018 · Navi Mumbai, India',
    heading: 'Get Your Perfect Job',
    subheading: 'Simplified Maritime Jobs & Future Opportunities',
    description:
      'Bridgeview Maritime Pvt Ltd connects seafarers with the right offshore and onshore opportunities — backed by end-to-end documentation, flag and visa support.',
    ctaResumeLabel: 'Submit Your Resume',
    ctaApplyLabel: 'Apply For Jobs',
    ctaBrowseLabel: 'Browse More Jobs',
    ctaCompanyLabel: 'Company wise Jobs',
  },
  process: {
    kicker: 'How It Works',
    heading: 'Four Simple Steps to Your Next Voyage',
    steps: [
      { title: 'Register First', desc: 'Create your free candidate profile in just a couple of minutes.' },
      { title: 'Complete Your Profile', desc: 'Add your certificates, sea service record and documents.' },
      { title: 'Apply For Jobs', desc: 'Apply to open ranks that match your rank and experience.' },
      { title: 'Get Opportunities', desc: 'Get shortlisted, interviewed and set sail with confidence.' },
    ],
  },
  ranks: {
    kicker: 'Popular Ranks',
    heading: 'Currently in Demand',
    items: [
      { title: 'ETO with COC', tag: 'Offshore' },
      { title: 'Able Seaman (COP - II/5)', tag: 'Offshore' },
      { title: 'Second Engineer', tag: 'Offshore' },
    ],
  },
  services: {
    kicker: 'Our Services',
    heading: 'Everything You Need, In One Place',
    courses: {
      title: 'Value Added Courses',
      description: 'Guidance and support for the certification and value-added courses seafarers need to stay sea-ready.',
    },
    flags: {
      title: 'Flag Documentation',
      description: 'Complete documentation assistance across major registries.',
      items: ['Panama', 'St. Kitts & Nevis', 'Liberian Flag', 'Honduras Flag'],
    },
    visa: {
      title: 'Visa Services',
      description: 'Visa facilitation support for the countries our seafarers sail through and work in most.',
      items: ['UAE', 'Saudi Arabia', 'China', 'Japan', 'Schengen', 'Other Countries'],
    },
    products: {
      title: 'Products',
      description: 'Enquire about our range of maritime products and supplies — reach out and our team will assist.',
    },
  },
  about: {
    kicker: 'About Us',
    heading: 'Bridgeview Maritime Pvt Ltd',
    paragraph:
      'Bridgeview Maritime Pvt Ltd is a licensed manning and recruitment agency helping seafarers find the right offshore and onshore opportunities. We support candidates through every step — from registration to documentation, flag formalities and visa assistance — so they can focus on what matters: their next voyage.',
    whyUs: [
      'Personalised job matching by rank and experience',
      'End-to-end flag & documentation support',
      'Dedicated visa assistance for major maritime nations',
      'RPSL licensed recruitment & placement service',
    ],
    badges: [
      { title: 'RPSL No. MUM-218', subtitle: 'Valid through 30-12-2026' },
      { title: 'Est. 2018', subtitle: 'Trusted maritime recruitment partner' },
      { title: 'Navi Mumbai, India', subtitle: 'Head office & operations base' },
      { title: 'Full Lifecycle Support', subtitle: 'Registration to placement' },
    ],
  },
  contact: {
    kicker: 'Contact Info',
    heading: 'We’d Love to Hear From You',
    subtitle:
      'The candidate self-service portal is coming soon — until then, reach out directly and our team will help you apply.',
    phone1: '+91 22 27564962',
    phone2: '+91 9757108735',
    email: 'admin@bridgeviewmaritime.com',
    addressLine1: 'B-904, The Great Eastern Summit, Plot No. 66, Sector-15,',
    addressLine2: 'CBD Belapur, Navi Mumbai-400614, India',
  },
  footer: {
    brandName: 'Bridgeview Maritime',
    addressText: 'B-904, The Great Eastern Summit, Plot No. 66, Sector-15, CBD Belapur, Navi Mumbai-400614, India',
    rpslText: 'RPSL No. MUM-218 · Valid through 30-12-2026',
    copyright: 'Copyright © 2018-2026 Developed By Bridgeview Maritime All rights reserved.',
  },
};

// Deep-merges fetched content over the defaults so a partially-saved document
// (or a network hiccup on a nested field) never blanks out a whole section.
export function mergeLandingContent(fetched) {
  if (!fetched || typeof fetched !== 'object') return DEFAULT_LANDING_CONTENT;

  const merge = (base, incoming) => {
    if (Array.isArray(base)) {
      return Array.isArray(incoming) && incoming.length ? incoming : base;
    }
    if (base && typeof base === 'object') {
      const result = { ...base };
      if (incoming && typeof incoming === 'object') {
        for (const key of Object.keys(base)) {
          result[key] = merge(base[key], incoming[key]);
        }
      }
      return result;
    }
    return incoming !== undefined && incoming !== null && incoming !== '' ? incoming : base;
  };

  return merge(DEFAULT_LANDING_CONTENT, fetched);
}
