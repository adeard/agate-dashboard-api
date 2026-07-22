require("dotenv").config();
const connectToDatabase = require("../lib/db-connect");
const FactoryModel = require("../models/factory");
const InspectionDataModel = require("../models/inspection-data");
const path = require("path");
const dayjs = require("dayjs");
const XLSX = require("xlsx");

// === CONFIGURATION ===
// Set your desired date range here (YYYY-MM-DD)
const START_DATE_STR = "2026-07-08";
const END_DATE_STR = "2026-07-22";
// =====================

async function main() {
  try {
    await connectToDatabase();
    console.log(`Generating Factory-Wide Grading Duration Report for SWK`);
    console.log(`Date Range: ${START_DATE_STR} to ${END_DATE_STR}`);

    const factory = await FactoryModel.findOne({ name: "SWK" });
    if (!factory) {
      console.error("Factory SWK not found.");
      process.exit(1);
    }

    const startDate = dayjs(START_DATE_STR).startOf("day").toDate();
    const endDate = dayjs(END_DATE_STR).endOf("day").toDate();

    const inspections = await InspectionDataModel.find({
      factory: factory._id,
      date: { $gte: startDate, $lte: endDate },
      finish_date: { $exists: true, $ne: null },
    })
      .sort({ date: 1 })
      .lean();

    console.log(
      `Found ${inspections.length} completed inspections in this period.`,
    );

    if (inspections.length === 0) {
      console.log("No data to process.");
      process.exit(0);
    }

    // Step 1: Merge overlapping intervals (Factory Wide)
    const mergedBlocks = [];
    let currentBlock = null;

    for (const insp of inspections) {
      const inspStart = dayjs(insp.date);
      const inspEnd = dayjs(insp.finish_date);
      const vendorName = insp.vendor_name || "UNKNOWN";
      const machine = insp.machine || "N/A";
      const vehicle = insp.vehicle_number || "N/A";

      if (!currentBlock) {
        currentBlock = {
          start: inspStart,
          end: inspEnd,
          vendors: new Set([vendorName]),
          machines: new Set([machine]),
          vehicles: new Set([vehicle]),
        };
      } else {
        if (
          inspStart.isBefore(currentBlock.end) ||
          inspStart.isSame(currentBlock.end)
        ) {
          // Overlaps or is contiguous, merge them
          if (inspEnd.isAfter(currentBlock.end)) {
            currentBlock.end = inspEnd;
          }
          currentBlock.vendors.add(vendorName);
          currentBlock.machines.add(machine);
          currentBlock.vehicles.add(vehicle);
        } else {
          // No overlap, push current and start new
          mergedBlocks.push(currentBlock);
          currentBlock = {
            start: inspStart,
            end: inspEnd,
            vendors: new Set([vendorName]),
            machines: new Set([machine]),
            vehicles: new Set([vehicle]),
          };
        }
      }
    }
    // push the last one
    if (currentBlock) {
      mergedBlocks.push(currentBlock);
    }

    function getGradingDate(date) {
      const d = dayjs(date);
      // Shifts start at 07:00:00. Any time before 07:00:00 belongs to the previous day's grading date.
      if (d.hour() < 7) {
        return d.subtract(1, 'day').format('YYYY-MM-DD');
      }
      return d.format('YYYY-MM-DD');
    }

    // Step 2: Calculate durations and gaps, and generate Excel data
    const excelData = [
      [
        "No",
        "Grading Date",
        "Block Start Time",
        "Block End Time",
        "Active Duration (Minutes)",
        "Gap To Next Block (Minutes)",
        "Machines Used",
        "Vehicles Graded",
        "Vendors Graded",
      ],
    ];

    let totalActiveDurationMinutes = 0;
    let totalGapDurationMinutes = 0;

    for (let i = 0; i < mergedBlocks.length; i++) {
      const block = mergedBlocks[i];
      const gradingDate = getGradingDate(block.start);
      const activeDuration = block.end.diff(block.start, "minute", true);
      totalActiveDurationMinutes += activeDuration;

      let gapDuration = 0;
      if (i < mergedBlocks.length - 1) {
        const nextBlock = mergedBlocks[i + 1];
        // Only calculate gap if both ends belong to the same grading date
        if (getGradingDate(block.end) === getGradingDate(nextBlock.start)) {
          gapDuration = nextBlock.start.diff(block.end, "minute", true);
          totalGapDurationMinutes += gapDuration;
        }
      }

      const machinesArr = Array.from(block.machines).sort().join(" & ");
      const vehiclesArr = Array.from(block.vehicles).sort().join(" & ");
      const vendorsArr = Array.from(block.vendors).sort().join(" & ");

      excelData.push([
        i + 1,
        gradingDate,
        block.start.format("YYYY-MM-DD HH:mm:ss"),
        block.end.format("YYYY-MM-DD HH:mm:ss"),
        parseFloat(activeDuration.toFixed(2)),
        parseFloat(gapDuration.toFixed(2)),
        machinesArr,
        vehiclesArr,
        vendorsArr,
      ]);
    }

    // Export to Excel
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Duration Report");
    const outputPath = path.join(__dirname, "swk_duration_report.xlsx");
    XLSX.writeFile(workbook, outputPath);

    console.log(`\n--- SUMMARY ---`);
    console.log(
      `Total Active Grading Time: ${totalActiveDurationMinutes.toFixed(2)} minutes`,
    );
    console.log(
      `Total Empty/Gap Time: ${totalGapDurationMinutes.toFixed(2)} minutes`,
    );
    console.log(`Number of continuous grading blocks: ${mergedBlocks.length}`);
    console.log(`\nReport successfully saved to: ${outputPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error generating report:", error);
    process.exit(1);
  }
}

main();
