const XLSX = require('xlsx');
const dayjs = require('dayjs');
const InspectionDataModel = require('../models/inspection-data');
const connectToDatabase = require('../lib/db-connect');
const { countPercentage } = require('../utils/helpers');
require('dotenv').config();

const getDurationString = (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  // Calculate difference in milliseconds
  const diffMs = end.diff(start, 'milliseconds');

  // Convert to minutes and seconds
  const minutes = Math.floor(diffMs / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  // Build the duration string
  let durationString = '';

  if (minutes > 0) {
    durationString += `${minutes} menit`;
  }

  if (seconds > 0) {
    if (minutes > 0) durationString += ' ';
    durationString += `${seconds} detik`;
  }

  // Handle edge case of 0 duration
  if (durationString === '') {
    durationString = '0 detik';
  }

  return durationString;
};

async function generateExcel(targetDate) {
  // Parse the target date using dayjs
  const startDate = dayjs(targetDate).startOf('day'); // 6 AM on the target date
  const endDate = dayjs().add(-1, 'day').endOf('day'); // 3 AM the next day

  // Fetch data from MongoDB for the specific date range
  let data = await InspectionDataModel.find({
    date: {
      $gte: startDate.toDate(),
      $lt: endDate.toDate(),
    },
  })
    .sort({ date: 1 })
    .lean();

  if (data.length === 0) {
    console.log('No data found for the specified date range.');
    return;
  }

  data = data.filter(
    (e) =>
      e.grading_result.total_tandan > 200 && e.grading_result.total_rejected > 0
  );

  // Prepare the Excel data
  const excelData = [];

  const byDated = {};

  data.forEach((item, index) => {
    const date = dayjs(item.date).format('DD/MM/YYYY');
    const totalRejected = item['grading_result']['total_rejected'];

    if (!byDated[date]) {
      byDated[date] = {
        1: { rejected_percent: 0 },
        2: { rejected_percent: 0 },
        3: { rejected_percent: 0 },
        4: { rejected_percent: 0 },
        5: { rejected_percent: 0 },
      };
    }
    const rejectedPercent = countPercentage(
      totalRejected,
      item['grading_result']['total_tandan']
    );
    item['rejected_percent'] = rejectedPercent;

    let totalMentah = item['grading_result']['rejected_summary']?.['MENTAH']
      ? item['grading_result']['rejected_summary']['MENTAH']?.['TOTAL'] -
        item['grading_result']['rejected_summary']['MENTAH'][
          'BUAH KECIL DIBAWAH 3KG'
        ] -
        item['grading_result']['rejected_summary']['MENTAH'][
          'BUAH KECIL DIBAWAH 5KG'
        ]
      : 0;
    let totalJanjangKosong = item['grading_result']['rejected_summary']?.[
      'JANJANG KOSONG'
    ]
      ? item['grading_result']['rejected_summary']['JANJANG KOSONG']['TOTAL'] -
        item['grading_result']['rejected_summary']['JANJANG KOSONG'][
          'BUAH KECIL DIBAWAH 3KG'
        ] -
        item['grading_result']['rejected_summary']['JANJANG KOSONG'][
          'BUAH KECIL DIBAWAH 5KG'
        ]
      : 0;
    let totalBuahKecil = Object.keys(
      item['grading_result']['rejected_summary']
    ).reduce((num, key) => {
      let curr = item['grading_result']['rejected_summary'][key];

      return (
        num +
        Number(curr['BUAH KECIL DIBAWAH 3KG']) +
        Number(curr['BUAH KECIL DIBAWAH 5KG'])
      );
    }, 0);

    const modifiedItem = {
      vehicle_number: item.vehicle_number,
      vendor_name: item.vendor_name,
      rejected_percent: rejectedPercent.toFixed(2),
      rejected: item['grading_result']['total_rejected'],
      mentah: {
        count: totalMentah,
        percentage: countPercentage(totalMentah, totalRejected).toFixed(1),
      },
      janjang_kosong: {
        count: totalJanjangKosong,
        percentage: countPercentage(totalJanjangKosong, totalRejected).toFixed(
          1
        ),
      },
      buah_kecil: {
        count: totalBuahKecil,
        percentage: countPercentage(totalBuahKecil, totalRejected).toFixed(1),
      },
    };

    if (rejectedPercent > byDated[date][1]['rejected_percent']) {
      byDated[date][1] = modifiedItem;
    } else if (rejectedPercent > byDated[date][2]['rejected_percent']) {
      byDated[date][2] = modifiedItem;
    } else if (rejectedPercent > byDated[date][3]['rejected_percent']) {
      byDated[date][3] = modifiedItem;
    } else if (rejectedPercent > byDated[date][4]['rejected_percent']) {
      byDated[date][4] = modifiedItem;
    } else if (rejectedPercent > byDated[date][5]['rejected_percent']) {
      byDated[date][5] = modifiedItem;
    } else {
      return;
    }
  });

  // console.log({ byDated: JSON.stringify(byDated, null, 1) });
  // return;

  Object.keys(byDated).forEach((keyDate) => {
    let rankData = byDated[keyDate];

    excelData.push([keyDate]);
    excelData.push([
      'Peringkat',
      'Truk',
      'Ditolak',
      'Mentah',
      'Janjang Kosong',
      'Buah Kecil',
    ]);

    Object.keys(rankData).forEach((keyRank) => {
      const itemData = rankData[keyRank];

      excelData.push([
        `${keyRank}`,
        `${itemData?.vehicle_number} (${itemData?.vendor_name})`,
        `${itemData?.rejected} (${itemData?.rejected_percent}%)`,
        `${itemData?.mentah?.count || 0} (${
          itemData?.mentah?.percentage || 0
        }%)`,
        `${itemData?.janjang_kosong?.count || 0} (${
          itemData?.janjang_kosong?.percentage || 0
        }%)`,
        `${itemData?.buah_kecil?.count || 0} (${
          itemData?.buah_kecil?.percentage || 0
        }%)`,
      ]);
    });

    excelData.push([]);
  });

  // console.log({ excelData });

  // return;

  // Create a worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);

  // Create a workbook and add the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rank');

  // Write the file
  XLSX.writeFile(workbook, 'Top5RejectReport.xlsx');
  console.log('Excel file generated successfully!');
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
  await generateExcel('01/01/2025').catch(console.error);
  // await generateExcel('01/23/2025').catch(console.error);
  // await generateExcel('01/24/2025').catch(console.error);
  // await generateExcel('01/25/2025').catch(console.error);

  console.log('Done');
  process.exit(1);
});

// Run the function with a specific date
