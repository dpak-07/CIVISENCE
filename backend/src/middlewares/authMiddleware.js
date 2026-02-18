const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');

const authMiddleware = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authorization token is required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role
    };
    return next();
  } catch (_error) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired access token'));
  }
};

module.exports = authMiddleware;
