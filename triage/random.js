require('dotenv').config();

const { hashPassword } = require('../lib/bcrypt');
const connectToDatabase = require('../lib/db-connect');
const FactoryModel = require('../models/factory');
const InspectionHistoryModel = require('../models/inspection-history');
const UserModel = require('../models/user');
const VendorModel = require('../models/vendor');
const dayjs = require('dayjs');

// console.log(generateRandomPassword(6));

connectToDatabase().then(async (res) => {
  console.log(res);

  // await UserModel.deleteOne({ email: "text@mail.com" });
  // await UserModel.deleteOne({ email: "text@mail.com" });
  // await UserModel.deleteOne({ email: "hi@accelego.id" });

  // await UserModel.create({
  //   email: 'hi@accelego.id',
  //   full_name: 'Admin Accelego',
  //   status: 1,
  //   access_factory: 1,
  //   password: hashPassword('secret123'),
  // });

  // await UserModel.deleteOne({ username: 'ilham' });

  // await UserModel.updateMany({}, { $set: { status: 1 } });

  // await ProductionOrderModel.deleteMany({})

  // const devices = [
  //   { mac_address: '48:E7:29:07:C1:70', machine: '65123db7139e9fd6ff74f8e7' },
  //   { mac_address: '48:E7:29:07:C0:5C', machine: '65123dbb139e9fd6ff74f8ea' },
  //   { mac_address: '48:E7:29:07:C1:9C', machine: '65123dbf139e9fd6ff74f8ed' },
  //   { mac_address: '08:3A:8D:A5:2C:98', machine: '65123dc2139e9fd6ff74f8f0' },
  //   { mac_address: '08:3A:8D:A5:2D:E0', machine: '65123dc5139e9fd6ff74f8f3' },
  // ];

  // await devices.reduce((promise, d) => {
  //   return promise.then(async () => {
  //     await DeviceModel.create({
  //       mac_address: d.mac_address,
  //       machine: d.machine,
  //       plant: '65123d9d139e9fd6ff74f8e3',
  //     });
  //   });
  // }, Promise.resolve());

  // const prods = await ProductionModel.find({});

  // console.log({ prods });

  // await InspectionHistoryModel.deleteMany({})

  // const response = await FactoryModel.find({});
  // const vendors = await VendorModel.find({});

  // console.log({ response, vendors });

  console.log('Done');
});
