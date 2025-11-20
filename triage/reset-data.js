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

  // const idCompanySinarmas = '68697f15a05bd58ea7bd5dd0';

  // // console.log({ sinarmas });

  // await FactoryModel.updateMany(
  //   {},
  //   {
  //     $set: {
  //       company: idCompanySinarmas,
  //     },
  //   }
  // );
  // await UserModel.updateMany(
  //   {},
  //   {
  //     $set: {
  //       company: idCompanySinarmas,
  //       role: 1,
  //     },
  //   }
  // );
  // await InspectionDataModel.updateMany(
  //   {},
  //   {
  //     $set: {
  //       company: idCompanySinarmas,
  //     },
  //   }
  // );
  // const companies = await CompanyModel.find({}).lean();
  // console.log({ companies });

  // KENCANA = 68697f15a05bd58ea7bd5dd2
  // DEMO = 68697f15a05bd58ea7bd5dd4
  // const factoryKencana = await FactoryModel.create({
  //   company: '68697f15a05bd58ea7bd5dd2',
  //   name: 'SWK',
  // });
  // const factoryDemo = await FactoryModel.create({
  //   company: '68697f15a05bd58ea7bd5dd4',
  //   name: 'DMO',
  // });

  // const factories = await FactoryModel.find({}).lean();
  // console.log({ factories });

  // await UserModel.create({
  //   full_name: 'Admin Accelego Kencana',
  //   email: 'adminkencana@accelego.id',
  //   role: 1,
  //   subscribe_notification: 1,
  //   company: '68697f15a05bd58ea7bd5dd2',
  //   access_factory: ['686a5645bf73aa13b489ad36'],
  //   whatsapp_number: '6281385784854',
  //   status: 1,
  //   password: hashPassword('123'),
  // });
  // await UserModel.create({
  //   full_name: 'Admin Accelego Demo',
  //   email: 'admindemo@accelego.id',
  //   role: 1,
  //   subscribe_notification: 1,
  //   company: '68697f15a05bd58ea7bd5dd4',
  //   access_factory: ['686a5645bf73aa13b489ad38'],
  //   whatsapp_number: '6281385784854',
  //   status: 1,
  //   password: hashPassword('123'),
  // });

  // let idCompanyDemo = '68697f15a05bd58ea7bd5dd4';
  // let idFactoryDemo = '686a5645bf73aa13b489ad38';

  // const idSinarmas = '68697f15a05bd58ea7bd5dd0';
  // const created = await FactoryModel.create({
  //   company: idSinarmas,
  //   name: 'UTJM',
  // });
  // const created2 = await FactoryModel.create({
  //   company: idSinarmas,
  //   name: 'KJGM',
  // });

  // console.log({ created, created2 });

  // await FactoryModel.findByIdAndDelete("68fc9b3a2a9aba40cc2a5543")
  // await FactoryModel.findByIdAndDelete("68fc9b3a2a9aba40cc2a5545")

  // const list = await FactoryModel.find({}).lean();

  // console.log({ list });

  // const lngm = '66c3114ba342ddbf9eae83c1';

  // await InspectionDataModel.deleteMany({ company: idCompanyDemo });
  // await VendorV2Model.deleteMany({ factory: idFactoryDemo });

  // const datas = await InspectionDataModel.find({
  //   company: idSinarmas,
  //   date: { $gte: getThreeMonthsAgo() },
  // }).lean();
  // const vendors = await VendorV2Model.find({ factory: lngm }).lean();

  // let newVendors = [];

  // await vendors.reduce(async (p, v) => {
  //   await p;

  //   let type = v.type === 3 ? 2 : v.type;

  //   const createdVendor = await VendorV2Model.create({
  //     factory: idFactoryDemo,
  //     type: type,
  //     name: v.name,
  //     id: v.id,
  //   });

  //   newVendors.push(createdVendor);
  // }, Promise.resolve());

  // await datas.reduce(async (p, d) => {
  //   await p;

  //   const vendor = newVendors.find((v) => v.name === d.vendor_name);

  //   if (vendor) {
  //     delete d['_id'];

  //     let result = d['grading_result'] ? d['grading_result'] : {};

  //     await InspectionDataModel.create({
  //       ...d,
  //       company: idCompanyDemo,
  //       factory: idFactoryDemo,
  //       vendor: vendor._id,
  //       grading_result: result,
  //     });

  //     console.log('Done copy-ing data');
  //     return;
  //   }

  //   console.log('Vendor not found');
  // }, Promise.resolve());

  // const inspections = await InspectionDataModel.find({
  //   company: '68697f15a05bd58ea7bd5dd2',
  // }).lean();

  // inspections.reduce(async (p, ins) => {
  //   await p;

  //   const v = ins['vendor'];

  //   const vendor = await VendorV2Model.findById(v);

  //   console.log({ vendor });
  //   // await VendorV2Model.findByIdAndUpdate(v, {
  //   //   $set: {
  //   //     factory: ins['factory'],
  //   //   },
  //   // });

  //   // console.log('Done update vendor');

  //   return;
  // }, Promise.resolve());

  await UserModel.findOneAndUpdate(
    { email: 'staff.vpm.pbro@sinarmas-agri.com' },
    { $set: { password: hashPassword('agate123') } }
  );
  // await UserModel.findOneAndUpdate(
  //   { email: 'pc.libm@sinarmas-agri.com' },
  //   { $set: { password: hashPassword('agate123') } }
  // );

  console.log('Done');
});
