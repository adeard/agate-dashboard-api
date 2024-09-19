const SyncDataController = require('../../controllers/v2/sync');
const VendorV2Controller = require('../../controllers/v2/vendor');
const { validateClientKey } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .post('/vendor', validateClientKey, SyncDataController.syncVendor)
    .post('/wa-status', SyncDataController.syncWAStatus)
    .post('/inspection', validateClientKey, SyncDataController.syncInspection);
