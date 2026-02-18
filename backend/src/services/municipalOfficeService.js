const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const MunicipalOffice = require('../models/MunicipalOffice');
const ApiError = require('../utils/ApiError');

const createMunicipalOffice = async (payload) => {
  const { name, type, zone, location, maxCapacity } = payload;

  if (!name || !type || !zone || !location || !maxCapacity) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'name, type, zone, location and maxCapacity are required'
    );
  }

  const office = await MunicipalOffice.create(payload);
  return office.toObject();
};

const getMunicipalOffices = async (filters) => {
  const query = {};

  if (typeof filters.isActive !== 'undefined') {
    query.isActive = filters.isActive === 'true';
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.zone) {
    query.zone = filters.zone;
  }

  return MunicipalOffice.find(query).sort({ createdAt: -1 }).lean();
};

const updateMunicipalOffice = async (officeId, payload) => {
  if (!mongoose.Types.ObjectId.isValid(officeId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid municipal office id');
  }

  const office = await MunicipalOffice.findByIdAndUpdate(officeId, payload, {
    new: true,
    runValidators: true
  }).lean();

  if (!office) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Municipal office not found');
  }

  return office;
};

module.exports = {
  createMunicipalOffice,
  getMunicipalOffices,
  updateMunicipalOffice
};
