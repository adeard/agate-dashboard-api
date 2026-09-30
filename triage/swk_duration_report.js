require("dotenv").config();
const connectToDatabase = require("../lib/db-connect");
const FactoryModel = require("../models/factory");
const InspectionDataModel = require("../models/inspection-data");
const path = require("path");
const dayjs = require("dayjs");
const XLSX = require("xlsx");

// === CONFIGURATION ===
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

    const validInspections = [];
    const mergedBlocks = [];
    let currentBlock = null;

    for (const insp of inspections) {
      const inspStart = dayjs(insp.date);
      const inspEnd = dayjs(insp.finish_date);
      const dur = inspEnd.diff(inspStart, "minute", true);

      if (dur > 240) {
        console.log(
          `Skipped anomalous inspection ${insp._id} (Duration: ${dur.toFixed(2)} mins, Vehicle: ${insp.vehicle_number})`,
        );
        continue;
      }

      validInspections.push(insp);

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
        return d.subtract(1, "day").format("YYYY-MM-DD");
      }
      return d.format("YYYY-MM-DD");
    }

    const summaryMap = new Map();

    // Populate totalTruck and totalTBS from validInspections first
    for (const insp of validInspections) {
      const gradingDate = getGradingDate(insp.date);
      if (!summaryMap.has(gradingDate)) {
        summaryMap.set(gradingDate, {
          totalTruck: 0,
          totalTBS: 0,
          activeDuration: 0,
          gapDuration: 0,
          blockCount: 0,
        });
      }
      const entry = summaryMap.get(gradingDate);
      entry.totalTruck += 1;
      entry.totalTBS += (insp.grading_result?.total_janjang || insp.grading_result?.total_tandan || 0);
    }

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

      if (!summaryMap.has(gradingDate)) {
        summaryMap.set(gradingDate, {
          totalTruck: 0,
          totalTBS: 0,
          activeDuration: 0,
          gapDuration: 0,
          blockCount: 0,
        });
      }

      const summaryEntry = summaryMap.get(gradingDate);
      summaryEntry.activeDuration += activeDuration;
      summaryEntry.gapDuration += gapDuration;
      summaryEntry.blockCount += 1;
    }

    const inspectionsByMachine = {};
    for (const insp of validInspections) {
      const m = insp.machine || 1;
      if (!inspectionsByMachine[m]) {
        inspectionsByMachine[m] = [];
      }
      inspectionsByMachine[m].push(insp);
    }

    const detailedInspections = [];
    for (const m in inspectionsByMachine) {
      const list = inspectionsByMachine[m];
      list.sort((a, b) => new Date(a.date) - new Date(b.date));
      for (let i = 0; i < list.length; i++) {
        const current = list[i];
        let gapDuration = 0;
        if (i < list.length - 1) {
          const next = list[i + 1];
          if (getGradingDate(current.finish_date) === getGradingDate(next.date)) {
            gapDuration = (new Date(next.date) - new Date(current.finish_date)) / 60000;
            if (gapDuration < 0) gapDuration = 0;
          }
        }
        detailedInspections.push({
          ...current,
          gapDuration,
        });
      }
    }

    // Sort detailed rows chronologically for output
    detailedInspections.sort((a, b) => new Date(a.date) - new Date(b.date));

    const detailedExcelData = [
      [
        "No",
        "Grading Date",
        "Start Time",
        "End Time",
        "Active Duration (Minutes)",
        "Gap To Next (Minutes)",
        "Machine",
        "Vehicle Number",
        "Vendor Name",
      ],
    ];

    detailedInspections.forEach((insp, index) => {
      const start = dayjs(insp.date);
      const end = dayjs(insp.finish_date);
      const activeDuration = end.diff(start, "minute", true);
      detailedExcelData.push([
        index + 1,
        getGradingDate(insp.date),
        start.format("YYYY-MM-DD HH:mm:ss"),
        end.format("YYYY-MM-DD HH:mm:ss"),
        parseFloat(activeDuration.toFixed(2)),
        parseFloat(insp.gapDuration.toFixed(2)),
        insp.machine || "N/A",
        insp.vehicle_number || "N/A",
        insp.vendor_name || "UNKNOWN",
      ]);
    });

    const summaryExcelData = [
      [
        "No",
        "Date",
        "Total Truck",
        "Total TBS",
        "Active Duration (Mins)",
        "Gap To Next Truck (Mins)",
        "Total Duration (Mins)",
        "Active %",
        "Idle %",
        "Avg Active (Mins)",
        "Avg Idle (Mins)",
      ],
    ];

    const sortedGradingDates = Array.from(summaryMap.keys()).sort();
    sortedGradingDates.forEach((gradingDate, index) => {
      const data = summaryMap.get(gradingDate);
      const totalDuration = data.activeDuration + data.gapDuration;
      const activePercent = totalDuration > 0 ? (data.activeDuration / totalDuration) * 100 : 0;
      const idlePercent = totalDuration > 0 ? (data.gapDuration / totalDuration) * 100 : 0;
      const avgActive = data.totalTruck > 0 ? (data.activeDuration / data.totalTruck) : 0;
      const avgIdle = data.totalTruck > 0 ? (data.gapDuration / data.totalTruck) : 0;

      summaryExcelData.push([
        index + 1,
        gradingDate,
        data.totalTruck,
        data.totalTBS,
        parseFloat(data.activeDuration.toFixed(2)),
        parseFloat(data.gapDuration.toFixed(2)),
        parseFloat(totalDuration.toFixed(2)),
        parseFloat(activePercent.toFixed(2)),
        parseFloat(idlePercent.toFixed(2)),
        parseFloat(avgActive.toFixed(2)),
        parseFloat(avgIdle.toFixed(2)),
      ]);
    });

    // Export to Excel with multiple sheets
    const workbook = XLSX.utils.book_new();

    const worksheet1 = XLSX.utils.aoa_to_sheet(summaryExcelData);
    XLSX.utils.book_append_sheet(workbook, worksheet1, "Summary Report");

    const worksheet2 = XLSX.utils.aoa_to_sheet(detailedExcelData);
    XLSX.utils.book_append_sheet(workbook, worksheet2, "Detailed Inspections");

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
