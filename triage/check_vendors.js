require('dotenv').config();
const connectToDatabase = require('../lib/db-connect');
const VendorModel = require('../models/vendor');
async function main() {
  await connectToDatabase();
  const v = await VendorModel.find({}).limit(5).lean();
  console.log(v);
  process.exit(0);
}
main();
