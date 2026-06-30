require('dotenv').config();
const connectToDatabase = require('../lib/db-connect');
const FactoryModel = require('../models/factory');
const InspectionDataModel = require('../models/inspection-data');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    await connectToDatabase();
    
    const factory = await FactoryModel.findOne({ name: { $regex: 'LNGM', $options: 'i' } });
    if (!factory) {
      console.log('Factory LNGM not found');
      process.exit(1);
    }
    
    const vendoryTypeDict = {
      1: "Inti",
      2: "Eksternal",
      3: "Plasma",
    };
    
    const vendors = await InspectionDataModel.aggregate([
      { $match: { factory: factory._id } },
      { $group: { _id: "$vendor_name", vendor_type: { $first: "$vendor_type" } } }
    ]);
    
    const csvLines = ['No,Vendor Name,Vendor Type,Category'];
    
    vendors.sort((a, b) => (a._id || "").localeCompare(b._id || ""));
    
    vendors.forEach((v, index) => {
      const name = v._id || "UNKNOWN";
      let vType = parseInt(v.vendor_type) || "UNKNOWN";
      
      let typeLabel = vendoryTypeDict[vType] || "UNKNOWN";
      
      let category = "";
      const nameUpper = name.toUpperCase();
      if (nameUpper.includes("GAPOKTAN")) {
        category = "GAPOKTAN";
      } else if (nameUpper.includes("STKA")) {
        category = "STKA";
      } else if (nameUpper.includes("LUAR") || typeLabel === "Plasma" || typeLabel === "Eksternal") {
        // I will map both Plasma and Eksternal to LUAR since they are non-inti
        category = "LUAR";
      }
      
      const safeName = name.includes(',') ? `"${name}"` : name;
      csvLines.push(`${index + 1},${safeName},${typeLabel},${category}`);
    });
    
    const outputPath = path.join(__dirname, '../lngm_vendors_v4.csv');
    fs.writeFileSync(outputPath, csvLines.join('\n'));
    console.log(`CSV saved to ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
