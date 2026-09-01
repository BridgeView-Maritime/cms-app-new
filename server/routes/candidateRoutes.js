import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import otpGenerator from 'otp-generator';
import { PDFParse } from 'pdf-parse';
import { fileURLToPath } from 'url';
import { Registration } from '../models/Registration.js';
import { generateCandidateToken, generateRegistrationToken, generateCandidateResetToken } from '../utils/jwt.js';
import { authenticateCandidate } from '../middleware/candidateAuthMiddleware.js';
import { authenticateRegistration } from '../middleware/candidateRegAuthMiddleware.js';
import { authenticateReset } from '../middleware/candidateResetAuthMiddleware.js';
import { sendEmail } from '../utils/sendEmail.js';
import { extractResumeFields } from '../utils/resumeParser.js';
import { applyLegacyResumeFallback } from '../utils/legacyResumeFallback.js';
import { generateMysqlId } from '../utils/generateMysqlId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Fields a candidate may edit about their own profile. Identity/security
// fields (emailid, regid, password, status, admin_approval, ...) are
// deliberately excluded — those stay admin- or login-flow-controlled.
const EDITABLE_FIELDS = [
  'uname', 'countrycode', 'phoneno', 'aadharno', 'pancardno', 'sidno', 'indosno',
  'address', 'city', 'state', 'countryname', 'rank', 'vesseltype', 'engine_type',
  'passport_no', 'coc_country', 'coc', 'applied_rank', 'vesseltypes', 'dob',
];

// Fields never sent to the client.
const SENSITIVE_FIELDS = ['password', 'repassword', 'otp', 'otp_timestamp', 'session'];

const sanitizeCandidate = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  SENSITIVE_FIELDS.forEach((f) => delete obj[f]);
  return obj;
};

// Fetching = sanitize + fill any still-empty fields from the candidate's
// legacy collection_addresume record, if one exists (backward
// compatibility for candidates who registered on the old site). Read-time
// only — see utils/legacyResumeFallback.js.
const sanitizeCandidateWithFallback = async (doc) => applyLegacyResumeFallback(sanitizeCandidate(doc));

