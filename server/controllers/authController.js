import User from '../models/User.js';
import OtpLog from '../models/OtpLog.js';
import LoginHistory from '../models/LoginHistory.js';
import AuditLog from '../models/AuditLog.js';
import { sendEmail } from '../utils/sendEmail.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import bcrypt from 'bcryptjs';
import otpGenerator from 'otp-generator';
import jwt from 'jsonwebtoken';

/**
 * @desc    STAGE 1: Evaluate login credentials and dispatch secure email OTP
 * @route   POST /api/auth/login
 */
export const loginRequest = async (req, res) => {
  try {
    const { username, password } = req.body; // Front-end sends username parameter
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'Unknown';

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username/Email and password are required fields." });
    }

    // Look up by username OR email to maximize payload flexibility
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: username.toLowerCase().trim() }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid identity credentials entered." });
    }

    if (user.account_locked || user.status !== 'Active') {
      return res.status(403).json({ success: false, message: "Account context restricted, blocked, or locked." });
    }

    // Evaluate credentials matching hashed schema strings
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failed_login_attempts += 1;
      if (user.failed_login_attempts >= 5) {
        user.account_locked = true;
      }
      await user.save();

      await LoginHistory.create({ user_id: user._id, ip_address: clientIp, user_agent: userAgent, status: 'Failed', failure_reason: 'Incorrect password verification match.' });
      return res.status(401).json({ success: false, message: "Invalid identity credentials entered." });
    }

    // Generate 6-digit numeric OTP code
    const secureOtp = otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
    const expiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes active bounds

    // Invalidate old unused OTP logs for this user context
    await OtpLog.updateMany({ user_id: user._id, purpose: 'Login', is_used: false }, { is_used: true });

    // Store new challenge log string references
    await OtpLog.create({ user_id: user._id, otp_code: secureOtp, purpose: 'Login', expires_at: expiration });

    // Deliver email out to client address matching your .env pipeline infrastructure settings
    await sendEmail({
      email: user.email,
      subject: `Secure Login 2FA Access Code - ${process.env.APP_NAME || 'CMS'}`,
      html: `<h3>Security Challenge Required</h3>
             <p>Hello ${user.first_name},</p>
             <p>Use the following security code to access your corporate dashboard environment:</p>
             <h2 style="color: #0071e3; letter-spacing: 2px;">${secureOtp}</h2>
             <p>This challenge code is active for 10 minutes.</p>`
    });

    // EXACT RESPONSE BODY MATCHING YOUR FRONT-END SCHEMA REQUIREMENT
    return res.status(200).json({
      stepTwoRequired: true,
      userId: user._id, // Return actual mongo string or mapped structure
      message: "OTP sent to your registered email"
    });

  } catch (error) {
    console.error(`Login error context: ${error.message}`);
    return res.status(500).json({ success: false, message: "Internal server runtime execution fault during login validation." });
  }
};

/**
 * @desc    STAGE 2: Verify Login OTP and issue active session authentication tokens
 * @route   POST /api/auth/verify-otp
 */
export const verifyLoginOtp = async (req, res) => {
  try {
    const { userId, otpCode } = req.body;
    const clientIp = req.ip || '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'Unknown';

    if (!userId || !otpCode) {
      return res.status(400).json({ success: false, message: "User context ID and verification OTP code are required parameters." });
    }

    // Locate unused challenge key records that are within expiration limits
    const otpRecord = await OtpLog.findOne({ 
      user_id: userId, 
      otp_code: otpCode, 
      purpose: 'Login', 
      is_used: false, 
      expires_at: { $gt: new Date() } 
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or expired security access challenge code." });
    }

    otpRecord.is_used = true;
    await otpRecord.save();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User reference context not found." });
    }

    user.failed_login_attempts = 0;
    user.last_login = new Date();
    await user.save();

    // Leverage standard utilities to sign payload maps
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Write audit records tracking active operations
    await LoginHistory.create({ user_id: user._id, ip_address: clientIp, user_agent: userAgent, status: 'Success' });
    await AuditLog.create({ user_id: user._id, action: 'Authentication complete', details: 'Successful 2FA login verification completed matching dynamic MongoDB specifications.', ip_address: clientIp, user_agent: userAgent });

    // EXACT RESPONSE STRUCTURE MATCHING SYSTEM BLUEPRINT MATCH
    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        name: `${user.first_name} ${user.last_name || ''}`.trim() || "System",
        email: user.email
      }
    });

  } catch (error) {
    console.error(`OTP check runtime fault: ${error.message}`);
    return res.status(500).json({ success: false, message: "Internal server error verifying authentication tokens." });
  }
};

