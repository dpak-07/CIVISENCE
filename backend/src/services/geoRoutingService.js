const MunicipalOffice = require('../models/MunicipalOffice');
const { OFFICE_TYPE } = require('../constants/complaint');

const MAX_ROUTING_DISTANCE_METERS = 10000;

const findNearestOffice = async ({ coordinates, query }) => {
  const results = await MunicipalOffice.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates },
        distanceField: 'distanceMeters',
        maxDistance: MAX_ROUTING_DISTANCE_METERS,
        spherical: true,
        query
      }
    },
    { $limit: 1 }
  ]);

  return results[0] || null;
};

const autoRouteComplaint = async ({ coordinates }) => {
  const nearestOffice = await findNearestOffice({
    coordinates,
    query: { isActive: true }
  });

  if (!nearestOffice) {
    return {
      isAssigned: false,
      officeId: null,
      officeType: null,
      distanceMeters: null,
      reason: 'No municipal office within 10km'
    };
  }

  if (nearestOffice.type === OFFICE_TYPE.SUB) {
    if (nearestOffice.workload < nearestOffice.maxCapacity) {
      return {
        isAssigned: true,
        officeId: nearestOffice._id,
        officeType: nearestOffice.type,
        distanceMeters: nearestOffice.distanceMeters,
        reason: 'Assigned to nearest sub office with available capacity'
      };
    }

    const mainOfficeInZone = await findNearestOffice({
      coordinates,
      query: {
        isActive: true,
        type: OFFICE_TYPE.MAIN,
        zone: nearestOffice.zone
      }
    });

    if (mainOfficeInZone) {
      return {
        isAssigned: true,
        officeId: mainOfficeInZone._id,
        officeType: mainOfficeInZone.type,
        distanceMeters: mainOfficeInZone.distanceMeters,
        reason: 'Nearest sub office at capacity; routed to nearest main office in same zone'
      };
    }

    return {
      isAssigned: false,
      officeId: null,
      officeType: null,
      distanceMeters: null,
      reason: 'Nearest sub office at capacity and no main office in same zone within 10km'
    };
  }

  return {
    isAssigned: true,
    officeId: nearestOffice._id,
    officeType: nearestOffice.type,
    distanceMeters: nearestOffice.distanceMeters,
    reason: 'Assigned to nearest active municipal office'
  };
};

module.exports = {
  autoRouteComplaint
};
