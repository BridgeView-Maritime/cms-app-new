// client/src/config/api.js
// const API_BASE_URL = 'http://localhost:5000/api';
// const REACT_APP_API_URL = 'http://localhost:5000';
// const REACT_APP_URL = 'http://localhost:5173';

// const API_BASE_URL = 'https://cms-app-new-production.up.railway.app/api';
// const REACT_APP_API_URL = 'https://cms-app-new-production.up.railway.app';
// const REACT_APP_URL = 'https://cms-app-new.vercel.app';

// export const AUTH_ENDPOINTS = {
//   LOGIN: `${API_BASE_URL}/auth/login`,
//   VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
//   FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
//   MENUS: `${API_BASE_URL}/users/dashboard-init`,
//   EMPLOYEE_LIST: `${API_BASE_URL}/employees/list`,
//   EMPLOYEE_REGISTER: `${API_BASE_URL}/employees/register`,
//   EMPLOYEE_UPDATE: `${API_BASE_URL}/employees/update/`,
// }

// client/src/config/api.js

// 1. Resolve the base backend URL dynamically based on environment variables
export const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://cms-app-new-production.up.railway.app';

// 2. Build the precise API base route 
const API_BASE_URL = `${BACKEND_URL}/api`;

// 3. Export all environment config and route locations safely inside the object map
export const AUTH_ENDPOINTS = {
  // Keeps your component lookups working perfectly
  REACT_APP_API_URL: BACKEND_URL,
  REACT_APP_URL: window.location.origin || 'https://cms-app-new.vercel.app',

  // Endpoint routing configuration mapping
  LOGIN: `${API_BASE_URL}/auth/login`,
  VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  MENUS: `${API_BASE_URL}/users/dashboard-init`,
  EMPLOYEE_LIST: `${API_BASE_URL}/employees/list`,
  EMPLOYEE_REGISTER: `${API_BASE_URL}/employees/register`,
  EMPLOYEE_UPDATE: `${API_BASE_URL}/employees/update/`,
};