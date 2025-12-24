const MachineLogsController = require('../../controllers/v4/machine-logs');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .get('/file', MachineLogsController.getAllMachineLogsFile)
    .get('/file/:id', MachineLogsController.getMachineLogsFileDetail)
    .get('/data', MachineLogsController.getAllMachineLogsData)
    .get('/data/:id', MachineLogsController.getMachineLogsDataDetail);
