const Complaint = require('../models/Complaint');
const { COMPLAINT_STATUS } = require('../constants/complaint');

const getDashboardMetrics = async () => {
  const [
    totalComplaints,
    assignedComplaints,
    resolvedComplaints,
    unassignedComplaints,
    resolutionStats
  ] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.countDocuments({
      status: { $in: [COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS] }
    }),
    Complaint.countDocuments({ status: COMPLAINT_STATUS.RESOLVED }),
    Complaint.countDocuments({ status: COMPLAINT_STATUS.UNASSIGNED }),
    Complaint.aggregate([
      { $match: { status: COMPLAINT_STATUS.RESOLVED } },
      {
        $project: {
          resolutionTimeMs: { $subtract: ['$updatedAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: null,
          averageResolutionTimeMs: { $avg: '$resolutionTimeMs' }
        }
      }
    ])
  ]);

  const averageResolutionTimeMs = resolutionStats[0]?.averageResolutionTimeMs || 0;

  return {
    totalComplaints,
    assigned: assignedComplaints,
    resolved: resolvedComplaints,
    unassigned: unassignedComplaints,
    averageResolutionTimeMs,
    averageResolutionTimeHours: Number((averageResolutionTimeMs / (1000 * 60 * 60)).toFixed(2))
  };
};

module.exports = {
  getDashboardMetrics
};
