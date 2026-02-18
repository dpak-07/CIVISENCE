const MunicipalOffice = require('../models/MunicipalOffice');

const incrementWorkload = async (municipalOfficeId) => {
  await MunicipalOffice.findByIdAndUpdate(municipalOfficeId, {
    $inc: { workload: 1 }
  });
};

const decrementWorkload = async (municipalOfficeId) => {
  await MunicipalOffice.findOneAndUpdate(
    { _id: municipalOfficeId },
    [
      {
        $set: {
          workload: {
            $max: [{ $subtract: ['$workload', 1] }, 0]
          }
        }
      }
    ]
  );
};

module.exports = {
  incrementWorkload,
  decrementWorkload
};
