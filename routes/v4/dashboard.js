const DashboardV4Controller = require("../../controllers/v4/dashboard");
const { authorization } = require("../../middlewares/authorization");

module.exports = (express) =>
  new express.Router()
    .get("/download-report", DashboardV4Controller.generateExcel)
    .get(
      "/download-performance",
      DashboardV4Controller.downloadOperationalPerformance,
    )
    .use(authorization)
    .post("/", DashboardV4Controller.getDataDashboardNew);
// .post('/monitoring', DashboardV2Controller.getDataDashboardMonitoring);
