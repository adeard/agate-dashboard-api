const XLSX = require('xlsx');
const dayjs = require('dayjs');
const InspectionDataModel = require('../models/inspection-data');
const connectToDatabase = require('../lib/db-connect');
const { countPercentage } = require('../utils/helpers');
const { scoringMultiplier } = require('../utils/enum');
require('dotenv').config();
require('dayjs/locale/id');

dayjs.locale('id');

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
  const excelData = [
    [
      'Tanggal',
      'Peringkat',
      'Truk',
      'Vendor',
      'Total Tandan',
      'Diterima',
      'Ditolak',
      'Didenda',
      'Matang',
      'Lewat Matang',
      'Mentah',
      'Janjang Kosong',
      'Buah Kecil',
      'Tangkai Panjang',
    ],
  ];

  let byDated = {};

  data.forEach((item, index) => {
    const date = dayjs(item.date).format('DD MMMM YYYY');
    const totalRejected = item['grading_result']['total_rejected'];
    const totalAccepted = item['grading_result']['total_accepted'];
    const totalFined = item['grading_result']['total_fined'];
    const totalTandan = item['grading_result']['total_tandan'];

    if (!byDated[date]) {
      byDated[date] = [];
    }
    const rejectedPercent = countPercentage(totalRejected, totalTandan);
    const acceptedPercent = countPercentage(totalAccepted, totalTandan);
    const finedPercent = countPercentage(totalFined, totalAccepted);

    item['rejected_percent'] = rejectedPercent;
    item['accepted_percent'] = acceptedPercent;
    item['fined_percent'] = finedPercent;

    let totalMatang = item['grading_result']['classification_summary']?.[
      'MATANG'
    ]
      ? item['grading_result']['classification_summary']['MATANG']?.['TOTAL'] -
        item['grading_result']['classification_summary']['MATANG'][
          'BUAH KECIL DIBAWAH 3KG'
        ] -
        item['grading_result']['classification_summary']['MATANG'][
          'BUAH KECIL DIBAWAH 5KG'
        ]
      : 0;
    let totalLewatMatang = item['grading_result']['classification_summary']?.[
      'MATANG'
    ]
      ? item['grading_result']['classification_summary']['LEWAT MATANG']?.[
          'TOTAL'
        ] -
        item['grading_result']['classification_summary']['LEWAT MATANG'][
          'BUAH KECIL DIBAWAH 3KG'
        ] -
        item['grading_result']['classification_summary']['LEWAT MATANG'][
          'BUAH KECIL DIBAWAH 5KG'
        ]
      : 0;

    let totalMentah = item['grading_result']['classification_summary']?.[
      'MENTAH'
    ]
      ? item['grading_result']['classification_summary']['MENTAH']?.['TOTAL'] -
        item['grading_result']['classification_summary']['MENTAH'][
          'BUAH KECIL DIBAWAH 3KG'
        ] -
        item['grading_result']['classification_summary']['MENTAH'][
          'BUAH KECIL DIBAWAH 5KG'
        ]
      : 0;
    let totalJanjangKosong = item['grading_result']['classification_summary']?.[
      'JANJANG KOSONG'
    ]
      ? item['grading_result']['classification_summary']['JANJANG KOSONG'][
          'TOTAL'
        ] -
        item['grading_result']['classification_summary']['JANJANG KOSONG'][
          'BUAH KECIL DIBAWAH 3KG'
        ] -
        item['grading_result']['classification_summary']['JANJANG KOSONG'][
          'BUAH KECIL DIBAWAH 5KG'
        ]
      : 0;
    let totalBuahKecil = Object.keys(
      item['grading_result']['classification_summary']
    ).reduce((num, key) => {
      let curr = item['grading_result']['classification_summary'][key];

      return (
        num +
        Number(curr['BUAH KECIL DIBAWAH 3KG']) +
        Number(curr['BUAH KECIL DIBAWAH 5KG'])
      );
    }, 0);
    let totalTangkaiPanjang = Object.keys(
      item['grading_result']['classification_summary']
    ).reduce((num, key) => {
      let curr = item['grading_result']['classification_summary'][key];

      return num + Number(curr['TANGKAI PANJANG']);
    }, 0);

    const modifiedItem = {
      vehicle_number: item.vehicle_number,
      vendor_name: item.vendor_name,
      total: totalTandan,
      rejected_percent: rejectedPercent.toFixed(2),
      rejected: totalRejected,
      fined_percent: finedPercent.toFixed(2),
      fined: totalFined,
      accepted_percent: acceptedPercent.toFixed(2),
      accepted: totalAccepted,
      mentah: {
        count: totalMentah,
        percentage: countPercentage(totalMentah, totalTandan).toFixed(1),
      },
      janjang_kosong: {
        count: totalJanjangKosong,
        percentage: countPercentage(totalJanjangKosong, totalTandan).toFixed(1),
      },
      buah_kecil: {
        count: totalBuahKecil,
        percentage: countPercentage(totalBuahKecil, totalTandan).toFixed(1),
      },
      matang: {
        count: totalMatang,
        percentage: countPercentage(totalMatang, totalTandan).toFixed(1),
      },
      lewat_matang: {
        count: totalLewatMatang,
        percentage: countPercentage(totalLewatMatang, totalTandan).toFixed(1),
      },
      tangkai_panjang: {
        count: totalTangkaiPanjang,
        percentage: countPercentage(totalTangkaiPanjang, totalTandan).toFixed(
          1
        ),
      },
    };

    let scoring = Object.keys(scoringMultiplier).reduce((obj, key) => {
      if (!obj[key]) {
        obj[key] =
          Number(modifiedItem[key].count) * Number(scoringMultiplier[key]);
      }
      return obj;
    }, {});
    let finalScore = Object.keys(scoring).reduce(
      (num, k) => num + Number(scoring[k]),
      0
    );

    modifiedItem['final_score'] = finalScore;

    byDated[date].push(modifiedItem);

  });

  byDated = Object.keys(byDated).reduce((obj, key) => {
    obj[key] = byDated[key].sort((a, b) => a.final_score - b.final_score);

    obj[key] = obj[key].slice(0, 5);
    return obj;
  }, byDated);

  Object.keys(byDated).forEach((keyDate) => {
    let rankData = byDated[keyDate];

    rankData.forEach((itemData, index) => {
      excelData.push([
        keyDate,
        `${index + 1}`,
        `${itemData?.vehicle_number}`,
        itemData?.vendor_name,
        `${itemData?.total}`,
        `${itemData?.accepted} (${itemData?.accepted_percent}%)`,
        `${itemData?.rejected} (${itemData?.rejected_percent}%)`,
        `${itemData?.fined} (${itemData?.fined_percent}%)`,
        `${itemData?.matang?.count || 0} (${
          itemData?.matang?.percentage || 0
        }%)`,
        `${itemData?.lewat_matang?.count || 0} (${
          itemData?.lewat_matang?.percentage || 0
        }%)`,
        `${itemData?.mentah?.count || 0} (${
          itemData?.mentah?.percentage || 0
        }%)`,
        `${itemData?.janjang_kosong?.count || 0} (${
          itemData?.janjang_kosong?.percentage || 0
        }%)`,
        `${itemData?.buah_kecil?.count || 0} (${
          itemData?.buah_kecil?.percentage || 0
        }%)`,
        `${itemData?.tangkai_panjang?.count || 0} (${
          itemData?.tangkai_panjang?.percentage || 0
        }%)`,
      ]);
    });
  });

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

  console.log('Done');
  process.exit(1);
});

// Run the function with a specific date
