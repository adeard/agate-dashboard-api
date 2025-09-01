const VendorController = require('../../controllers/v1/vendor');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .get('/', VendorController.getAllVendor)
    .put('/:vendorId', VendorController.updateVendor)
    .post('/', VendorController.createVendor);
