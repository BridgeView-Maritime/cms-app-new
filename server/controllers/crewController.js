import Crew from '../models/Crew.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Universal PDF Text Extractor compatible with pdf-parse v2.4.5+
 */
const extractPdfText = async (buffer) => {
  try {
    const pdfModule = await import('pdf-parse');
    const PDFParser = pdfModule.default || pdfModule;

    // Check if imported as a direct function
    if (typeof PDFParser === 'function') {
      const data = await PDFParser(buffer);
      return data.text || '';
    }

    // Handle class/constructor export for pdf-parse v2
    if (typeof PDFParser === 'object' || typeof PDFParser === 'function') {
      if (PDFParser.PDFParse) {
        const parser = new PDFParser.PDFParse();
        const data = await parser.parseBuffer(buffer);
        return data.text || '';
      }
    }

    return '';
  } catch (err) {
    console.error('[PDF Extract Error]:', err.message);
    return '';
  }
};

/**
 * Extract text from DOCX files using mammoth
 */
const extractDocxText = async (buffer) => {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.default.extractRawText({ buffer });
    return result.value || '';
  } catch (err) {
    console.error('[DOCX Extract Error]:', err.message);
    return '';
  }
};

// Temporary in-memory OTP store
const otpStore = {}; 

// Password Logic Validation
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Clean AI Response and guarantee valid JSON object
 */
const cleanAndParseJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Strip markdown formatting like ```json ... ```
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/^[^{]*/, '') // Remove lead text before '{'
      .replace(/[^}]*$/, '') // Remove trailing text after '}'
      .trim();

    return JSON.parse(cleaned);
  }
};

/**
 * AI-powered Resume Extractor with Automatic Model Fallback
 */
const extractResumeDetailsWithAI = async (fileBuffer, originalMimeType = '', originalFilename = '') => {
  if (!process.env.GEMINI_API_KEY) {
    console.error('[AI Parse Error]: GEMINI_API_KEY is missing in process.env!');
    return null;
  }

  // List of active models to try in order of preference
  const availableModels = ['gemini-2.5-flash', 'gemini-flash', 'gemini-1.5-flash-latest'];
  let responseText = null;

  const promptText = `
    You are an expert Maritime / Seafarer Resume & CV Parser.
    Carefully analyze the uploaded resume document.
    
    Extract the following fields accurately and return ONLY a valid JSON object matching this structure:

    {
      "fullName": "Candidate full name",
      "email": "Email address",
      "phone": "Contact number with country code if available",
      "rank": "Maritime rank or applied position e.g., Cook, Oiler, Motorman, Radio Operator, Chief Engineer",
      "dob": "Date of birth",
      "passport": "Passport number",
      "cdcNumber": "Continuous Discharge Certificate / CDC Number",
      "indosNo": "INDoOS number",
      "experienceSummary": "Short summary of sea experience / vessels served",
      "bio": "Brief professional overview or profile statement"
    }

    Rules:
    1. Return ONLY pure JSON.
    2. If a field is not found in the resume, set its value to an empty string "".
  `;

  let contentParts = [];
  const isWord = originalMimeType.includes('word') || 
                 originalMimeType.includes('officedocument') || 
                 originalFilename.endsWith('.docx') || 
                 originalFilename.endsWith('.doc');

  if (isWord) {
    const docText = await extractDocxText(fileBuffer);
    contentParts = [promptText, `Document Raw Content:\n${docText}`];
  } else {
    let mimeType = originalMimeType;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (originalFilename.endsWith('.png')) mimeType = 'image/png';
      else if (originalFilename.endsWith('.jpg') || originalFilename.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else mimeType = 'application/pdf';
    }

    const filePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: mimeType
      }
    };
    contentParts = [promptText, filePart];
  }

  // Attempt API calls through supported models
  for (const modelName of availableModels) {
    try {
      console.log(`[AI Extraction]: Attempting extraction using model "${modelName}"...`);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const result = await model.generateContent(contentParts);
      responseText = result.response.text();

      if (responseText) {
        console.log(`[AI Extraction Success]: Extraction succeeded using model "${modelName}".`);
        break;
      }
    } catch (err) {
      console.warn(`[AI Model ${modelName} Failed]:`, err.message || err);
    }
  }

  if (!responseText) {
    console.error('[AI Parse Error]: All Gemini model attempts failed.');
    return null;
  }

  return cleanAndParseJSON(responseText);
};

// Legacy Keyword Fallback Extractor
const extractByKeywords = (lines, keywords) => {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const kw of keywords) {
      if (line.toUpperCase().includes(kw)) {
        const afterColon = line.substring(line.toUpperCase().indexOf(kw) + kw.length)
          .replace(/^[\s:\-\|]+/, '').trim();
        if (afterColon && afterColon.length > 1) {
          return afterColon;
        }
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !/^(NAME|PASSPORT|C\.?D\.?C|INDOS|RANK|DATE|DOB|MOBILE|EMAIL)/i.test(nextLine)) {
            return nextLine;
          }
        }
      }
    }
  }
  return '';
};

