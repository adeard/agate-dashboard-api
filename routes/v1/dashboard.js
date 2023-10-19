const DashboardController = require('../../controllers/v1/dashboard');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .get('/detail-grading', DashboardController.getDetail)
    .post('/', DashboardController.getDataDashboard);