/**
 * @desc    STAGE 3: Dynamic Token Refreshment Operation Engine
 * @route   POST /api/auth/refresh
 */
export const tokenRefreshOperation = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Refresh authorization token string parameter is missing." });
    }

    // Verify token footprint matching fallback system secret blocks
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'Active' || user.account_locked) {
      return res.status(403).json({ success: false, message: "Active directory session credentials restricted or invalid." });
    }

    const newAccessToken = generateAccessToken(user);

    // EXACT RESPONSE PAYLOAD MATCH FOR REFRESH PIPELINES
    return res.status(200).json({
      accessToken: newAccessToken
    });

  } catch (err) {
    return res.status(401).json({ success: false, message: "Session expired or verification signature parameter compromised." });
  }
};


/**
 * @desc    FORGOT PASSWORD STAGE 1: Dispatch account restoration authorization code
 * @route   POST /api/auth/forgot-password
 */
export const forgotPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Security standard defense practice: don't reveal if email exists or not
      return res.status(200).json({ success: true, message: "If account maps to an authorized system profile, security reset parameters have been sent." });
    }

    const recoveryOtp = otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
    const expiration = new Date(Date.now() + 15 * 60 * 1000); // 15 Minute window bounds

    await OtpLog.updateMany({ user_id: user._id, purpose: 'ForgotPassword', is_used: false }, { is_used: true });
    await OtpLog.create({ user_id: user._id, otp_code: recoveryOtp, purpose: 'ForgotPassword', expires_at: expiration });

    await sendEmail({
      email: user.email,
      subject: `Account Recovery Security Verification Challenge - ${process.env.APP_NAME}`,
      html: `<h3>Password Reset Requested</h3>
             <p>You requested a security credential recovery change profile procedure.</p>
             <p>Input the authorization recovery challenge key below inside your verification screen frame:</p>
             <h2 style="color: #ef4444; letter-spacing: 2px;">${recoveryOtp}</h2>
             <p>This verification block self-destructs after 15 minutes.</p>`
    });

    return res.status(200).json({ success: true, message: "If account maps to an authorized system profile, security reset parameters have been sent.", step: 'verify_reset_otp', userId: user._id });

  } catch (error) {
    console.error(`Forgot password flow error: ${error.message}`);
    return res.status(500).json({ success: false, message: "Internal error preparing data recovery streams." });
  }
};

/**
 * @desc    FORGOT PASSWORD STAGE 2: Confirm recovery key and execute permanent password modification
 * @route   POST /api/auth/reset-password
 */
export const resetPasswordConfirm = async (req, res) => {
  try {
    const { userId, otpCode, newPassword } = req.body;
    const clientIp = req.ip || '::1';
    const userAgent = req.get('User-Agent') || 'Unknown';

    const otpRecord = await OtpLog.findOne({ user_id: userId, otp_code: otpCode, purpose: 'ForgotPassword', is_used: false, expires_at: { $gt: new Date() } });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid, utilized, or expired authorization recovery code match." });
    }

    otpRecord.is_used = true;
    await otpRecord.save();

    const user = await User.findById(userId);
    
    // Generate secure hashed password using standard enterprise cost cycles
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.account_locked = false; // Unlock profile entry tracking bounds if locked previously
    user.failed_login_attempts = 0;
    await user.save();

    await AuditLog.create({ user_id: user._id, action: 'Password Change Complete', details: 'Profile credentials reset completed securely via email recovery OTP flows.', ip_address: clientIp, user_agent: userAgent });

    return res.status(200).json({ success: true, message: "Credentials modified successfully. Proceed back to the login terminal entry dashboard." });

  } catch (error) {
    console.error(`Credential execution failure: ${error.message}`);
    return res.status(500).json({ success: false, message: "Internal application processing error structural failure executing modification." });
  }
};