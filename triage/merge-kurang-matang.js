require('dotenv').config();

const connectToDatabase = require('../lib/db-connect');
const InspectionDataModel = require('../models/inspection-data');
const VendorV2Model = require('../models/v2/vendor');

connectToDatabase().then(async (res) => {
  console.log(res);

  try {
    // Step 1: Find all inspections with STKA in delivery_number
    const inspectionsWithSTKADelivery = await InspectionDataModel.find({
      delivery_number: { $regex: 'STKA', $options: 'i' },
    })
      .populate('vendor')
      .lean();

    console.log(
      `Found ${inspectionsWithSTKADelivery.length} inspections with STKA in delivery_number`
    );

    // Step 2: Find all vendors with STKA in name
    const vendorsWithSTKA = await VendorV2Model.find({
      name: { $regex: 'STKA', $options: 'i' },
    }).lean();

    console.log(`Found ${vendorsWithSTKA.length} vendors with STKA in name`);

    const vendorIdsWithSTKA = vendorsWithSTKA.map((v) => v._id.toString());

    // Step 3: Find inspections with STKA vendors
    const inspectionsWithSTKAVendor = await InspectionDataModel.find({
      vendor: { $in: vendorIdsWithSTKA },
    })
      .populate('vendor')
      .lean();

    console.log(
      `Found ${inspectionsWithSTKAVendor.length} inspections with STKA vendors`
    );

    // Step 4: Merge both lists and remove duplicates
    const allInspections = [
      ...inspectionsWithSTKADelivery,
      ...inspectionsWithSTKAVendor,
    ];
    const uniqueInspections = Array.from(
      new Map(allInspections.map((item) => [item._id.toString(), item])).values()
    );

    console.log(
      `Total unique inspections to process: ${uniqueInspections.length}`
    );

    // Step 5: Process each inspection
    let processedCount = 0;
    let skippedCount = 0;

    for (const inspection of uniqueInspections) {
      const gradingResult = inspection.grading_result;

      if (!gradingResult) {
        console.log(`Skipping inspection ${inspection._id} - no grading_result`);
        skippedCount++;
        continue;
      }

      let hasKurangMatang = false;
      let updatedResult = { ...gradingResult };

      // Check if KURANG MATANG exists in classification_summary
      if (
        gradingResult.classification_summary &&
        gradingResult.classification_summary['KURANG MATANG']
      ) {
        hasKurangMatang = true;
        const kurangMatang = gradingResult.classification_summary['KURANG MATANG'];
        const matang = gradingResult.classification_summary['MATANG'] || {};

        // Merge KURANG MATANG into MATANG
        const mergedMatang = {
          TOTAL: (matang.TOTAL || 0) + (kurangMatang.TOTAL || 0),
          NORMAL: (matang.NORMAL || 0) + (kurangMatang.NORMAL || 0),
          'RUSAK DIMAKAN TIKUS':
            (matang['RUSAK DIMAKAN TIKUS'] || 0) +
            (kurangMatang['RUSAK DIMAKAN TIKUS'] || 0),
          'TANGKAI PANJANG':
            (matang['TANGKAI PANJANG'] || 0) +
            (kurangMatang['TANGKAI PANJANG'] || 0),
          'BUAH KECIL DIBAWAH 3KG':
            (matang['BUAH KECIL DIBAWAH 3KG'] || 0) +
            (kurangMatang['BUAH KECIL DIBAWAH 3KG'] || 0),
          'BUAH KECIL DIBAWAH 5KG':
            (matang['BUAH KECIL DIBAWAH 5KG'] || 0) +
            (kurangMatang['BUAH KECIL DIBAWAH 5KG'] || 0),
        };

        updatedResult.classification_summary = {
          ...gradingResult.classification_summary,
        };
        updatedResult.classification_summary['MATANG'] = mergedMatang;
        delete updatedResult.classification_summary['KURANG MATANG'];
      }

      // Check if KURANG MATANG exists in accepted_summary
      if (
        gradingResult.accepted_summary &&
        gradingResult.accepted_summary['KURANG MATANG']
      ) {
        hasKurangMatang = true;
        const kurangMatang = gradingResult.accepted_summary['KURANG MATANG'];
        const matang = gradingResult.accepted_summary['MATANG'] || {};

        // Merge KURANG MATANG into MATANG
        const mergedMatang = {
          TOTAL: (matang.TOTAL || 0) + (kurangMatang.TOTAL || 0),
          NORMAL: (matang.NORMAL || 0) + (kurangMatang.NORMAL || 0),
          'TANGKAI PANJANG':
            (matang['TANGKAI PANJANG'] || 0) +
            (kurangMatang['TANGKAI PANJANG'] || 0),
          'RUSAK DIMAKAN TIKUS':
            (matang['RUSAK DIMAKAN TIKUS'] || 0) +
            (kurangMatang['RUSAK DIMAKAN TIKUS'] || 0),
          'BUAH KECIL DIBAWAH 3KG':
            (matang['BUAH KECIL DIBAWAH 3KG'] || 0) +
            (kurangMatang['BUAH KECIL DIBAWAH 3KG'] || 0),
          'BUAH KECIL DIBAWAH 5KG':
            (matang['BUAH KECIL DIBAWAH 5KG'] || 0) +
            (kurangMatang['BUAH KECIL DIBAWAH 5KG'] || 0),
        };

        updatedResult.accepted_summary = {
          ...gradingResult.accepted_summary,
        };
        updatedResult.accepted_summary['MATANG'] = mergedMatang;
        delete updatedResult.accepted_summary['KURANG MATANG'];
      }

      // Check if KURANG MATANG exists in rejected_summary
      if (
        gradingResult.rejected_summary &&
        gradingResult.rejected_summary['KURANG MATANG']
      ) {
        hasKurangMatang = true;
        const kurangMatang = gradingResult.rejected_summary['KURANG MATANG'];
        const matang = gradingResult.rejected_summary['MATANG'] || {};

        // Merge KURANG MATANG into MATANG
        const mergedMatang = {
          TOTAL: (matang.TOTAL || 0) + (kurangMatang.TOTAL || 0),
          NORMAL: (matang.NORMAL || 0) + (kurangMatang.NORMAL || 0),
          'TANGKAI PANJANG':
            (matang['TANGKAI PANJANG'] || 0) +
            (kurangMatang['TANGKAI PANJANG'] || 0),
          'RUSAK DIMAKAN TIKUS':
            (matang['RUSAK DIMAKAN TIKUS'] || 0) +
            (kurangMatang['RUSAK DIMAKAN TIKUS'] || 0),
          'BUAH KECIL DIBAWAH 3KG':
            (matang['BUAH KECIL DIBAWAH 3KG'] || 0) +
            (kurangMatang['BUAH KECIL DIBAWAH 3KG'] || 0),
          'BUAH KECIL DIBAWAH 5KG':
            (matang['BUAH KECIL DIBAWAH 5KG'] || 0) +
            (kurangMatang['BUAH KECIL DIBAWAH 5KG'] || 0),
        };

        updatedResult.rejected_summary = {
          ...gradingResult.rejected_summary,
        };
        updatedResult.rejected_summary['MATANG'] = mergedMatang;
        delete updatedResult.rejected_summary['KURANG MATANG'];
      }

      if (hasKurangMatang) {
        // Update the inspection with the merged data
        await InspectionDataModel.findByIdAndUpdate(inspection._id, {
          $set: { grading_result: updatedResult },
        });

        processedCount++;
        console.log(
          `✓ Processed inspection ${inspection._id} - delivery_number: ${inspection.delivery_number}, vendor: ${inspection.vendor?.name}`
        );
      } else {
        skippedCount++;
        console.log(
          `⊘ Skipped inspection ${inspection._id} - no KURANG MATANG found`
        );
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total inspections found: ${uniqueInspections.length}`);
    console.log(`Processed (had KURANG MATANG): ${processedCount}`);
    console.log(`Skipped (no KURANG MATANG): ${skippedCount}`);
    console.log('\nDone');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
});
