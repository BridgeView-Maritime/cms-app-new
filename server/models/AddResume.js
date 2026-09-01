import mongoose from 'mongoose';

// Maps the legacy MySQL-migrated `collection_addresume` collection — the
// old "addresume.php" extended-profile table (5k+ real records). Only
// `regid` is populated on ~2% of rows, so it is NOT a reliable join key;
// `emailid` (case-insensitive) is what actually links a legacy record to
// a `collection_registration` account — see candidateRoutes.js, which
// uses this collection purely as a read-time fallback for candidates
// whose own Registration profile fields are still empty.
const AddResumeSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    resumeid: Number,
    regid: { type: Number, default: 0 },

    emailid: { type: String, default: '', index: true },
    fullname: { type: String, default: '' },
    mobileno: { type: String, default: '' },
    phoneno: { type: String, default: '' },
    phone_code: mongoose.Schema.Types.Mixed,
    countrycode: { type: String, default: '' },

    dob: { type: String, default: '' },
    dobc: { type: String, default: '' },
    gender: { type: String, default: '' },
    nationality: { type: String, default: '' },
    marital_status: { type: String, default: '' },
    religion: mongoose.Schema.Types.Mixed,
    height: { type: String, default: '' },
    weight: { type: String, default: '' },
    language: { type: String, default: '' },
    english_communication: { type: String, default: '' },
    child: { type: String, default: '' },
    child_type: { type: String, default: '' },

    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },

    aadharno: { type: String, default: '' },
    pancardno: { type: String, default: '' },
    sidno: { type: String, default: '' },
    indosno: { type: String, default: '' },
    passport: { type: String, default: '' },
    passportno: { type: String, default: '' },
    seamanbno: { type: String, default: '' },
    seamanexpdate: { type: String, default: '' },

    presentrank: { type: String, default: '' },
    appliedrank: { type: String, default: '' },
    exprank: { type: String, default: '' },
    expdate: { type: String, default: '' },
    shiptype: { type: String, default: '' },
    cvcategory: { type: String, default: '' },
    skills: { type: String, default: '' },
    technical_skills: { type: String, default: '' },

    coc: { type: String, default: '' },
    cocnumber: { type: String, default: '' },
    cocissue: { type: String, default: '' },
    cocexp: { type: String, default: '' },
    iauthority: { type: String, default: '' },
    idate: { type: String, default: '' },
    siauthority: { type: String, default: '' },
    sidate: { type: String, default: '' },
    viauthority: { type: String, default: '' },
    vidate: { type: String, default: '' },
    otheriauthority: { type: String, default: '' },
    visa: { type: String, default: '' },
    vexpdate: { type: String, default: '' },

    // Legacy upload slots — file names only (the migration carried the
    // metadata, not the underlying files), so these are informational,
    // not download links.
    photo: { type: String, default: '' },
    photo1: { type: String, default: '' },
    signature: { type: String, default: '' },

    aramcoapp: { type: String, default: '' },
    adnocapp: { type: String, default: '' },

    availablefrom: { type: String, default: '' },
    availableto: { type: String, default: '' },
    salary: { type: String, default: '' },
    salary_currency: { type: String, default: '' },
    companyname: { type: String, default: '' },
    point_of_hire: { type: String, default: '' },
    shore_department: { type: String, default: '' },
    emp_davailable: { type: String, default: '' },

    craneoperator: { type: String, default: '' },
    cranetype: { type: String, default: '' },
    cranemaker: { type: String, default: '' },

    vaccine: { type: String, default: '' },
    vaccine1: { type: String, default: '' },
    vaccine2: { type: String, default: '' },
    boostername: { type: String, default: '' },
    boosterdate: { type: String, default: '' },

    status: { type: String, default: '' },
    bookmark: { type: String, default: '' },
    proposed: { type: String, default: '' },
    invite_email: { type: Number, default: 0 },
    vacancy_email: { type: Number, default: 0 },
    interview_time: { type: String, default: '' },

    applieddate: { type: String, default: '' },
    startdate: { type: String, default: '' },
    cv_date: { type: String, default: '' },
    cdate: { type: String, default: '' },

    followup_status: mongoose.Schema.Types.Mixed,
    followup_by: mongoose.Schema.Types.Mixed,
    followup_date: mongoose.Schema.Types.Mixed,
    i_company: mongoose.Schema.Types.Mixed,

    via: { type: String, default: '' },
    whom: { type: String, default: '' },
  },
  { strict: false, collection: 'collection_addresume' }
);

export const AddResume = mongoose.models.AddResume || mongoose.model('AddResume', AddResumeSchema);
