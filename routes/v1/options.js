const OptionsController = require('../../controllers/v1/options');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .get('/:type', OptionsController.getOptionsSelector);
