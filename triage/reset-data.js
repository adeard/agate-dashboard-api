require("dotenv").config();

const { hashPassword } = require("../lib/bcrypt");
const { blastReportToUser } = require("../lib/cron/blast-report");
const connectToDatabase = require("../lib/db-connect");
const AfdelinkModel = require("../models/afdelink");
const FactoryModel = require("../models/factory");
const InspectionDataModel = require("../models/inspection-data");
const InspectionHistoryModel = require("../models/inspection-history");
const SettingsModel = require("../models/settings");
const UserModel = require("../models/user");
const VendorV2Model = require("../models/v2/vendor");
const VendorModel = require("../models/vendor");
const dayjs = require("dayjs");
const WABroadcastModel = require("../models/wa-broadcast");
const CompanyModel = require("../models/company");
const MachineCheckModel = require("../models/machine-check");
const MachineLogsFileModel = require("../models/machine-logs-file");
const MachineLogsDataModel = require("../models/machine-logs-data");
const { name } = require("dayjs/locale/id");

connectToDatabase().then(async (res) => {
  console.log(res);

  // KENCANA = 68697f15a05bd58ea7bd5dd2
  // DEMO = 68697f15a05bd58ea7bd5dd4

  // // Fix vendor references for factory 68fc9b419a7c87b51e2002b5

  //   `Found ${inspections.length} inspections for factory ${factoryId}`

  // // Create a map to store vendor ObjectIds

  // // Process each unique vendor using upsert to prevent duplicates

  //   // Use findOneAndUpdate with upsert to atomically create if not exists

  // // Now update all inspections with correct vendor ObjectIds

  //       `Skipping inspection ${inspection._id} - missing vendor info`

  //   // Update inspection data with vendor ObjectId

  //     `Updated inspection ${inspection._id} with vendor ${vendorObjectId} (${inspection.vendor_name})`

  //   `Done! Updated ${updated} inspections, skipped ${skipped} inspections`

  //   // Remove duplicate vendors from VendorV2Model across ALL factories

  //     ([, group]) => group.length > 1

  //     `Found ${duplicateGroups.length} groups with duplicate vendor names`

  //   // Process each group to find and remove duplicates

  //       `\nProcessing ${group.length} duplicates for "${group[0].name}" (${key})`

  //     // Sort by createdAt to keep the oldest one

  //       // Check if this vendor is used in any inspection

  //           `  Migrating ${inspectionCount} inspections from ${vendor._id} to ${toKeep._id}`

  //         // Migrate inspections to the kept vendor

  //       // Now safe to delete

  // Summary:

  const factories = await FactoryModel.findOne({ name: "BSU" }).lean();

  console.log({ factories });

  //   '6a3ba7e955d8bf00b62d554b'

  // ‪+62 821‑1496‑2388‬

  console.log("Done");
  process.exit();
});
