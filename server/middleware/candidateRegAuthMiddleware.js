import { verifyRegistrationToken } from '../utils/jwt.js';
import { Registration } from '../models/Registration.js';

// Gates step 3 of registration (POST /register/complete) — proves the
// candidate owns a Registration doc that already passed OTP verification
// in step 2, without requiring a full candidate login (no account exists
// yet at this point).
export const authenticateRegistration = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: registration session missing.' });
  }

  try {
    const decoded = verifyRegistrationToken(authHeader.split(' ')[1]);
    const pending = await Registration.findById(decoded.id);

    if (!pending || pending.status !== 'pending' || !pending.otp_verified) {
      return res.status(401).json({ success: false, message: 'Registration session expired or already completed. Please start again.' });
    }

    req.pendingRegistration = pending;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Registration session expired. Please start again.' });
  }
};
