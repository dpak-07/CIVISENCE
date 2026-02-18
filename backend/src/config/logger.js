const { createLogger, format, transports } = require('winston');
const env = require('./env');

const logger = createLogger({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'civisense-backend' },
  transports: [new transports.Console()]
});

const morganStream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
module.exports.morganStream = morganStream;
