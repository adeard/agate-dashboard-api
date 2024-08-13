const DashboardController = require('../../controllers/v1/dashboard');
const DashboardV2Controller = require('../../controllers/v2/dashboard');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .post('/', DashboardV2Controller.getDataDashboard)
    .post('/monitoring', DashboardV2Controller.getDataDashboardMonitoring);
