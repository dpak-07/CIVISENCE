const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccessToken = ({ userId, role }) =>
  jwt.sign({ sub: userId, role, type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn
  });

const signRefreshToken = ({ userId, role }) =>
  jwt.sign({ sub: userId, role, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn
  });

const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
