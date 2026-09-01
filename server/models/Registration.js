import mongoose from 'mongoose';

// Maps the legacy MySQL-migrated `collection_registration` collection
// (21k+ real candidate records, migrated via the MySQL -> MongoDB tool).
// Field set verified against every document in the live collection —
// these 34 fields are the complete legacy shape. `resumes` is the one
// field this app adds on top, for the new CV-upload feature.
const ResumeSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const RegistrationSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    regid: { type: Number, index: true },

    uname: { type: String, default: '' },
    emailid: { type: String, default: '', index: true },
    password: { type: String, default: '' },
    repassword: { type: String, default: '' },

    phone_code: mongoose.Schema.Types.Mixed,
    countrycode: { type: String, default: '' },
    phoneno: { type: String, default: '' },

    aadharno: { type: String, default: '' },
    pancardno: { type: String, default: '' },
    sidno: { type: String, default: '' },
    indosno: { type: String, default: '' },

    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    countryname: { type: String, default: '' },

    rank: { type: String, default: '' },
    vesseltype: { type: String, default: '' },
    engine_type: { type: String, default: '' },
    cvcategory: { type: String, default: '' },

    status: { type: String, default: 'active' },
    admin_approval: { type: String, default: '' },
    approvaldate: { type: String, default: '' },

    getemail: { type: Number, default: 0 },
    session: { type: String, default: '' },
    otp: { type: String, default: '' },
    otp_timestamp: { type: String, default: '' },
    logouttime: { type: String, default: '' },
    currenttime: { type: String, default: '' },
    reg_date: { type: String, default: '' },
    cdate: Date,
    via: { type: String, default: '' },
    whom: { type: String, default: '' },

    // New: candidate CV uploads (no legacy data existed for this).
    resumes: { type: [ResumeSchema], default: [] },

    // New: self-service registration fields — none of these exist in the
    // legacy migrated data, they're only ever populated by the new
    // registration wizard.
    dob: Date,
    passport_no: { type: String, default: '' },
    coc_country: { type: String, default: '' },
    coc: { type: String, default: '' },
    applied_rank: { type: String, default: '' },
    vesseltypes: { type: [String], default: [] },
    otp_verified: { type: Boolean, default: false },
  },
  { strict: false, collection: 'collection_registration' }
);

export const Registration = mongoose.models.Registration || mongoose.model('Registration', RegistrationSchema);
