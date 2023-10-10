const UserController = require('../../controllers/v1/user');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .put('/setup-password', UserController.setupPassword)
    .use(authorization)
    .put('/change-password', UserController.changePassword)
    .get('/', UserController.getAllUser)
    .get('/:userId', UserController.getUserDetail)
    .put('/reset-password', UserController.resetPassword)
    .put('/:userId', UserController.updateUser)
    .post('/', UserController.createUser);
