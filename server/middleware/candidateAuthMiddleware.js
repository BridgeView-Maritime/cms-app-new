import { verifyCandidateToken } from '../utils/jwt.js';
import { Registration } from '../models/Registration.js';

export const authenticateCandidate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Access token missing.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyCandidateToken(token);

    const candidate = await Registration.findById(decoded.id);
    if (!candidate || candidate.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Unauthorized: Account is inactive or no longer exists.' });
    }

    req.candidate = candidate;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired candidate session.' });
  }
};
