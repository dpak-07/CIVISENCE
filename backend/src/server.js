const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDatabase } = require('./config/database');
const { startComplaintAiWatcher, stopComplaintAiWatcher } = require('./services/complaintAiWatcher.service');

let server;

const startServer = async () => {
  await connectDatabase();
  await startComplaintAiWatcher();

  server = http.createServer(app);
  server.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`);
  });
};

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully.`);
  await stopComplaintAiWatcher();

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ message: 'Unhandled rejection', reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error({ message: 'Uncaught exception', error: error.stack || error.message });
  process.exit(1);
});

startServer().catch((error) => {
  logger.error({ message: 'Failed to start server', error: error.stack || error.message });
  process.exit(1);
});
