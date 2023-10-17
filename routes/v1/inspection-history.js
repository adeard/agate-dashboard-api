const InspectionHistoryControllers = require('../../controllers/v1/inspection-history');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .post('/setup', InspectionHistoryControllers.setupInspectionHistory)
    .get('/:inspectionId', InspectionHistoryControllers.getDetail)
    .post('/', InspectionHistoryControllers.getAllList);
