const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');

const updateProfilePhoto = asyncHandler(async (req, res) => {
  const user = await userService.updateProfilePhoto({
    userId: req.user.id,
    profilePhotoUrl: req.uploadedProfilePhotoUrl || null
  });

  res.status(StatusCodes.OK).json({ success: true, data: user });
});

const removeProfilePhoto = asyncHandler(async (req, res) => {
  const user = await userService.removeProfilePhoto({ userId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data: user });
});

module.exports = {
  updateProfilePhoto,
  removeProfilePhoto
};
