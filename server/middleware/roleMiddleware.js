export const authorizeRoles = (...allowedRoleCodes) => {
  return (req, res, next) => {
    // Security Check: Ensure authentication context exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User session context is missing or corrupted."
      });
    }

    // Read the role_code attached to the user from the auth token (e.g., 'SUPER_ADMIN')
    const userRoleCode = req.user.role_code; 

    // Match against our allowed system matrix roles
    const explicitlyAuthorized = allowedRoleCodes.includes(userRoleCode);

    if (!explicitlyAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Permission Denied: Insufficient system clearance parameters."
      });
    }

    next();
  };
};