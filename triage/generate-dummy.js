require('dotenv').config();

const { hashPassword } = require('../lib/bcrypt');
const connectToDatabase = require('../lib/db-connect');
const FactoryModel = require('../models/factory');
const InspectionHistoryModel = require('../models/inspection-history');
const UserModel = require('../models/user');
const VendorModel = require('../models/vendor');
const dayjs = require('dayjs');
const { generateRandomPassword } = require('../utils/helpers');
const InspectionDataModel = require('../models/inspection-data');
const CompanyModel = require('../models/company');
const { blastReportToUser } = require('../lib/cron/blast-report');
const VendorV2Model = require('../models/v2/vendor');

connectToDatabase().then(async (res) => {

  //     standard[type] = ['all', generateRandomNumber(1, 5)][

  //     halfRipeMax

  //     overRipeMax

  //     pestInfectionMax

  //     longStashMax

  //     notDetectedMax

  //     detectedMoreThanOneMax

  //   // Ensure the total does not exceed totalTandon
  //     unripePercentage +
  //     halfRipePercentage +
  //     ripePercentage +
  //     overRipePercentage +
  //     rottenPercentage +
  //     pestInfectionPercentage +
  //     longStashPercentage +
  //     notDetectedPercentage +

  // // Example usage

  // // Example usage

  //   (e) => e.initial !== 'DMO'

  const response = await VendorV2Model.find({}).lean();

  console.log({ response });

  console.log('Done');
  process.exit(1);
});
