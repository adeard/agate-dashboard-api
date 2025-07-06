require('dotenv').config();

const { hashPassword } = require('../lib/bcrypt');
const { blastReportToUser } = require('../lib/cron/blast-report');
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
const WABroadcastModel = require('../models/wa-broadcast');
const CompanyModel = require('../models/company');

// console.log(generateRandomPassword(6));

connectToDatabase().then(async (res) => {
  console.log(res);
  // await UserModel.deleteMany({});

  // await VendorModel.deleteMany({});
  // await VendorV2Model.deleteMany({});
  // await FactoryModel.deleteMany({});
  // await InspectionDataModel.deleteOne({ delivery_number: 'gsdg' });
  // await InspectionHistoryModel.deleteMany({});
  // await AfdelinkModel.deleteMany({});
  // await SettingsModel.deleteMany({});

  // const factory = await FactoryModel.findOne({
  //   name: 'LNGM',
  // }).lean();

  // await UserModel.create({
  //   full_name: 'Accelego',
  //   email: 'hi@accelego.id',
  //   password: hashPassword('admin123'),
  //   access_factory: [factory._id],
  //   status: 1,
  //   whatsapp_number: '6281385784854',
  //   subscribe_notification: 1,
  // });

  // const users = await UserModel.find({
  //   whatsapp_number: { $exists: true },
  //   subscribe_notification: 1,
  // }).lean();
  // console.log({ users });

  // await blastReportToUser();

  // const response = await WABroadcastModel.find({}).lean();

  // const sinarmas = await CompanyModel.create({
  //   name: 'Sinarmas',
  //   initial: 'SMS',
  // });
  // const kencana = await CompanyModel.create({
  //   name: 'Kencana',
  //   initial: 'KNC',
  // });
  // const demo = await CompanyModel.create({
  //   name: 'Demo Company',
  //   initial: 'DMO',
  // });

  const idCompanySinarmas = '68697f15a05bd58ea7bd5dd0';

  // console.log({ sinarmas });

  await FactoryModel.updateMany(
    {},
    {
      $set: {
        company: idCompanySinarmas,
      },
    }
  );
  await UserModel.updateMany(
    {},
    {
      $set: {
        company: idCompanySinarmas,
        role: 1,
      },
    }
  );
  await InspectionDataModel.updateMany(
    {},
    {
      $set: {
        company: idCompanySinarmas,
      },
    }
  );
  console.log('Done');
});
