const FactoryAuthController = require('../../controllers/v5/factory-auth');

module.exports = (express) =>
  new express.Router().post('/login', FactoryAuthController.login);
