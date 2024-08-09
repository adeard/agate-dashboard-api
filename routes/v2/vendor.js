const VendorV2Controller = require('../../controllers/v2/vendor');
const {
  authorization,
  validateClientKey,
} = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .post('/', validateClientKey, VendorV2Controller.createVendor)
    .use(authorization)
    .get('/', VendorV2Controller.getAllVendor);
