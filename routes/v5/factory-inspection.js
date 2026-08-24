const FactoryInspectionController = require('../../controllers/v5/factory-inspection');
const { factoryAuthorization } = require('../../middlewares/factory-authorization');

module.exports = (express) =>
  new express.Router()
    .use(factoryAuthorization)
    .get('/', FactoryInspectionController.getList)
    .get('/detail', FactoryInspectionController.getDetail)
    .get('/:inspectionId', FactoryInspectionController.getDetail);
