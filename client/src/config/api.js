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
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  MENUS: `${API_BASE_URL}/users/dashboard-init`,
  EMPLOYEE_LIST: `${API_BASE_URL}/employees/list`,
  EMPLOYEE_REGISTER: `${API_BASE_URL}/employees/register`,
  EMPLOYEE_UPDATE: `${API_BASE_URL}/employees/update/`,
};

// 4. Attendance gate + admin attendance management endpoints
export const ATTENDANCE_ENDPOINTS = {
  TODAY: `${API_BASE_URL}/attendance/today`,
  MARK: `${API_BASE_URL}/attendance/mark`,
  ADMIN_RECORDS: `${API_BASE_URL}/attendance/admin/records`,
  ADMIN_SUMMARY: `${API_BASE_URL}/attendance/admin/summary`,
};

// 5. Public landing page content — public GET, SUPER_ADMIN-only PUT
export const LANDING_ENDPOINTS = {
  CONTENT: `${API_BASE_URL}/landing/content`,
};

// 6. Candidate portal — separate identity space from staff (AUTH_ENDPOINTS)
export const CANDIDATE_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/candidate/login`,
  ME: `${API_BASE_URL}/candidate/me`,
  PROFILE: `${API_BASE_URL}/candidate/profile`,
  LOGOUT: `${API_BASE_URL}/candidate/logout`,
  RESUME_UPLOAD: `${API_BASE_URL}/candidate/resume/upload`,
  COUNTRIES: `${API_BASE_URL}/candidate/countries`,
  REGISTER_START: `${API_BASE_URL}/candidate/register/start`,
  REGISTER_VERIFY_OTP: `${API_BASE_URL}/candidate/register/verify-otp`,
  REGISTER_PARSE_RESUME: `${API_BASE_URL}/candidate/register/parse-resume`,
  REGISTER_COMPLETE: `${API_BASE_URL}/candidate/register/complete`,
  FORGOT_PASSWORD: `${API_BASE_URL}/candidate/forgot-password`,
  RESET_PASSWORD_VERIFY_OTP: `${API_BASE_URL}/candidate/reset-password/verify-otp`,
  RESET_PASSWORD_COMPLETE: `${API_BASE_URL}/candidate/reset-password/complete`,
};

// 7. Products / cart / orders — catalogue is public, cart+order are candidate-only
// 8. Candidate profile sections (Phase 2) - all candidate-scoped
export const PROFILE_SECTIONS = {
  NOK: `${API_BASE_URL}/candidate/nok`,
  BANK: `${API_BASE_URL}/candidate/bank-details`,
  PREVIOUS_EMPLOYERS: `${API_BASE_URL}/candidate/previous-employers`,
  EDUCATION: `${API_BASE_URL}/candidate/education`,
  PRESEA: `${API_BASE_URL}/candidate/presea`,
  SEA_SERVICES: `${API_BASE_URL}/candidate/sea-services`,
  COC: `${API_BASE_URL}/candidate/coc`,
  OFFSHORE_CERTS: `${API_BASE_URL}/candidate/offshore-certificates`,
  OTHER_CERTS: `${API_BASE_URL}/candidate/other-certificates`,
  STCW: `${API_BASE_URL}/candidate/stcw`,
  LOOKUPS: `${API_BASE_URL}/candidate/lookups`,
};

export const PRODUCT_ENDPOINTS = {
  LIST: `${API_BASE_URL}/products`,
  CART: `${API_BASE_URL}/products/cart`,
  CART_ITEM: (id) => `${API_BASE_URL}/products/cart/${id}`,
  ORDER: `${API_BASE_URL}/products/order`,
  ORDERS: `${API_BASE_URL}/products/orders`,
};

// 9. Candidate job board + phase 5 sections
export const JOB_ENDPOINTS = {
  LIST: `${API_BASE_URL}/candidate/jobs`,
  FILTERS: `${API_BASE_URL}/candidate/jobs/filters`,
  MY_ACTIVITY: `${API_BASE_URL}/candidate/jobs/my-activity`,
  SAVE: (jobid) => `${API_BASE_URL}/candidate/jobs/${jobid}/save`,
  APPLY: (jobid) => `${API_BASE_URL}/candidate/jobs/${jobid}/apply`,
  SAVED: `${API_BASE_URL}/candidate/saved-jobs`,
  SAVED_ITEM: (id) => `${API_BASE_URL}/candidate/saved-jobs/${id}`,
  APPLIED: `${API_BASE_URL}/candidate/applied-jobs`,
};

export const CANDIDATE_SECTIONS = {
  CONTRACT_DETAILS: `${API_BASE_URL}/candidate/contract-details`,
  GRIEVANCES: `${API_BASE_URL}/candidate/grievances`,
  CHANGE_PASSWORD: `${API_BASE_URL}/candidate/change-password`,
};
