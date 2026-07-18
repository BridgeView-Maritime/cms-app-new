import AuditLog from '../models/AuditLog.js';
import LoginHistory from '../models/LoginHistory.js';

export const logAudit = async (userId, action, details, req) => {
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      details,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  } catch (err) {
    console.error('Audit Logger Execution Failure:', err.message);
  }
};

export const logLoginHistory = async (userId, status, reason, req) => {
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  try {
    await LoginHistory.create({
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      status,
      failure_reason: reason
    });
  } catch (err) {
    console.error('Login History Logger Execution Failure:', err.message);
  }
};