const SettingsController = require('../../controllers/v1/settings');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .get('/', SettingsController.getSettings)
    .post('/', SettingsController.createSettings);
