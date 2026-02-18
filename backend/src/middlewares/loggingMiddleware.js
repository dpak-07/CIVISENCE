const morgan = require('morgan');
const { morganStream } = require('../config/logger');

const loggingMiddleware = morgan('combined', {
  stream: morganStream
});

module.exports = loggingMiddleware;
