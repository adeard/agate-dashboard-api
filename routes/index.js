const errorHandler = require('../middlewares/error-handler');

module.exports = (app, express) => {
  const router = new express.Router();
  const v1 = require('./v1')(express);

  router.use('/api/v1', v1);
  router.use(errorHandler);
  app.use(router);
};
