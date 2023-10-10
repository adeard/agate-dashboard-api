const VendorController = require('../../controllers/v1/vendor');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .put('/:vendorId', VendorController.updateVendor)
    .get('/', VendorController.getAllVendor)
    .post('/', VendorController.createVendor);
