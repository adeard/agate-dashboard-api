require('dotenv').config();

const { hashPassword } = require('../lib/bcrypt');
const connectToDatabase = require('../lib/db-connect');
const AfdelinkModel = require('../models/afdelink');
const FactoryModel = require('../models/factory');
const InspectionDataModel = require('../models/inspection-data');
const InspectionHistoryModel = require('../models/inspection-history');
const SettingsModel = require('../models/settings');
const UserModel = require('../models/user');
const VendorV2Model = require('../models/v2/vendor');
const VendorModel = require('../models/vendor');
const dayjs = require('dayjs');

// console.log(generateRandomPassword(6));

connectToDatabase().then(async (res) => {
  console.log(res);
  // await UserModel.deleteMany({});

  // await VendorModel.deleteMany({});
  // await VendorV2Model.deleteMany({});
  // await FactoryModel.deleteMany({});
  // await InspectionDataModel.deleteMany({});
  // await InspectionHistoryModel.deleteMany({});
  // await AfdelinkModel.deleteMany({});
  // await SettingsModel.deleteMany({});

  const factory = await FactoryModel.findOne({
    name: 'LNGM',
  }).lean();

  await UserModel.create({
    full_name: 'Accelego',
    email: 'hi@accelego.id',
    password: hashPassword('admin123'),
    access_factory: [factory._id],
    status: 1,
    whatsapp_number: '6281385784854',
    subscribe_notification: 1,
  });
  console.log('Done');
});
