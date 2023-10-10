const FactoryController = require('../../controllers/v1/factory');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .put('/:factoryId', FactoryController.updateFactory)
    .get('/', FactoryController.getAllFactory)
    .post('/', FactoryController.createFactory);
