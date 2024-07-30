const InspectionDataController = require('../../controllers/v1/inspection-data');
const {
  authorization,
  validateClientKey,
} = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .post('/', validateClientKey, InspectionDataController.createNew)
    .use(authorization)
    .post('/', InspectionDataController.getAll);
