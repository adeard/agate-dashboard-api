const TestingController = require('../controllers/testing');

module.exports = (express) =>
  new express.Router()
    .get('/all-by-tickets', TestingController.getAllByTickets)
    .get('/all-by-tickets/detail', TestingController.getDetailByTicket);
