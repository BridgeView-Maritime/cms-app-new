import express from 'express';
import { 
  loginRequest, 
  verifyLoginOtp,
  tokenRefreshOperation, 
  forgotPasswordRequest, 
  resetPasswordConfirm 
} from '../controllers/authController.js';

const router = express.Router();

// Session Initialization Pipeline Endpoints
router.post('/login', loginRequest);
router.post('/verify-otp', verifyLoginOtp);
router.post('/verify-login-otp', verifyLoginOtp);
router.post('/refresh', tokenRefreshOperation);

// Identity Recovery Pipeline Endpoints
router.post('/forgot-password', forgotPasswordRequest);
router.post('/reset-password', resetPasswordConfirm);

export default router;