const extractResumeDetailsLegacy = (rawText) => {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/g);
  let phone = phoneMatch ? (phoneMatch.find(p => p.replace(/\D/g, '').length >= 10) || phoneMatch[0]) : '';

  let fullName = extractByKeywords(lines, ['NAME', 'FULL NAME', 'CANDIDATE NAME']);
  if (!fullName) {
    for (let i = 0; i < Math.min(lines.length, 12); i++) {
      const line = lines[i];
      if (
        line.length >= 3 && line.length < 40 &&
        !/RESUME|CURRICULUM|VITAE|APPLIED|PAGE|MARITIME|PROFILE/i.test(line) &&
        !line.includes('@') && !/\d/.test(line)
      ) {
        fullName = line;
        break;
      }
    }
  }

  let rank = extractByKeywords(lines, ['POST APPLIED FOR', 'APPLIED FOR', 'POSITION', 'RANK']);
  let dob = extractByKeywords(lines, ['DATE OF BIRTH', 'D.O.B', 'DOB', 'BIRTH']);
  let passport = extractByKeywords(lines, ['PASSPORT NO', 'PASSPORT']);
  let cdcNumber = extractByKeywords(lines, ['INDIAN C.D.C', 'INDIAN.CDC', 'C.D.C', 'CDC NO', 'CDC']);
  let indosNo = extractByKeywords(lines, ['INDOS NO', 'INDOS']);

  const experienceLines = lines.filter(l => 
    /SUPPLY|AHTS|TUG|PSV|BARGE|COOK|OILER|MOTORMAN|JACK-UP|RIG|ENGINE|DECK|VESSEL|SHIP|OFFSHORE/i.test(l)
  ).slice(0, 5);

  return {
    fullName: fullName || '',
    email: emailMatch ? emailMatch[0].trim() : '',
    phone: phone || '',
    rank: rank || '',
    dob: dob || '',
    passport: passport || '',
    cdcNumber: cdcNumber || '',
    indosNo: indosNo || '',
    experienceSummary: experienceLines.join(' | ') || '',
    bio: text.substring(0, 350).replace(/\s+/g, ' ').trim()
  };
};

// Check Email Availability & Send OTP
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const lowerEmail = email.toLowerCase();
    const existing = await Crew.findOne({ email: lowerEmail });
    
    if (existing) {
      return res.status(400).json({ exists: true, message: 'Crew email already registered.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[lowerEmail] = {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    };

    console.log(`[OTP DEBUG] OTP for ${lowerEmail} is: ${otp}`);

    return res.status(200).json({ exists: false, message: 'OTP sent to email.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Register Crew Member & Validate OTP
export const registerCrew = async (req, res) => {
  try {
    const { email, password, confirmPassword, otp, isSuperAdminCreation } = req.body;
    const lowerEmail = email.toLowerCase();

    if (!email || !password || !confirmPassword || (!otp && !isSuperAdminCreation)) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password does not meet complexity criteria.' });
    }

    if (!isSuperAdminCreation) {
      const otpRecord = otpStore[lowerEmail];
      if (!otpRecord || otpRecord.otp !== otp || Date.now() > otpRecord.expiresAt) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newCrew = new Crew({
      email: lowerEmail,
      password: hashedPassword
    });

    await newCrew.save();

    if (otpStore[lowerEmail]) {
      delete otpStore[lowerEmail];
    }

    const token = jwt.sign(
      { id: newCrew._id, role: 'CREW' },
      process.env.JWT_SECRET || 'your_secret',
      { expiresIn: '1d' }
    );

    return res.status(201).json({
      message: 'Crew registered successfully',
      token,
      user: { id: newCrew._id, email: newCrew.email }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// Parse PDF / Doc Resume Endpoint
export const parseResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a resume file.' });
    }

    console.log(`[Parse Resume Request]: Uploaded "${req.file.originalname}" (${req.file.mimetype}, ${req.file.size} bytes)`);

    let extractedData = null;

    // 1. Primary Strategy: AI Extraction with Automatic Model Fallback
    extractedData = await extractResumeDetailsWithAI(
      req.file.buffer, 
      req.file.mimetype || '', 
      req.file.originalname || ''
    );

    // 2. Fallback Strategy: Legacy Native PDF/Docx Extraction
    if (!extractedData) {
      console.log('[Resume Parsing]: AI extraction failed. Triggering legacy text parser fallback...');
      let rawText = '';
      
      const isWord = req.file.mimetype.includes('word') || 
                     (req.file.originalname && req.file.originalname.endsWith('.docx'));

      if (isWord) {
        rawText = await extractDocxText(req.file.buffer);
      } else {
        rawText = await extractPdfText(req.file.buffer);
      }

      console.log('[Legacy Extracted Text Length]:', rawText.length);
      extractedData = extractResumeDetailsLegacy(rawText);
    }

    return res.status(200).json({ message: 'Resume parsed successfully', data: extractedData });

  } catch (err) {
    console.error('[Fatal Resume Endpoint Error]:', err);
    return res.status(500).json({ message: 'Failed to parse resume', error: err.message });
  }
};

// Update / Save Profile Details
export const updateProfile = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const updated = await Crew.findOneAndUpdate(
      { email: email.toLowerCase() },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Crew profile not found.' });
    }

    return res.status(200).json({ message: 'Profile updated successfully', crew: updated });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};