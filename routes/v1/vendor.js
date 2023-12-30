const VendorController = require('../../controllers/v1/vendor');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .get('/', VendorController.getAllVendor)
    .use(authorization)
    .put('/:vendorId', VendorController.updateVendor)
    .post('/', VendorController.createVendor);
