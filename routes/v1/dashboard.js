const DashboardController = require('../../controllers/v1/dashboard');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .get('/detail-grading', DashboardController.getDetail)
    .get('/detail-classification', DashboardController.getDetailClassification)
    .post('/', DashboardController.getDataDashboard);
