const InspectionHistoryControllers = require('../../controllers/v1/inspection-history');
const {
  authorization,
  validateClientKey,
} = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .post(
      '/setup',
      validateClientKey,
      InspectionHistoryControllers.setupInspectionHistory
    )
    .use(authorization)
    .get('/:inspectionId', InspectionHistoryControllers.getDetail)
    .post('/', InspectionHistoryControllers.getAllList);
