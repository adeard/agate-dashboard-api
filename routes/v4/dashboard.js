const DashboardV2Controller = require('../../controllers/v4/dashboard');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .get('/download-report', DashboardV2Controller.generateExcel)
    .use(authorization)
    .post('/', DashboardV2Controller.getDataDashboard);
// .post('/monitoring', DashboardV2Controller.getDataDashboardMonitoring);