// ==========================================================================
// LOGIN — identifier can be uname or emailid. Legacy passwords are plain
// text; on a successful plain-text match we transparently rehash with
// bcrypt and persist it, so every account becomes secure the first time
// it's used without disrupting anyone's ability to log in.
// ==========================================================================
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
    }

    const needle = identifier.trim();
    const candidates = await Registration.find({
      $or: [
        { emailid: { $regex: `^${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
        { uname: { $regex: `^${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ],
    });

    if (!candidates.length) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    let matched = null;
    for (const c of candidates) {
      const isHashed = typeof c.password === 'string' && c.password.startsWith('$2');
      const isMatch = isHashed
        ? await bcrypt.compare(password, c.password)
        : password === c.password;

      if (isMatch) {
        // Prefer an active match if multiple legacy records share this identifier+password.
        if (!matched || (matched.status !== 'active' && c.status === 'active')) {
          matched = c;
        }
      }
    }

    if (!matched) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    if (matched.status !== 'active') {
      return res.status(403).json({ success: false, message: 'This account is inactive. Please contact us for assistance.' });
    }

    // Self-migrate plain-text password to bcrypt on first successful login.
    if (!matched.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      matched.password = await bcrypt.hash(password, salt);
      matched.repassword = matched.password;
      await matched.save();
    }

    const token = generateCandidateToken(matched);
    return res.status(200).json({
      success: true,
      accessToken: token,
      candidate: await sanitizeCandidateWithFallback(matched),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// PROFILE
// ==========================================================================
router.get('/me', authenticateCandidate, async (req, res) => {
  return res.status(200).json({ success: true, candidate: await sanitizeCandidateWithFallback(req.candidate) });
});

router.put('/profile', authenticateCandidate, async (req, res) => {
  try {
    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        req.candidate[field] = req.body[field];
      }
    });
    await req.candidate.save();
    return res.status(200).json({ success: true, message: 'Profile updated.', candidate: await sanitizeCandidateWithFallback(req.candidate) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/logout', authenticateCandidate, async (req, res) => {
  try {
    req.candidate.logouttime = String(Date.now());
    await req.candidate.save();
    return res.status(200).json({ success: true, message: 'Logged out.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// FORGOT / RESET PASSWORD
// Step 1 -> POST /forgot-password             : email, sends OTP (generic response either way)
// Step 2 -> POST /reset-password/verify-otp    : email+otp, returns a 20-min resetToken
// Step 3 -> POST /reset-password/complete      : new password, gated by resetToken
// ==========================================================================
router.post('/forgot-password', async (req, res) => {
  const genericResponse = {
    success: true,
    message: 'If an account exists for this email, a verification code has been sent.',
  };

  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const candidate = await Registration.findOne({
      emailid: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      status: 'active',
    });

    // Don't reveal whether the account exists — same defense used for staff.
    if (!candidate) {
      return res.status(200).json(genericResponse);
    }

    const otp = process.env.IS_EMAIL_ON === 'false'
      ? '123456'
      : otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });

    candidate.otp = otp;
    candidate.otp_timestamp = String(Date.now());
    await candidate.save();

    await sendEmail({
      email: candidate.emailid,
      subject: 'Password Reset Code — Bridgeview Maritime Candidate Portal',
      html: `<h3>Reset your password</h3>
             <p>Hello ${candidate.uname || 'there'},</p>
             <p>Use the following code to reset your password:</p>
             <h2 style="color:#2563eb;letter-spacing:2px;">${otp}</h2>
             <p>This code is active for 10 minutes. If you didn't request this, you can ignore this email.</p>`,
    });

    return res.status(200).json({
      ...genericResponse,
      ...(process.env.IS_EMAIL_ON === 'false' && { defaultOtp: otp }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/reset-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email?.trim() || !otp?.trim()) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const candidate = await Registration.findOne({
      emailid: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      status: 'active',
    });

    if (!candidate || !candidate.otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    const isExpired = Date.now() - Number(candidate.otp_timestamp || 0) > 10 * 60 * 1000;
    if (isExpired) {
      return res.status(400).json({ success: false, message: 'This code has expired. Please request a new one.' });
    }
    if (candidate.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code.' });
    }

    candidate.otp = '';
    candidate.otp_timestamp = '';
    await candidate.save();

    const resetToken = generateCandidateResetToken(candidate);
    return res.status(200).json({ success: true, message: 'Code verified.', resetToken });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/reset-password/complete', authenticateReset, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const candidate = req.resetCandidate;
    const salt = await bcrypt.genSalt(10);
    candidate.password = await bcrypt.hash(newPassword, salt);
    candidate.repassword = candidate.password;
    await candidate.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// RESUME / CV UPLOAD — PDF only, under 2MB, matching the legacy site's
// own constraint text ("PDF format only (Less than 2 MB)").
// ==========================================================================
const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const regid = req.candidate?.regid || req.candidate?._id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${regid}-${uniqueSuffix}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted.'));
    }
    cb(null, true);
  },
});

router.post('/resume/upload', authenticateCandidate, (req, res) => {
  upload.single('resume')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    try {
      req.candidate.resumes.push({
        filename: req.file.filename,
        originalName: req.file.originalname,
        uploadedAt: new Date(),
      });
      await req.candidate.save();
      return res.status(200).json({ success: true, message: 'CV uploaded.', candidate: await sanitizeCandidateWithFallback(req.candidate) });
    } catch (saveErr) {
      return res.status(500).json({ success: false, message: saveErr.message });
    }
  });
});

// ==========================================================================
// REGISTRATION WIZARD
// Step 1 (start)        -> POST /register/start        : name+email+category, sends OTP
// Optional              -> POST /register/parse-resume  : best-effort field extraction
// Step 2 (otp)           -> POST /register/verify-otp    : returns a 20-min regToken
// Step 3 (complete)      -> POST /register/complete      : full profile, creates the account
// ==========================================================================

// Reference data for the step 3 form. Country list is the real, live
// collection_country data; rank/COC/vessel-type lists are standard
// maritime industry terminology (no authoritative list exists in this
// system yet) kept here so the frontend doesn't need to hardcode them.
router.get('/countries', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const countries = await db.collection('collection_country')
      .find({ status: '1' })
      .project({ countryname: 1, _id: 0 })
      .sort({ countryname: 1 })
      .toArray();
    return res.status(200).json({ success: true, countries: countries.map((c) => c.countryname) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/register/start', async (req, res) => {
  try {
    const { fullName, email, cvCategory } = req.body;
    if (!fullName?.trim() || !email?.trim() || !cvCategory?.trim()) {
      return res.status(400).json({ success: false, message: 'Full name, email and CV category are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const existingActive = await Registration.findOne({ emailid: normalizedEmail, status: 'active' });
    if (existingActive) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in instead.' });
    }

    const otp = process.env.IS_EMAIL_ON === 'false'
      ? '123456'
      : otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });

    const pending = await Registration.findOneAndUpdate(
      { emailid: normalizedEmail, status: 'pending' },
      {
        $set: {
          emailid: normalizedEmail,
          uname: fullName.trim(),
          cvcategory: cvCategory.trim(),
          status: 'pending',
          otp,
          otp_timestamp: String(Date.now()),
          otp_verified: false,
        },
        // Every migrated collection carries a unique (non-sparse) index on
        // `_mysqlId` — a leftover of the MySQL migration. Leaving it unset
        // on a new document writes `_mysqlId: null`, and the second-ever
        // new registration then collides with the first on that null
        // value. $setOnInsert so an existing pending doc keeps its id
        // across OTP resends instead of getting a new one each time.
        $setOnInsert: { _mysqlId: generateMysqlId() },
      },
      { upsert: true, new: true }
    );

    await sendEmail({
      email: normalizedEmail,
      subject: 'Verify your email — Bridgeview Maritime Candidate Registration',
      html: `<h3>Confirm your email</h3>
             <p>Hello ${fullName.trim()},</p>
             <p>Use the following code to verify your email and continue your registration:</p>
             <h2 style="color:#2563eb;letter-spacing:2px;">${otp}</h2>
             <p>This code is active for 10 minutes.</p>`,
    });

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email.',
      pendingId: pending._id,
      ...(process.env.IS_EMAIL_ON === 'false' && { defaultOtp: otp }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/register/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email?.trim() || !otp?.trim()) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const pending = await Registration.findOne({ emailid: normalizedEmail, status: 'pending' });
    if (!pending) {
      return res.status(404).json({ success: false, message: 'No pending registration found for this email.' });
    }

    const isExpired = Date.now() - Number(pending.otp_timestamp || 0) > 10 * 60 * 1000;
    if (isExpired) {
      return res.status(400).json({ success: false, message: 'This code has expired. Please request a new one.' });
    }
    if (pending.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code.' });
    }

    pending.otp_verified = true;
    pending.otp = '';
    await pending.save();

    const regToken = generateRegistrationToken(pending);
    return res.status(200).json({ success: true, message: 'Email verified.', regToken });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Pre-auth upload (no candidate account exists yet) — same PDF/2MB constraint,
// but the extracted file is kept on disk so it can become the candidate's
// first CV without asking them to upload it a second time in step 3.
const preAuthUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `pending-${uniqueSuffix}.pdf`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted.'));
    }
    cb(null, true);
  },
});

router.post('/register/parse-resume', (req, res) => {
  preAuthUpload.single('resume')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    let parser;
    try {
      const buffer = fs.readFileSync(req.file.path);
      parser = new PDFParse({ data: buffer });
      const { text } = await parser.getText();
      const { fields, fieldsFound } = extractResumeFields(text);

      return res.status(200).json({
        success: true,
        fields,
        fieldsFound,
        tempFile: { filename: req.file.filename, originalName: req.file.originalname },
      });
    } catch (parseErr) {
      // Extraction failing shouldn't block registration — the file is
      // still kept so it can be attached; the form just starts blank.
      return res.status(200).json({
        success: true,
        fields: {},
        fieldsFound: [],
        tempFile: { filename: req.file.filename, originalName: req.file.originalname },
        warning: 'Could not automatically read details from this file — please fill the form manually.',
      });
    } finally {
      if (parser) await parser.destroy().catch(() => {});
    }
  });
});

router.post('/register/complete', authenticateRegistration, async (req, res) => {
  try {
    const {
      password, repassword, dob, passport_no, coc_country, coc, rank, applied_rank,
      vesseltypes, countryname, state, city, address, countrycode, phoneno,
      aadharno, pancardno, sidno, indosno,
      tempResumeFilename, tempResumeOriginalName,
    } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (password !== repassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const doc = req.pendingRegistration;
    const salt = await bcrypt.genSalt(10);
    doc.password = await bcrypt.hash(password, salt);
    doc.repassword = doc.password;

    if (dob) doc.dob = new Date(dob);
    doc.passport_no = passport_no || '';
    doc.coc_country = coc_country || '';
    doc.coc = coc || '';
    doc.rank = rank || '';
    doc.applied_rank = applied_rank || '';
    doc.vesseltypes = Array.isArray(vesseltypes) ? vesseltypes.slice(0, 5) : [];
    doc.countryname = countryname || '';
    doc.state = state || '';
    doc.city = city || '';
    doc.address = address || '';
    doc.countrycode = countrycode || '';
    doc.phoneno = phoneno || '';
    doc.aadharno = aadharno || '';
    doc.pancardno = pancardno || '';
    doc.sidno = sidno || '';
    doc.indosno = indosno || '';

    if (tempResumeFilename) {
      doc.resumes.push({
        filename: tempResumeFilename,
        originalName: tempResumeOriginalName || tempResumeFilename,
        uploadedAt: new Date(),
      });
    }

    doc.status = 'active';
    doc.admin_approval = '0'; // pending admin review — informational only, doesn't block login
    doc.reg_date = new Date().toISOString();
    await doc.save();

    const token = generateCandidateToken(doc);
    return res.status(200).json({
      success: true,
      message: 'Registration complete.',
      accessToken: token,
      candidate: await sanitizeCandidateWithFallback(doc),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
