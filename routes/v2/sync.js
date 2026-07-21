const SyncDataController = require("../../controllers/v2/sync");
const { validateClientKey } = require("../../middlewares/authorization");

const { uploadSingleFile, upload } = require("../../middlewares/gcp");

// let upload = upload.single("file")

module.exports = (express) =>
  new express.Router()
    .post("/wa-status", SyncDataController.syncWAStatus)
    .use(validateClientKey)
    .post("/vendor", SyncDataController.syncVendor)
    .post("/inspection", SyncDataController.syncInspection)
    .post("/machine-check", SyncDataController.syncMachineCheck)
    .post("/machine-logs-file", SyncDataController.syncMachineLogsFile)
    .post("/machine-logs-data", SyncDataController.syncMachineLogsData)
    .post(
      "/inspection/:id/image",
      upload.single("file"),
      uploadSingleFile,
      SyncDataController.syncInspectionImage,
    );
