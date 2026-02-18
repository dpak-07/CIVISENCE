const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const logger = require('../config/logger');
const { sendNotification } = require('./notification.service');

let changeStream = null;
let pollingTimer = null;
let lastPolledAt = new Date(Date.now() - 60 * 1000);

const FLAG_REASONS = [
  'image does not match reported issue',
  'duplicate image detected',
  'user under review'
];

const isFlaggedComplaint = (complaint) => {
  const reason = String(complaint?.priority?.reason || '').toLowerCase();
  if (FLAG_REASONS.some((keyword) => reason.includes(keyword))) {
    return true;
  }

  return Boolean(complaint?.aiMeta?.reviewRequired || complaint?.aiMeta?.isAIDuplicate);
};

const processComplaint = async (complaint) => {
  if (!complaint || !complaint.reportedBy) {
    return;
  }

  if (complaint.priority?.level === 'high') {
    await sendNotification(
      complaint.reportedBy,
      'Priority upgraded to high',
      'Your complaint priority was upgraded to high by the AI governance layer.',
      complaint._id
    );
  }

  if (isFlaggedComplaint(complaint)) {
    await sendNotification(
      complaint.reportedBy,
      'Complaint flagged',
      'Your complaint was flagged by AI for manual review.',
      complaint._id
    );
  }
};

const startPolling = () => {
  if (pollingTimer) {
    return;
  }

  pollingTimer = setInterval(async () => {
    const windowStart = lastPolledAt;
    lastPolledAt = new Date();
    try {
      const complaints = await Complaint.find({ updatedAt: { $gte: windowStart } })
        .select('reportedBy priority aiMeta updatedAt')
        .sort({ updatedAt: 1 })
        .lean();

      for (const complaint of complaints) {
        // Best-effort dedupe is handled in notification service.
        // Polling fallback is used when replica set change streams are unavailable.
        await processComplaint(complaint);
      }
    } catch (error) {
      logger.warn(`AI notification polling error: ${error.message}`);
    }
  }, 30 * 1000);

  logger.info('AI complaint watcher started in polling mode');
};

const startChangeStream = async () => {
  changeStream = Complaint.watch(
    [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }],
    { fullDocument: 'updateLookup' }
  );

  changeStream.on('change', async (change) => {
    try {
      await processComplaint(change.fullDocument);
    } catch (error) {
      logger.warn(`AI complaint watcher change handling error: ${error.message}`);
    }
  });

  changeStream.on('error', (error) => {
    logger.warn(`AI complaint watcher stream error: ${error.message}`);
    stopComplaintAiWatcher();
    startPolling();
  });

  logger.info('AI complaint watcher started in change-stream mode');
};

const startComplaintAiWatcher = async () => {
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName) {
      startPolling();
      return;
    }

    await startChangeStream();
  } catch (error) {
    logger.warn(`AI complaint watcher initialization fallback to polling: ${error.message}`);
    startPolling();
  }
};

const stopComplaintAiWatcher = async () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }

  if (changeStream) {
    try {
      await changeStream.close();
    } catch (_error) {
      // ignore on shutdown
    }
    changeStream = null;
  }
};

module.exports = {
  startComplaintAiWatcher,
  stopComplaintAiWatcher
};
