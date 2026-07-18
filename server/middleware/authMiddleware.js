import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Role from '../models/Role.js'; // Ensure Role model is imported

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Access Token missing or structurally malformed."
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user and populate their role structure from the database
    const userContext = await User.findById(decoded.id || decoded._id).populate('role_id');
    
    if (!userContext || userContext.status !== 'Active') {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Account context is inactive or non-existent."
      });
    }

    // Bind full context info along with the vital role_code string
    req.user = {
      id: userContext._id,
      email: userContext.email,
      username: userContext.username,
      role_id: userContext.role_id?._id,
      role_code: userContext.role_id?.role_code // Now 'SUPER_ADMIN', 'ADMIN', or 'HR' safely passes through!
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid, manipulated, or expired bearer authorization tokens."
    });
  }
};