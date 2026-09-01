import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      role_id: user.role_id,
      username: user.username,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '15m'
    }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id
    },
    process.env.REFRESH_SECRET || process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.REFRESH_EXPIRE || '7d'
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_SECRET || process.env.JWT_REFRESH_SECRET);
};

// Candidate portal tokens are deliberately tagged with `type: 'CANDIDATE'`
// and carry a Registration _id/regid rather than a staff User _id, so they
// can never be mistaken for (or accepted by) the staff auth middleware.
export const generateCandidateToken = (candidate) => {
  return jwt.sign(
    {
      type: 'CANDIDATE',
      id: candidate._id,
      regid: candidate.regid,
      emailid: candidate.emailid,
      uname: candidate.uname,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '1d' }
  );
};

export const verifyCandidateToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== 'CANDIDATE') {
    throw new Error('Not a candidate token');
  }
  return decoded;
};

// Short-lived token carried between "OTP verified" and "registration
// complete" — proves the email was verified without requiring a real
// candidate account (which doesn't exist yet) or re-sending the OTP.
export const generateRegistrationToken = (pendingDoc) => {
  return jwt.sign(
    { type: 'CANDIDATE_REG', id: pendingDoc._id },
    process.env.JWT_SECRET,
    { expiresIn: '20m' }
  );
};

export const verifyRegistrationToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== 'CANDIDATE_REG') {
    throw new Error('Not a registration token');
  }
  return decoded;
};

// Short-lived token carried between "reset OTP verified" and "new password
// submitted" — same shape as the registration token, but for an existing
// account going through forgot-password rather than a brand-new signup.
export const generateCandidateResetToken = (candidate) => {
  return jwt.sign(
    { type: 'CANDIDATE_RESET', id: candidate._id },
    process.env.JWT_SECRET,
    { expiresIn: '20m' }
  );
};

export const verifyCandidateResetToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== 'CANDIDATE_RESET') {
    throw new Error('Not a password reset token');
  }
  return decoded;
};