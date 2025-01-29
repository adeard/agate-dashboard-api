const XLSX = require('xlsx');
const dayjs = require('dayjs');
const InspectionDataModel = require('../models/inspection-data');
const connectToDatabase = require('../lib/db-connect');
require('dotenv').config();

// async function generateExcel(targetDate) {
//   // Parse the target date using dayjs
//   const startDate = dayjs(targetDate).startOf('day').add(6, 'hour'); // 6 AM on the target date
//   const endDate = dayjs(targetDate).add(1, 'day').startOf('day').add(3, 'hour'); // 3 AM the next day

//   // Fetch data from MongoDB for the specific date range
//   const data = await InspectionDataModel.find({
//     date: {
//       $gte: startDate.toDate(),
//       $lt: endDate.toDate(),
//     },
//   }).lean();

//   if (data.length === 0) {
//     console.log('No data found for the specified date range.');
//     return;
//   }

//   // Prepare the Excel data
//   const excelData = [];

//   // Dynamically generate headers based on the data
//   const headers = ['Tanggal', 'HIGHEST', 'LOWEST', 'AVERAGE'];
//   const subHeaders = ['Plat Nomor', '', '', ''];

//   data.forEach((item) => {
//     const date = dayjs(item.date).format('MM/DD/YYYY');
//     const vehicleNumber = item.vehicle_number;
//     headers.push(`${date} ${vehicleNumber}`);
//     subHeaders.push('');
//   });

//   excelData.push(headers);
//   excelData.push(subHeaders);

//   // Add rows for each vehicle
//   const rowNames = [
//     'Plat Nomor',
//     'Nomor Mesin',
//     'Gap Truk Sebelum',
//     'Start',
//     'Finish',
//     'Durasi',
//     'Total (Janjang)',
//     'Diterima (Janjang)',
//     'Ditolak (Janjang)',
//     'Didenda (Janjang)',
//     'Didenda (Kg)',
//     'Diterima (%)',
//     'Ditolak (%)',
//     'Didenda (%)',
//   ];

//   rowNames.forEach((rowName, rowIndex) => {
//     const row = [rowName];

//     // Add HIGHEST, LOWEST, AVERAGE placeholders
//     if (rowIndex === 0) {
//       row.push('', '', '');
//     } else {
//       row.push('', '', '');
//     }

//     data.forEach((item) => {
//       switch (rowName) {
//         case 'Plat Nomor':
//           row.push(item.vehicle_number);
//           break;
//         case 'Nomor Mesin':
//           row.push(item.machine);
//           break;
//         case 'Gap Truk Sebelum':
//           const index = data.indexOf(item);
//           if (index > 0) {
//             const prevFinish = dayjs(data[index - 1].finish_date);
//             const currentStart = dayjs(item.date);
//             const gap = currentStart.diff(prevFinish, 'minute'); // Gap in minutes
//             row.push(formatTime(gap));
//           } else {
//             row.push('');
//           }
//           break;
//         case 'Start':
//           row.push(dayjs(item.date).format('HH:mm:ss'));
//           break;
//         case 'Finish':
//           row.push(dayjs(item.finish_date).format('HH:mm:ss'));
//           break;
//         case 'Durasi':
//           const duration = dayjs(item.finish_date).diff(
//             dayjs(item.date),
//             'minute'
//           ); // Duration in minutes
//           row.push(formatTime(duration));
//           break;
//         case 'Total (Janjang)':
//           row.push(item.grading_result.total_tandan);
//           break;
//         case 'Diterima (Janjang)':
//           row.push(item.grading_result.total_accepted);
//           break;
//         case 'Ditolak (Janjang)':
//           row.push(item.grading_result.total_rejected);
//           break;
//         case 'Didenda (Janjang)':
//           row.push(item.grading_result.total_fined);
//           break;
//         case 'Didenda (Kg)':
//           const finedKg = Object.values(
//             item.grading_result.fined_summary
//           ).reduce((sum, { TOTAL, DENDA }) => sum + TOTAL * DENDA, 0);
//           row.push(`${finedKg}kg`);
//           break;
//         case 'Diterima (%)':
//           const diterimaPercent =
//             (
//               (item.grading_result.total_accepted /
//                 item.grading_result.total_tandan) *
//               100
//             ).toFixed(2) + '%';
//           row.push(diterimaPercent);
//           break;
//         case 'Ditolak (%)':
//           const ditolakPercent =
//             (
//               (item.grading_result.total_rejected /
//                 item.grading_result.total_tandan) *
//               100
//             ).toFixed(2) + '%';
//           row.push(ditolakPercent);
//           break;
//         case 'Didenda (%)':
//           const didendaPercent =
//             (
//               (item.grading_result.total_fined /
//                 item.grading_result.total_accepted) *
//               100
//             ).toFixed(2) + '%';
//           row.push(didendaPercent);
//           break;
//         default:
//           row.push('');
//       }
//     });

