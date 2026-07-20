// client/src/config/api.js
// const API_BASE_URL = 'http://localhost:5000/api';
// const REACT_APP_API_URL = 'http://localhost:5000';
// const REACT_APP_URL = 'http://localhost:5173';

const API_BASE_URL = 'https://cms-app-new-production.up.railway.app/api';
const REACT_APP_API_URL = 'https://cms-app-new-production.up.railway.app';
const REACT_APP_URL = 'https://cms-app-new.vercel.app';

export const AUTH_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  MENUS: `${API_BASE_URL}/users/dashboard-init`,
  EMPLOYEE_LIST: `${API_BASE_URL}/employees/list`,
  EMPLOYEE_REGISTER: `${API_BASE_URL}/employees/register`,
  EMPLOYEE_UPDATE: `${API_BASE_URL}/employees/update/`,
}