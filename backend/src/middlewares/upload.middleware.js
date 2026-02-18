const Busboy = require('busboy');
const { PassThrough } = require('stream');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const { uploadToS3 } = require('../services/s3.service');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const uploadComplaintImage = async (req, _res, next) => {
  const contentType = req.headers['content-type'] || '';

  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return next();
  }

  let busboy;
  try {
    busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fields: 25,
        fileSize: MAX_FILE_SIZE_BYTES
      }
    });
  } catch (_error) {
    return next(new ApiError(StatusCodes.BAD_REQUEST, 'Malformed multipart/form-data request'));
  }

  const fields = {};
  let uploadedImageUrl = null;
  let fileProcessingPromise = null;
  let fileSeen = false;
  let hasCompleted = false;
  let middlewareError = null;

  const fail = (error) => {
    if (!middlewareError) {
      middlewareError = error;
    }
  };

  const done = (error) => {
    if (hasCompleted) {
      return;
    }
    hasCompleted = true;
    next(error);
  };

  busboy.on('field', (fieldname, value) => {
    if (Object.prototype.hasOwnProperty.call(fields, fieldname)) {
      if (Array.isArray(fields[fieldname])) {
        fields[fieldname].push(value);
      } else {
        fields[fieldname] = [fields[fieldname], value];
      }
      return;
    }

    fields[fieldname] = value;
  });

  busboy.on('file', (fieldname, fileStream, info) => {
    fileSeen = true;

    if (fieldname !== 'image') {
      fileStream.resume();
      fail(new ApiError(StatusCodes.BAD_REQUEST, 'Unexpected file field; expected "image"'));
      return;
    }

    const { filename, mimeType } = info;
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      fileStream.resume();
      fail(new ApiError(StatusCodes.UNSUPPORTED_MEDIA_TYPE, 'Only JPEG and PNG images are allowed'));
      return;
    }

    const passThrough = new PassThrough();

    fileStream.on('limit', () => {
      passThrough.destroy(new ApiError(StatusCodes.PAYLOAD_TOO_LARGE, 'Image size exceeds 5MB limit'));
      fail(new ApiError(StatusCodes.PAYLOAD_TOO_LARGE, 'Image size exceeds 5MB limit'));
    });

    fileStream.on('error', () => {
      passThrough.destroy(new ApiError(StatusCodes.BAD_REQUEST, 'Image stream processing failed'));
      fail(new ApiError(StatusCodes.BAD_REQUEST, 'Image stream processing failed'));
    });

    passThrough.on('error', () => {
      if (!middlewareError) {
        fail(new ApiError(StatusCodes.BAD_GATEWAY, 'Image upload stream failed'));
      }
    });

    fileStream.pipe(passThrough);

    fileProcessingPromise = uploadToS3(passThrough, filename, mimeType)
      .then((url) => {
        uploadedImageUrl = url;
      })
      .catch((error) => {
        if (error instanceof ApiError) {
          fail(error);
          return;
        }

        fail(new ApiError(StatusCodes.BAD_GATEWAY, 'Image upload failed'));
      });
  });

  busboy.on('filesLimit', () => {
    fail(new ApiError(StatusCodes.BAD_REQUEST, 'Only one image upload is allowed'));
  });

  busboy.on('partsLimit', () => {
    fail(new ApiError(StatusCodes.BAD_REQUEST, 'Too many multipart sections'));
  });

  busboy.on('error', () => {
    done(new ApiError(StatusCodes.BAD_REQUEST, 'Failed to parse multipart/form-data payload'));
  });

  busboy.on('finish', async () => {
    if (hasCompleted) {
      return;
    }

    try {
      if (fileProcessingPromise) {
        await fileProcessingPromise;
      }

      if (middlewareError) {
        return done(middlewareError);
      }

      req.body = {
        ...fields
      };

      if (!fileSeen) {
        req.uploadedImageUrl = null;
        return done();
      }

      req.uploadedImageUrl = uploadedImageUrl;
      return done();
    } catch (_error) {
      return done(new ApiError(StatusCodes.BAD_GATEWAY, 'File upload processing failed'));
    }
  });

  req.pipe(busboy);
  return undefined;
};

module.exports = uploadComplaintImage;
