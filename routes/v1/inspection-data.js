const InspectionDataController = require('../../controllers/v1/inspection-data');
const {
  authorization,
  validateClientKey,
} = require('../../middlewares/authorization');

module.exports = (express) =>
  new express.Router()
    .post('/', validateClientKey, InspectionDataController.createNew)
    .get(
      '/download-pdf/:inspectionId',
      InspectionDataController.downloadDetailPdf
    )
    .get(
      '/download-pdf/:factoryId/summary',
      InspectionDataController.downloadPdfSummary
    )
    .get(
      '/download-pdf/:factoryId/daily',
      InspectionDataController.downloadPdfSummaryDaily
    )
    .use(authorization)
    .get('/', InspectionDataController.getAll)
    .get('/download-excel/:factoryId', InspectionDataController.downloadExcel)
    .get('/by-factory/:factoryId', InspectionDataController.getAll)
    .get('/:inspectionId', InspectionDataController.getDetail);
