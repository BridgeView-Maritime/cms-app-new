import mongoose from 'mongoose';

// Single-document content store for the public marketing landing page.
// Only text/content fields live here — page structure, icons and navigation
// stay in the frontend so an admin edit can never break the layout.

const StepSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  desc: { type: String, default: '' }
}, { _id: false });

const RankSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  tag: { type: String, default: 'Offshore' }
}, { _id: false });

const BadgeSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' }
}, { _id: false });

const LandingContentSchema = new mongoose.Schema(
  {
    // Only ever one document — always looked up by this fixed code.
    content_code: { type: String, default: 'PUBLIC_LANDING_PAGE', unique: true },

    topbar: {
      phone1: { type: String, default: '+91 22 27564962' },
      phone2: { type: String, default: '+91 9757108735' },
      email: { type: String, default: 'admin@bridgeviewmaritime.com' },
      rpslText: { type: String, default: 'RPSL No. MUM-218 · Valid till 30-12-2026' }
    },

    hero: {
      eyebrow: { type: String, default: 'Recruitment & Placement Since 2018 · Navi Mumbai, India' },
      heading: { type: String, default: 'Get Your Perfect Job' },
      subheading: { type: String, default: 'Simplified Maritime Jobs & Future Opportunities' },
      description: {
        type: String,
        default: 'Bridgeview Maritime Pvt Ltd connects seafarers with the right offshore and onshore opportunities — backed by end-to-end documentation, flag and visa support.'
      },
      ctaResumeLabel: { type: String, default: 'Submit Your Resume' },
      ctaApplyLabel: { type: String, default: 'Apply For Jobs' },
      ctaBrowseLabel: { type: String, default: 'Browse More Jobs' },
      ctaCompanyLabel: { type: String, default: 'Company wise Jobs' }
    },

    process: {
      kicker: { type: String, default: 'How It Works' },
      heading: { type: String, default: 'Four Simple Steps to Your Next Voyage' },
      steps: {
        type: [StepSchema],
        default: [
          { title: 'Register First', desc: 'Create your free candidate profile in just a couple of minutes.' },
          { title: 'Complete Your Profile', desc: 'Add your certificates, sea service record and documents.' },
          { title: 'Apply For Jobs', desc: 'Apply to open ranks that match your rank and experience.' },
          { title: 'Get Opportunities', desc: 'Get shortlisted, interviewed and set sail with confidence.' }
        ]
      }
    },

    ranks: {
      kicker: { type: String, default: 'Popular Ranks' },
      heading: { type: String, default: 'Currently in Demand' },
      items: {
        type: [RankSchema],
        default: [
          { title: 'ETO with COC', tag: 'Offshore' },
          { title: 'Able Seaman (COP - II/5)', tag: 'Offshore' },
          { title: 'Second Engineer', tag: 'Offshore' }
        ]
      }
    },

    services: {
      kicker: { type: String, default: 'Our Services' },
      heading: { type: String, default: 'Everything You Need, In One Place' },
      courses: {
        title: { type: String, default: 'Value Added Courses' },
        description: { type: String, default: 'Guidance and support for the certification and value-added courses seafarers need to stay sea-ready.' }
      },
      flags: {
        title: { type: String, default: 'Flag Documentation' },
        description: { type: String, default: 'Complete documentation assistance across major registries.' },
        items: { type: [String], default: ['Panama', 'St. Kitts & Nevis', 'Liberian Flag', 'Honduras Flag'] }
      },
      visa: {
        title: { type: String, default: 'Visa Services' },
        description: { type: String, default: 'Visa facilitation support for the countries our seafarers sail through and work in most.' },
        items: { type: [String], default: ['UAE', 'Saudi Arabia', 'China', 'Japan', 'Schengen', 'Other Countries'] }
      },
      products: {
        title: { type: String, default: 'Products' },
        description: { type: String, default: 'Enquire about our range of maritime products and supplies — reach out and our team will assist.' }
      }
    },

    about: {
      kicker: { type: String, default: 'About Us' },
      heading: { type: String, default: 'Bridgeview Maritime Pvt Ltd' },
      paragraph: {
        type: String,
        default: 'Bridgeview Maritime Pvt Ltd is a licensed manning and recruitment agency helping seafarers find the right offshore and onshore opportunities. We support candidates through every step — from registration to documentation, flag formalities and visa assistance — so they can focus on what matters: their next voyage.'
      },
      whyUs: {
        type: [String],
        default: [
          'Personalised job matching by rank and experience',
          'End-to-end flag & documentation support',
          'Dedicated visa assistance for major maritime nations',
          'RPSL licensed recruitment & placement service'
        ]
      },
      badges: {
        type: [BadgeSchema],
        default: [
          { title: 'RPSL No. MUM-218', subtitle: 'Valid through 30-12-2026' },
          { title: 'Est. 2018', subtitle: 'Trusted maritime recruitment partner' },
          { title: 'Navi Mumbai, India', subtitle: 'Head office & operations base' },
          { title: 'Full Lifecycle Support', subtitle: 'Registration to placement' }
        ]
      }
    },

    contact: {
      kicker: { type: String, default: 'Contact Info' },
      heading: { type: String, default: 'We’d Love to Hear From You' },
      subtitle: {
        type: String,
        default: 'The candidate self-service portal is coming soon — until then, reach out directly and our team will help you apply.'
      },
      phone1: { type: String, default: '+91 22 27564962' },
      phone2: { type: String, default: '+91 9757108735' },
      email: { type: String, default: 'admin@bridgeviewmaritime.com' },
      addressLine1: { type: String, default: 'B-904, The Great Eastern Summit, Plot No. 66, Sector-15,' },
      addressLine2: { type: String, default: 'CBD Belapur, Navi Mumbai-400614, India' }
    },

    footer: {
      brandName: { type: String, default: 'Bridgeview Maritime' },
      addressText: {
        type: String,
        default: 'B-904, The Great Eastern Summit, Plot No. 66, Sector-15, CBD Belapur, Navi Mumbai-400614, India'
      },
      rpslText: { type: String, default: 'RPSL No. MUM-218 · Valid through 30-12-2026' },
      copyright: { type: String, default: 'Copyright © 2018-2026 Developed By Bridgeview Maritime All rights reserved.' }
    },

    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, strict: false }
);

export const LandingContent = mongoose.models.LandingContent || mongoose.model('LandingContent', LandingContentSchema);
