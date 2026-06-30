require('dotenv').config();
const connectToDatabase = require('../lib/db-connect');
const FactoryModel = require('../models/factory');
const VendorModel = require('../models/vendor');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    await connectToDatabase();
    
    // Find LNGM factory
    const factory = await FactoryModel.findOne({ name: { $regex: 'LNGM', $options: 'i' } });
    if (!factory) {
      console.log('Factory LNGM not found');
      process.exit(1);
    }
    
    console.log(`Found factory: ${factory.name} (${factory._id})`);
    
    // Find all vendors for this factory
    const vendors = await VendorModel.find({ factory: factory._id }).lean();
    console.log(`Found ${vendors.length} vendors`);
    
    // Create CSV content
    const csvLines = ['No,Vendor Name,Vendor ID'];
    vendors.forEach((vendor, index) => {
      // Escape commas in names
      const name = vendor.name ? (vendor.name.includes(',') ? `"${vendor.name}"` : vendor.name) : 'UNKNOWN';
      csvLines.push(`${index + 1},${name},${vendor._id}`);
    });
    
    const outputPath = path.join(__dirname, '../lngm_vendors.csv');
    fs.writeFileSync(outputPath, csvLines.join('\n'));
    console.log(`CSV saved to ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
