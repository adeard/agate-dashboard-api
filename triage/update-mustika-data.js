require("dotenv").config();

const connectToDatabase = require("../lib/db-connect");
const CompanyModel = require("../models/company");
const InspectionDataModel = require("../models/inspection-data");
const VendorV2Model = require("../models/v2/vendor");

connectToDatabase().then(async (res) => {
  console.log(res);

  try {
    const company = await CompanyModel.findOne({ initial: "MAS" }).lean();
    const inspections = await InspectionDataModel.find({
      company: company._id,
      date: {
        $gte: new Date("2026-07-01T00:00:00Z"),
        $lte: new Date(),
      },
    })
      .populate("vendor")
      .lean();

    console.log(`Found ${inspections.length} inspections for company MAS`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const ins of inspections) {
      const gradingResult = ins.grading_result;
      if (!gradingResult) {
        skippedCount++;
        continue;
      }

      let isModified = false;
      const updatedResult = JSON.parse(JSON.stringify(gradingResult));

      const acceptedSummary = updatedResult.accepted_summary || {};
      const rejectedSummary = updatedResult.rejected_summary || {};

      // Check MATANG and LEWAT MATANG in rejected_summary
      const targetClasses = ["MATANG", "LEWAT MATANG"];

      for (const cls of targetClasses) {
        if (rejectedSummary[cls] && (rejectedSummary[cls]["TANGKAI PANJANG"] || 0) > 0) {
          const tpCount = rejectedSummary[cls]["TANGKAI PANJANG"];

          // Initialize accepted_summary for cls if not existing
          if (!acceptedSummary[cls]) {
            acceptedSummary[cls] = {
              TOTAL: 0,
              NORMAL: 0,
              "TANGKAI PANJANG": 0,
              "RUSAK DIMAKAN TIKUS": 0,
              "BUAH KECIL DIBAWAH 3KG": 0,
              "BUAH KECIL DIBAWAH 5KG": 0,
              "BUAH BESAR": 0,
            };
          }

          // Move tpCount from rejected to accepted
          acceptedSummary[cls]["TANGKAI PANJANG"] = (acceptedSummary[cls]["TANGKAI PANJANG"] || 0) + tpCount;
          acceptedSummary[cls]["TOTAL"] = (acceptedSummary[cls]["TOTAL"] || 0) + tpCount;

          rejectedSummary[cls]["TANGKAI PANJANG"] = (rejectedSummary[cls]["TANGKAI PANJANG"] || 0) - tpCount;
          rejectedSummary[cls]["TOTAL"] = (rejectedSummary[cls]["TOTAL"] || 0) - tpCount;

          if (rejectedSummary[cls]["TOTAL"] <= 0) {
            delete rejectedSummary[cls];
          }

          isModified = true;
        }
      }

      // Recalculate total_accepted and total_rejected
      const newTotalAccepted = Object.keys(acceptedSummary).reduce(
        (sum, key) => sum + Number(acceptedSummary[key]?.TOTAL || 0),
        0
      );
      const newTotalRejected = Object.keys(rejectedSummary).reduce(
        (sum, key) => sum + Number(rejectedSummary[key]?.TOTAL || 0),
        0
      );

      if (updatedResult.total_accepted !== newTotalAccepted || updatedResult.total_rejected !== newTotalRejected) {
        updatedResult.total_accepted = newTotalAccepted;
        updatedResult.total_rejected = newTotalRejected;
        isModified = true;
      }

      updatedResult.accepted_summary = acceptedSummary;
      updatedResult.rejected_summary = rejectedSummary;

      // Handle fined detection for TANGKAI PANJANG
      const hasLongStashFinedKg =
        (ins.long_stash_fined_in_kg && Number(ins.long_stash_fined_in_kg) > 0) ||
        (ins.long_stash_e_fined_in_kg && Number(ins.long_stash_e_fined_in_kg) > 0) ||
        (ins.long_stash_m_fined_in_kg && Number(ins.long_stash_m_fined_in_kg) > 0);

      const finedSummary = updatedResult.fined_summary || {};

      // Sum all TANGKAI PANJANG in accepted_summary
      const totalAcceptedTP = Object.keys(acceptedSummary).reduce(
        (sum, key) => sum + Number(acceptedSummary[key]?.["TANGKAI PANJANG"] || 0),
        0
      );

      if (hasLongStashFinedKg) {
        const existingDenda = finedSummary["TANGKAI PANJANG"]?.DENDA ?? 0;
        if (!finedSummary["TANGKAI PANJANG"] || finedSummary["TANGKAI PANJANG"].TOTAL !== totalAcceptedTP) {
          finedSummary["TANGKAI PANJANG"] = {
            TOTAL: totalAcceptedTP,
            DENDA: existingDenda,
          };
          isModified = true;
        }
      } else {
        // If not fined for long stash, remove TANGKAI PANJANG from fined_summary if present
        if (finedSummary["TANGKAI PANJANG"]) {
          delete finedSummary["TANGKAI PANJANG"];
          isModified = true;
        }
      }

      updatedResult.fined_summary = finedSummary;

      // Recalculate total_fined
      const newTotalFined = Object.keys(finedSummary).reduce(
        (sum, key) => sum + Number(finedSummary[key]?.TOTAL || 0),
        0
      );

      if (updatedResult.total_fined !== newTotalFined) {
        updatedResult.total_fined = newTotalFined;
        isModified = true;
      }

      if (isModified) {
        updatedCount++;
        await InspectionDataModel.updateOne(
          { _id: ins._id },
          { $set: { grading_result: updatedResult } }
        );
        console.log(`\n[UPDATED] Inspection ${ins._id} (${ins.inspection_code || ins.delivery_number})`);
        console.log(`  BEFORE: accepted=${gradingResult.total_accepted}, rejected=${gradingResult.total_rejected}, fined=${gradingResult.total_fined}`);
        console.log(`  AFTER:  accepted=${updatedResult.total_accepted}, rejected=${updatedResult.total_rejected}, fined=${updatedResult.total_fined}`);
      } else {
        skippedCount++;
      }
    }

    console.log(`\n=== Migration Summary ===`);
    console.log(`Total inspections found: ${inspections.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Unchanged/Skipped: ${skippedCount}`);

    console.log("\nDone");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
});
