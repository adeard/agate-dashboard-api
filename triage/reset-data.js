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
const MachineCheckModel = require('../models/machine-check');
const MachineLogsFileModel = require('../models/machine-logs-file');
const MachineLogsDataModel = require('../models/machine-logs-data');
const { name } = require('dayjs/locale/id');

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
  //   full_name: 'Admin HPI',
  //   email: 'adminhpi@accelego.id',
  //   password: hashPassword('123'),
  //   access_factory: ['6959fd4584e3955ce63dac95'],
  //   status: 1,
  //   whatsapp_number: '6281385784854',
  //   subscribe_notification: 1,
  //   company: '6959fd4484e3955ce63dac93',
  // });

  // const users = await UserModel.find({
  //   whatsapp_number: { $exists: true },
  //   subscribe_notification: 1,
  // }).lean();
  // console.log({ users });

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

  // await UserModel.findOneAndUpdate(
  //   { email: 'staff.vpm.pbro@sinarmas-agri.com' },
  //   { $set: { password: hashPassword('agate123') } }
  // );
  // await UserModel.findOneAndUpdate(
  //   { email: 'pc.libm@sinarmas-agri.com' },
  //   { $set: { password: hashPassword('agate123') } }
  // );

  // const response = await InspectionDataModel.findOne({}).sort({ date: -1 });
  // const response = await MachineLogsFileModel.find({}).lean();

  // console.log({ response: response });

  // // Fix vendor references for factory 68fc9b419a7c87b51e2002b5
  // const factoryId = '68fc9b419a7c87b51e2002b5';

  // const inspections = await InspectionDataModel.find({
  //   factory: factoryId,
  // }).lean();

  // console.log(
  //   `Found ${inspections.length} inspections for factory ${factoryId}`
  // );

  // // Get unique vendors (by vendor_id + name combination)
  // const uniqueVendorsMap = {};
  // inspections.forEach((inspection) => {
  //   if (inspection.vendor_name && inspection.vendor_id) {
  //     const key = `${inspection.vendor_id}_${inspection.vendor_name.trim()}`;
  //     if (!uniqueVendorsMap[key]) {
  //       uniqueVendorsMap[key] = {
  //         vendor_id: inspection.vendor_id,
  //         vendor_name: inspection.vendor_name.trim(),
  //         vendor_type: inspection.vendor_type || 1,
  //       };
  //     }
  //   }
  // });

  // const uniqueVendors = Object.values(uniqueVendorsMap);
  // console.log(`Found ${uniqueVendors.length} unique vendors to process`);

  // // Create a map to store vendor ObjectIds
  // const vendorIdMap = {};

  // // Process each unique vendor using upsert to prevent duplicates
  // await uniqueVendors.reduce(async (p, vendorData) => {
  //   await p;

  //   // Use findOneAndUpdate with upsert to atomically create if not exists
  //   const vendor = await VendorV2Model.findOneAndUpdate(
  //     {
  //       id: vendorData.vendor_id,
  //       factory: factoryId,
  //     },
  //     {
  //       $setOnInsert: {
  //         id: vendorData.vendor_id,
  //         factory: factoryId,
  //         name: vendorData.vendor_name,
  //         type: vendorData.vendor_type,
  //       },
  //     },
  //     {
  //       upsert: true,
  //       new: true,
  //     }
  //   ).lean();

  //   const key = `${vendorData.vendor_id}_${vendorData.vendor_name}`;
  //   vendorIdMap[key] = vendor._id;
  //   console.log(
  //     `Processed vendor: ${vendorData.vendor_name} (ID: ${vendorData.vendor_id}) -> ${vendor._id}`
  //   );
  // }, Promise.resolve());

  // console.log('All vendors processed, now updating inspections...');

  // // Now update all inspections with correct vendor ObjectIds
  // let updated = 0;
  // let skipped = 0;

  // await inspections.reduce(async (p, inspection) => {
  //   await p;

  //   if (!inspection.vendor_name || !inspection.vendor_id) {
  //     console.log(
  //       `Skipping inspection ${inspection._id} - missing vendor info`
  //     );
  //     skipped++;
  //     return;
  //   }

  //   const key = `${inspection.vendor_id}_${inspection.vendor_name.trim()}`;
  //   const vendorObjectId = vendorIdMap[key];

  //   if (!vendorObjectId) {
  //     console.log(`No vendor ObjectId found for ${key}`);
  //     skipped++;
  //     return;
  //   }

  //   // Update inspection data with vendor ObjectId
  //   await InspectionDataModel.findByIdAndUpdate(inspection._id, {
  //     $set: {
  //       vendor: vendorObjectId,
  //     },
  //   });

  //   updated++;
  //   console.log(
  //     `Updated inspection ${inspection._id} with vendor ${vendorObjectId} (${inspection.vendor_name})`
  //   );
  // }, Promise.resolve());

  // console.log(
  //   `Done! Updated ${updated} inspections, skipped ${skipped} inspections`
  // );

  //   // Remove duplicate vendors from VendorV2Model across ALL factories
  //   const vendors = await VendorV2Model.find({}).lean();
  //   console.log(`Found ${vendors.length} total vendors across all factories`);

  //   // Group vendors by unique key (name + factory)
  //   const vendorGroups = {};
  //   vendors.forEach((vendor) => {
  //     const key = `${vendor.name.trim()}_${vendor.factory}`;
  //     if (!vendorGroups[key]) {
  //       vendorGroups[key] = [];
  //     }
  //     vendorGroups[key].push(vendor);
  //   });

  //   const duplicateGroups = Object.entries(vendorGroups).filter(
  //     ([, group]) => group.length > 1
  //   );

  //   console.log(
  //     `Found ${duplicateGroups.length} groups with duplicate vendor names`
  //   );

  //   let totalDuplicates = 0;
  //   let deletedCount = 0;
  //   let migratedCount = 0;

  //   // Process each group to find and remove duplicates
  //   await duplicateGroups.reduce(async (p, [key, group]) => {
  //     await p;

  //     totalDuplicates += group.length - 1;
  //     console.log(
  //       `\nProcessing ${group.length} duplicates for "${group[0].name}" (${key})`
  //     );

  //     // Sort by createdAt to keep the oldest one
  //     group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  //     // Keep the first one (oldest)
  //     const toKeep = group[0];
  //     const toDelete = group.slice(1);

  //     console.log(`  Keeping: ${toKeep._id} (created: ${toKeep.createdAt})`);

  //     for (const vendor of toDelete) {
  //       // Check if this vendor is used in any inspection
  //       const inspectionCount = await InspectionDataModel.countDocuments({
  //         vendor: vendor._id,
  //       });

  //       if (inspectionCount > 0) {
  //         console.log(
  //           `  Migrating ${inspectionCount} inspections from ${vendor._id} to ${toKeep._id}`
  //         );

  //         // Migrate inspections to the kept vendor
  //         await InspectionDataModel.updateMany(
  //           { vendor: vendor._id },
  //           { $set: { vendor: toKeep._id } }
  //         );

  //         migratedCount += inspectionCount;
  //       }

  //       // Now safe to delete
  //       await VendorV2Model.findByIdAndDelete(vendor._id);
  //       console.log(
  //         `  Deleted ${vendor._id} (created: ${vendor.createdAt}) - ${inspectionCount} inspections migrated`
  //       );
  //       deletedCount++;
  //     }
  //   }, Promise.resolve());

  //   console.log(`
  // Summary:
  // - Total duplicate vendors found: ${totalDuplicates}
  // - Successfully deleted: ${deletedCount}
  // - Inspections migrated: ${migratedCount}
  //   `);

  // await MachineLogsFileModel.deleteMany({});

  // const comp = await CompanyModel.create({
  //   name: 'Group HPI',
  //   initial: 'HPI',
  //   image_name: '',
  //   location: 'Sumatera',
  // });
  // const factory = await FactoryModel.create({
  //   name: 'ENGM',
  //   company: comp._id,
  //   location: '',
  // });

  // await CompanyModel.findByIdAndUpdate('6959fd4484e3955ce63dac93', {
  //   $set: {
  //     location: 'Mempawah, Kalimantan Barat',
  //     image_name: 'hpi-logo.png',
  //   },
  // });
  // await FactoryModel.findByIdAndUpdate('6959fd4584e3955ce63dac95', {
  //   $set: {
  //     location: 'Mempawah, Kalimantan Barat',
  //   },
  // });
  // const company = await FactoryModel.find({}).lean();

  // const inspection = await InspectionDataModel.updateMany(
  //   {
  //     factory: '6959fd4484e3955ce63dac93',
  //   },
  //   {
  //     $set: {
  //       factory: '6959fd4584e3955ce63dac95',
  //       company: '6959fd4484e3955ce63dac93',
  //     },
  //   }
  // ).lean();

  const insepection = await InspectionDataModel.find({
    company: '68697f15a05bd58ea7bd5dd2',
  }).lean();

  console.log({ insepection });
  // console.log({ company });

  console.log('Done');
  process.exit();
});
