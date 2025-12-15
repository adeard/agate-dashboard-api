const MachineCheckController = require('../../controllers/v4/machine-check');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .use(authorization)
    .get('/', MachineCheckController.getAllMachineCheck)
    .get('/:id', MachineCheckController.getMachineCheckDetail);
