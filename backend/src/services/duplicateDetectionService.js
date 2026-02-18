const Complaint = require('../models/Complaint');

const HOURS_24_MS = 24 * 60 * 60 * 1000;
const HOURS_48_MS = 48 * 60 * 60 * 1000;

const buildNearQuery = (coordinates, maxDistanceMeters = 100) => ({
  $near: {
    $geometry: {
      type: 'Point',
      coordinates
    },
    $maxDistance: maxDistanceMeters
  }
});

const resolveMasterComplaint = async (complaint) => {
  if (!complaint?.duplicateInfo?.isDuplicate || !complaint.duplicateInfo.masterComplaintId) {
    return complaint;
  }

  const masterComplaint = await Complaint.findById(complaint.duplicateInfo.masterComplaintId).lean();
  return masterComplaint || complaint;
};

const detectDuplicate = async ({ reportedBy, category, coordinates }) => {
  const now = Date.now();
  const sameUserWindowStart = new Date(now - HOURS_24_MS);
  const crossUserWindowStart = new Date(now - HOURS_48_MS);

  const sameUserComplaint = await Complaint.findOne({
    reportedBy,
    category,
    location: buildNearQuery(coordinates, 100),
    createdAt: { $gte: sameUserWindowStart }
  }).lean();

  if (sameUserComplaint) {
    return {
      type: 'same_user_recent',
      existingComplaint: sameUserComplaint
    };
  }

  const nearbyComplaint = await Complaint.findOne({
    category,
    reportedBy: { $ne: reportedBy },
    location: buildNearQuery(coordinates, 100),
    createdAt: { $gte: crossUserWindowStart }
  }).lean();

  if (!nearbyComplaint) {
    return { type: 'none' };
  }

  const masterComplaint = await resolveMasterComplaint(nearbyComplaint);

  return {
    type: 'cross_user_duplicate',
    masterComplaint
  };
};

module.exports = {
  detectDuplicate
};
