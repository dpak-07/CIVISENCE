const COMPLAINT_STATUS = Object.freeze({
  REPORTED: 'reported',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  UNASSIGNED: 'unassigned'
});

const COMPLAINT_STATUS_VALUES = Object.freeze(Object.values(COMPLAINT_STATUS));
const TERMINAL_STATUS = Object.freeze([COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.REJECTED]);

const OFFICE_TYPE = Object.freeze({
  MAIN: 'main',
  SUB: 'sub'
});

const OFFICE_TYPE_VALUES = Object.freeze(Object.values(OFFICE_TYPE));

const AI_PROCESSING_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED: 'failed'
});

const AI_PROCESSING_STATUS_VALUES = Object.freeze(Object.values(AI_PROCESSING_STATUS));

module.exports = {
  COMPLAINT_STATUS,
  COMPLAINT_STATUS_VALUES,
  TERMINAL_STATUS,
  OFFICE_TYPE,
  OFFICE_TYPE_VALUES,
  AI_PROCESSING_STATUS,
  AI_PROCESSING_STATUS_VALUES
};
