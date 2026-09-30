require('dotenv').config();

const connectToDatabase = require('../lib/db-connect');
const VendorV2Model = require('../models/v2/vendor');
const InspectionDataModel = require('../models/inspection-data');
const FactoryModel = require('../models/factory');

/**
 * This script merges duplicate vendors based on 'id', 'name', and 'factory'
 * and updates all inspection data to reference the correct vendor
 *
 * Note: Vendors with same id/name but different factories are NOT considered duplicates
 * as the same vendor can exist across multiple factories.
 */

async function mergeDuplicateVendors() {
  try {
    console.log('Starting duplicate vendor merge process...\n');

    const factories = await FactoryModel.find({}).lean();
    const factoryMap = {};
    factories.forEach((factory) => {
      factoryMap[factory._id.toString()] = factory;
    });
    console.log(`Total factories found: ${factories.length}\n`);

    const vendors = await VendorV2Model.find({}).lean();
    console.log(`Total vendors found: ${vendors.length}\n`);

    const allVendors = vendors.map((vendor) => {
      if (vendor.factory) {
        const factoryId = vendor.factory.toString();
        const factory = factoryMap[factoryId];
        return {
          ...vendor,
          factory: factory || vendor.factory, // Keep original if not found
        };
      }
      return vendor; // Keep as is if no factory
    });

    const vendorsByIdAndName = {};

    allVendors.forEach((vendor) => {
      const factoryId = vendor.factory?._id || vendor.factory;
      const key = `${vendor.id}_${vendor.name.trim()}_${factoryId}`;

      if (!vendorsByIdAndName[key]) {
        vendorsByIdAndName[key] = [];
      }
      vendorsByIdAndName[key].push(vendor);
    });

    const duplicateGroups = Object.entries(vendorsByIdAndName).filter(
      ([key, vendors]) => vendors.length > 1
    );

    console.log(`Found ${duplicateGroups.length} duplicate vendor groups:\n`);

    if (duplicateGroups.length === 0) {
      console.log('No duplicates found. Exiting...');
      return;
    }

    duplicateGroups.forEach(([key, vendors]) => {
      console.log(`Duplicate group: ${key}`);
      vendors.forEach((v) => {
        const factoryName = v.factory?.name || 'Unknown';
        const factoryId = v.factory?._id || v.factory;
        console.log(
          `  - _id: ${v._id}, id: ${v.id}, name: "${v.name}", type: ${v.type}, factory: ${factoryName} (${factoryId})`
        );
      });
      console.log('');
    });

    let totalMerged = 0;
    let totalInspectionsUpdated = 0;

    for (const [key, vendors] of duplicateGroups) {
      const factoryName = vendors[0].factory?.name || 'Unknown';
      console.log(
        `\nProcessing duplicate group: ${key} (Factory: ${factoryName})`
      );

      const keepVendor = vendors[0];
      const duplicateVendors = vendors.slice(1);

      console.log(`  Keeping vendor: ${keepVendor._id} (${keepVendor.name})`);
      console.log(
        `  Duplicates to remove: ${duplicateVendors
          .map((v) => v._id)
          .join(', ')}`
      );

      // Get all duplicate vendor IDs
      const duplicateIds = duplicateVendors.map((v) => v._id);

      const inspectionsToUpdate = await InspectionDataModel.find({
        vendor: { $in: duplicateIds },
      });

      console.log(
        `  Found ${inspectionsToUpdate.length} inspections referencing duplicate vendors`
      );

      // //   const updateResult = await InspectionDataModel.updateMany(

      // //   console.log(
      // //     `  Updated ${updateResult.modifiedCount} inspection records`

    }

    console.log('\n=== Merge Complete ===');
    console.log(`Total duplicate vendors removed: ${totalMerged}`);
    console.log(`Total inspection records updated: ${totalInspectionsUpdated}`);
    console.log('\nPlease verify the data before running in production!');
  } catch (error) {
    console.error('Error during vendor merge:', error);
    throw error;
  }
}

// Connect to database and run the merge
connectToDatabase().then(async (res) => {
  console.log('Database connected:', res);
  console.log('');

  // UNCOMMENT THE LINE BELOW TO RUN THE MERGE
  await mergeDuplicateVendors();

  console.log('\nDone. To run the merge, uncomment the function call above.');
});
