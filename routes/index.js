const errorHandler = require('../middlewares/error-handler');

module.exports = (app, express) => {
  const router = new express.Router();
  const v1 = require('./v1')(express);
  const v2 = require('./v2')(express);
  const v3 = require('./v3')(express);
  const v4 = require('./v4')(express);
  const testing = require('./testing')(express);

  router.use('/api/v1', v1);
  router.use('/api/v2', v2);
  router.use('/api/v3', v3);
  router.use('/api/v4', v4);
  router.use('/testing', testing);
  router.use(errorHandler);
  app.use(router);
};
