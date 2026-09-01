import { verifyCandidateResetToken } from '../utils/jwt.js';
import { Registration } from '../models/Registration.js';

// Gates the final "set new password" step of forgot-password — proves the
// OTP was already verified, without re-sending/re-checking it.
export const authenticateReset = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: reset session missing.' });
  }

  try {
    const decoded = verifyCandidateResetToken(authHeader.split(' ')[1]);
    const candidate = await Registration.findById(decoded.id);

    if (!candidate || candidate.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Reset session expired. Please start again.' });
    }

    req.resetCandidate = candidate;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Reset session expired. Please start again.' });
  }
};
