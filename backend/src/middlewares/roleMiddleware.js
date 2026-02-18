const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');

const allowRoles = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new ApiError(StatusCodes.FORBIDDEN, 'Insufficient permissions'));
  }

  return next();
};

module.exports = allowRoles;
