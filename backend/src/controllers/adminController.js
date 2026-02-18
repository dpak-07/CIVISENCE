const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/adminService');

const getDashboard = asyncHandler(async (_req, res) => {
  const dashboard = await adminService.getDashboardMetrics();
  res.status(StatusCodes.OK).json({ success: true, data: dashboard });
});

module.exports = {
  getDashboard
};
