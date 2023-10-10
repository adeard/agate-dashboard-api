const AuthController = require('../../controllers/v1/auth');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .post('/signin', AuthController.signIn)
    .post('/forgot-password', AuthController.forgotPassword)
    .use(authorization)
    .get('/decode-token', AuthController.decodeToken);