//     excelData.push(row);
//   });

//   // Calculate HIGHEST, LOWEST, AVERAGE for each column
//   const columnsToCalculate = [
//     'Total (Janjang)',
//     'Diterima (Janjang)',
//     'Ditolak (Janjang)',
//     'Didenda (Janjang)',
//     'Didenda (Kg)',
//     'Diterima (%)',
//     'Ditolak (%)',
//     'Didenda (%)',
//   ];
//   columnsToCalculate.forEach((col, colIndex) => {
//     const values = excelData
//       .slice(2)
//       .map((row) => parseFloat(row[colIndex + 4])); // Skip headers and subheaders
//     const highest = Math.max(...values);
//     const lowest = Math.min(...values);
//     const average = (
//       values.reduce((sum, val) => sum + val, 0) / values.length
//     ).toFixed(2);

//     // Update HIGHEST, LOWEST, AVERAGE in the first row
//     excelData[0][colIndex + 1] = highest;
//     excelData[0][colIndex + 2] = lowest;
//     excelData[0][colIndex + 3] = average;
//   });

//   // Create a worksheet
//   const worksheet = XLSX.utils.aoa_to_sheet(excelData);

//   // Merge cells for headers
//   worksheet['!merges'] = [
//     { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Tanggal
//     { s: { r: 0, c: 1 }, e: { r: 0, c: 3 } }, // HIGHEST, LOWEST, AVERAGE
//   ];

//   // Create a workbook and add the worksheet
//   const workbook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspection Data');

//   // Write the file
//   XLSX.writeFile(workbook, 'Inspection_Report.xlsx');
//   console.log('Excel file generated successfully!');
// }

function countPercentage(number, total) {
  return Number(((number || 0) / (total || 1)) * 100);
}

function getStats(data) {
  const total = data.reduce((sum, value) => sum + value, 0);
  const average = total / data.length;
  const lowest = Math.min(...data);
  const highest = Math.max(...data);

  return {
    total: total,
    average: average,
    lowest: lowest,
    highest: highest,
  };
}

