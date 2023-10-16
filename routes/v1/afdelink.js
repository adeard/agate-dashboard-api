const AfdelinkController = require('../../controllers/v1/afdelink');
const { authorization } = require('../../middlewares/authorization');

module.exports = (express) => new express.Router().use(authorization);
// .put('/:afdelinkId', AfdelinkController.updateAfdelink)
// .get('/', AfdelinkController.getAllAfdelink)
// .post('/', AfdelinkController.createAfdelink);
