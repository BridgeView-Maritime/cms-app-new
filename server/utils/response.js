// Migrated from outdated CommonJS module.exports to clear ES6 export directives
export const success = (res, message, data = null, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

export const error = (res, message, status = 400) => {
  return res.status(status).json({
    success: false,
    message
  });
};