const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  profilePhotoUrl: user.profilePhotoUrl || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const updateProfilePhoto = async ({ userId, profilePhotoUrl }) => {
  if (!profilePhotoUrl) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Profile photo is required');
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { profilePhotoUrl },
    { new: true }
  );

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  return sanitizeUser(user);
};

const removeProfilePhoto = async ({ userId }) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { profilePhotoUrl: null },
    { new: true }
  );

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  return sanitizeUser(user);
};

module.exports = {
  updateProfilePhoto,
  removeProfilePhoto
};