async function generateExcel(date) {
  try {
    const startDate = dayjs(date).startOf('day').add(6, 'hour');
    const endDate = dayjs(date).add(1, 'day').startOf('day').add(3, 'hour');

    const inspections = await InspectionDataModel.find({
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
    })
      .sort({ date: 1 })
      .lean();

    const formattedDate = dayjs(date).format('DD/MM/YYYY');

    const objectRowToAdd = {
      'Nomor Mesin': ['', '', ''],
      'Gap Truk Sebelum': ['', '', ''],
      Start: ['', '', ''],
      Finish: ['', '', ''],
      Durasi: ['', '', ''],
      'Total (Janjang)': ['', '', ''],
      'Diterima (Janjang)': ['', '', ''],
      'Ditolak (Janjang)': ['', '', ''],
      'Didenda (Janjang)': ['', '', ''],
      'Didenda (Kg)': ['', '', ''],
      'Diterima (%)': ['', '', ''],
      'Ditolak (%)': ['', '', ''],
      'Didenda (%)': ['', '', ''],
    };

    const lastFinishMachine = {};

    const { dateStringArray, vehicleNumberArray } = inspections.reduce(
      (obj, i) => {
        if (i.grading_result.total_tandan > 100) {
          if (i.vehicle_number !== 'B 1240 ALB') {
            obj['dateStringArray'].push(dayjs(i.date).format('DD/MM/YYYY'));
            obj['vehicleNumberArray'].push(i.vehicle_number);

            objectRowToAdd['Total (Janjang)'].push(
              i.grading_result.total_tandan || 0
            );
            objectRowToAdd['Diterima (Janjang)'].push(
              i.grading_result.total_accepted || 0
            );
            objectRowToAdd['Ditolak (Janjang)'].push(
              i.grading_result.total_rejected || 0
            );
            objectRowToAdd['Didenda (Janjang)'].push(
              i.grading_result.total_fined || 0
            );
            objectRowToAdd['Diterima (%)'].push(
              countPercentage(
                i.grading_result.total_accepted || 0,
                i.grading_result.total_tandan || 1
              )
            );
            objectRowToAdd['Ditolak (%)'].push(
              countPercentage(
                i.grading_result.total_rejected || 0,
                i.grading_result.total_tandan || 1
              )
            );
            objectRowToAdd['Didenda (%)'].push(
              countPercentage(
                i.grading_result.total_fined || 0,
                i.grading_result.total_accepted || 1
              )
            );

            const finedSummary = i.grading_result.fined_summary;

            const totalDidenda = finedSummary
              ? Object.keys(i.grading_result.fined_summary).reduce(
                  (curr, key) => {
                    const total = finedSummary[key]['TOTAL'] || 0;
                    const denda = finedSummary[key]['DENDA'] || 0;

                    return curr + total * denda;
                  },
                  0
                )
              : 0;
            objectRowToAdd['Didenda (Kg)'].push(totalDidenda);

            const start = dayjs(i.date);
            const finish = dayjs(i.finish_date);
            const gap = finish.diff(start, 'seconds');

            objectRowToAdd['Start'].push(String(start.format('HH:mm:ss')));
            objectRowToAdd['Finish'].push(String(finish.format('HH:mm:ss')));
            objectRowToAdd['Durasi'].push(gap);
            objectRowToAdd['Nomor Mesin'].push(i.machine);

            if (lastFinishMachine?.[i.machine]) {
              const different = dayjs(lastFinishMachine[i.machine]).diff(
                start,
                'seconds'
              );
              objectRowToAdd['Gap Truk Sebelum'].push(different);
              lastFinishMachine[i.machine] = finish;
            } else {
              objectRowToAdd['Gap Truk Sebelum'].push('');
              lastFinishMachine[i.machine] = finish;
            }
          }
        }

        return obj;
      },
      { dateStringArray: [], vehicleNumberArray: [] }
    );
    const headerRowOne = [
      formattedDate,
      'HIGHEST',
      'LOWEST',
      'AVERAGE',
      ...dateStringArray,
    ];
    const headerRowTwo = ['Plat Nomor', '', '', '', ...vehicleNumberArray];

    const allGap = objectRowToAdd['Gap Truk Sebelum']
      .filter(Boolean)
      .map((e) => Math.abs(e));
    const {
      highest: highestGap,
      lowest: lowestGap,
      average: averageGap,
    } = getStats(allGap);
    const allDurasi = objectRowToAdd['Durasi'].filter(Boolean);
    const {
      highest: highestDurasi,
      lowest: lowestDurasi,
      average: averageDurasi,
    } = getStats(allDurasi);

    const allTandan = objectRowToAdd['Total (Janjang)'].filter(Boolean);
    const {
      highest: highestTandan,
      lowest: lowestTandan,
      average: averageTandan,
    } = getStats(allTandan);
    const allAccepted = objectRowToAdd['Diterima (Janjang)'].filter(Boolean);
    const {
      highest: highestAccepted,
      lowest: lowestAccepted,
      average: averageAccepted,
    } = getStats(allAccepted);
    const allRejected = objectRowToAdd['Ditolak (Janjang)'].filter(Boolean);
    const {
      highest: highestRejected,
      lowest: lowestRejected,
      average: averageRejected,
    } = getStats(allRejected);
    const allFined = objectRowToAdd['Didenda (Janjang)'].filter(Boolean);
    const {
      highest: highestFined,
      lowest: lowestFined,
      average: averageFined,
    } = getStats(allFined);
    const allFinedKg = objectRowToAdd['Didenda (Kg)'].filter(Boolean);
    const {
      highest: highestFinedKg,
      lowest: lowestFinedKg,
      average: averageFinedKg,
    } = getStats(allFinedKg);
    const allFinedPercent = objectRowToAdd['Didenda (%)'].filter(Boolean);
    const {
      highest: highestFinedPercent,
      lowest: lowestFinedPercent,
      average: averageFinedPercent,
    } = getStats(allFinedPercent);
    const allAcceptedPercent = objectRowToAdd['Diterima (%)'].filter(Boolean);
    const {
      highest: highestAcceptedPercent,
      lowest: lowestAcceptedPercent,
      average: averageAcceptedPercent,
    } = getStats(allAcceptedPercent);
    const allRejectedPercent = objectRowToAdd['Ditolak (%)'].filter(Boolean);
    const {
      highest: highestRejectedPercent,
      lowest: lowestRejectedPercent,
      average: averageRejectedPercent,
    } = getStats(allRejectedPercent);

    objectRowToAdd['Gap Truk Sebelum'][0] = Math.round(highestGap);
    objectRowToAdd['Gap Truk Sebelum'][1] = Math.round(lowestGap);
    objectRowToAdd['Gap Truk Sebelum'][2] = Math.round(averageGap);

    objectRowToAdd['Durasi'][0] = Math.round(highestDurasi);
    objectRowToAdd['Durasi'][1] = Math.round(lowestDurasi);
    objectRowToAdd['Durasi'][2] = Math.round(averageDurasi);

    objectRowToAdd['Total (Janjang)'][0] = Math.round(highestTandan);
    objectRowToAdd['Total (Janjang)'][1] = Math.round(lowestTandan);
    objectRowToAdd['Total (Janjang)'][2] = Math.round(averageTandan);

    objectRowToAdd['Diterima (Janjang)'][0] = Math.round(highestAccepted);
    objectRowToAdd['Diterima (Janjang)'][1] = Math.round(lowestAccepted);
    objectRowToAdd['Diterima (Janjang)'][2] = Math.round(averageAccepted);

    objectRowToAdd['Ditolak (Janjang)'][0] = Math.round(highestRejected);
    objectRowToAdd['Ditolak (Janjang)'][1] = Math.round(lowestRejected);
    objectRowToAdd['Ditolak (Janjang)'][2] = Math.round(averageRejected);

    objectRowToAdd['Didenda (Janjang)'][0] = Math.round(highestFined);
    objectRowToAdd['Didenda (Janjang)'][1] = Math.round(lowestFined);
    objectRowToAdd['Didenda (Janjang)'][2] = Math.round(averageFined);

    objectRowToAdd['Didenda (Kg)'][0] = Math.round(highestFinedKg);
    objectRowToAdd['Didenda (Kg)'][1] = Math.round(lowestFinedKg);
    objectRowToAdd['Didenda (Kg)'][2] = Math.round(averageFinedKg);

    objectRowToAdd['Didenda (%)'][0] = highestFinedPercent;
    objectRowToAdd['Didenda (%)'][1] = lowestFinedPercent;
    objectRowToAdd['Didenda (%)'][2] = averageFinedPercent;

    objectRowToAdd['Diterima (%)'][0] = highestAcceptedPercent;
    objectRowToAdd['Diterima (%)'][1] = lowestAcceptedPercent;
    objectRowToAdd['Diterima (%)'][2] = averageAcceptedPercent;

    objectRowToAdd['Ditolak (%)'][0] = highestRejectedPercent;
    objectRowToAdd['Ditolak (%)'][1] = lowestRejectedPercent;
    objectRowToAdd['Ditolak (%)'][2] = averageRejectedPercent;

    objectRowToAdd['Gap Truk Sebelum'] = objectRowToAdd['Gap Truk Sebelum'].map(
      (v, i) => {
        if (v) {
          return formatTime(Math.abs(v));
        }

        return v;
      }
    );
    objectRowToAdd['Durasi'] = objectRowToAdd['Durasi'].map((v, i) => {
      if (v) {
        return formatTime(v);
      }

      return v;
    });
    objectRowToAdd['Didenda (Kg)'] = objectRowToAdd['Didenda (Kg)'].map(
      (v, i) => {
        if (v) {
          return v + 'kg';
        }

        return v;
      }
    );

    objectRowToAdd['Didenda (%)'] = objectRowToAdd['Didenda (%)'].map(
      (v, i) => {
        if (v) {
          return Number(v).toFixed(1) + '%';
        }

        return v;
      }
    );
    objectRowToAdd['Diterima (%)'] = objectRowToAdd['Diterima (%)'].map(
      (v, i) => {
        if (v) {
          return Number(v).toFixed(1) + '%';
        }

        return v;
      }
    );
    objectRowToAdd['Ditolak (%)'] = objectRowToAdd['Ditolak (%)'].map(
      (v, i) => {
        if (v) {
          return Number(v).toFixed(1) + '%';
        }

        return v;
      }
    );

    const rowsToAdd = Object.keys(objectRowToAdd).map((key) => [
      key,
      ...objectRowToAdd[key],
    ]);

    const excelData = [headerRowOne, headerRowTwo, ...rowsToAdd];

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    worksheet['!cols'] = [{ wpx: 150 }];
    worksheet['!rows'] = [
      {},
      {},
      { numFmt: 'hh:mm:ss' },
      { numFmt: 'hh:mm:ss' },
      { numFmt: 'hh:mm:ss' },
      { numFmt: 'hh:mm:ss' },
    ];
    worksheet['!merges'] = [
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
    ];

    // Create a workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspection Data');

    const namingDate = dayjs(date).format('DD_MM_YYYY');

    // Write the file
    XLSX.writeFile(workbook, `${namingDate} Daily.xlsx`);
    console.log('Excel file generated successfully!');
  } catch (err) {
    throw err;
  }
}

// Helper function to format time (minutes to HH:MM:SS)
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

connectToDatabase().then(async (res) => {
  console.log(res);
  await generateExcel('01/28/2025').catch(console.error);
  // await generateExcel('01/23/2025').catch(console.error);
  // await generateExcel('01/24/2025').catch(console.error);
  // await generateExcel('01/25/2025').catch(console.error);

  console.log('Done');
  process.exit(1);
});

// Run the function with a specific date
