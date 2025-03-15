const XLSX = require('xlsx');
const dayjs = require('dayjs');
const InspectionDataModel = require('../models/inspection-data');
const connectToDatabase = require('../lib/db-connect');
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
  // const endDate = dayjs().add(-1, 'day').endOf('day'); // 3 AM the next day

  // Fetch data from MongoDB for the specific date range
  let data = await InspectionDataModel.find({
    date: {
      $gte: startDate.toDate(),
      // $lt: endDate.toDate(),
    },
  })
    .sort({ date: 1 })
    .lean();

  if (data.length === 0) {
    console.log('No data found for the specified date range.');
    return;
  }

  data = data.filter((e) => e.grading_result.total_tandan > 200);

  // Prepare the Excel data
  const excelData = [
    [
      'No',
      'Tanggal',
      "Mesin AGATE",
      'Surat Jalan',
      'Plat Nomor',
      'Mulai',
      'Selesai',
      'Durasi',
      'Jumlah Janjang',
      'TBS Diterima',
      'TBS Ditolak',
      'TBS Didenda',
      'Mentah',
      'Matang',
      'Lewat Matang',
      'Janjang Kosong',
      'Buah Kecil',
      'Tangkai Panjang',
      'Notes',
    ],
  ];

  data.forEach((item, index) => {
    const date = dayjs(item.date).format('DD/MM/YYYY');

    const vehicleNumber = item.vehicle_number;

    const start = dayjs(item.date);
    const end = dayjs(item.finish_date);

    const totalMatang =
      item.grading_result['classification_summary']['MATANG']['TOTAL'] -
      item.grading_result['classification_summary']['MATANG'][
        'BUAH KECIL DIBAWAH 3KG'
      ] -
      item.grading_result['classification_summary']['MATANG'][
        'BUAH KECIL DIBAWAH 5KG'
      ];
    const totalLewatMatang =
      item.grading_result['classification_summary']['LEWAT MATANG']['TOTAL'] -
      item.grading_result['classification_summary']['LEWAT MATANG'][
        'BUAH KECIL DIBAWAH 3KG'
      ] -
      item.grading_result['classification_summary']['LEWAT MATANG'][
        'BUAH KECIL DIBAWAH 5KG'
      ];
    const totalMentah =
      item.grading_result['classification_summary']['MENTAH']['TOTAL'] -
      item.grading_result['classification_summary']['MENTAH'][
        'BUAH KECIL DIBAWAH 3KG'
      ] -
      item.grading_result['classification_summary']['MENTAH'][
        'BUAH KECIL DIBAWAH 5KG'
      ];
    const totalJanjangKosong =
      item.grading_result['classification_summary']['JANJANG KOSONG']['TOTAL'] -
      item.grading_result['classification_summary']['JANJANG KOSONG'][
        'BUAH KECIL DIBAWAH 3KG'
      ] -
      item.grading_result['classification_summary']['JANJANG KOSONG'][
        'BUAH KECIL DIBAWAH 5KG'
      ];

    const { totalBuahKecil, totalTangkaiPanjang } = Object.keys(
      item.grading_result['classification_summary']
    ).reduce(
      (obj, key) => {
        const data = item['grading_result']['classification_summary'][key];

        obj['totalBuahKecil'] +=
          data['BUAH KECIL DIBAWAH 3KG'] + data['BUAH KECIL DIBAWAH 5KG'];
        obj['totalTangkaiPanjang'] += data['TANGKAI PANJANG'];

        return obj;
      },
      { totalBuahKecil: 0, totalTangkaiPanjang: 0 }
    );

    excelData.push([
      index + 1,
      date,
      String(item.machine).padStart(2, "0"),
      item.delivery_number,
      vehicleNumber,
      dayjs(item.date).format('HH:mm:ss'),
      dayjs(item.finish_date).format('HH:mm:ss'),
      getDurationString(start, end),
      item.grading_result.total_tandan + ' Jjg',
      item.grading_result.total_accepted +
        ` (${countPercentage(
          item.grading_result.total_accepted,
          item.grading_result.total_tandan
        ).toFixed(2)}%)`,
      item.grading_result.total_rejected +
        ` (${countPercentage(
          item.grading_result.total_rejected,
          item.grading_result.total_tandan
        ).toFixed(2)}%)`,
      item.grading_result.total_fined +
        ` (${countPercentage(
          item.grading_result.total_fined,
          item.grading_result.total_accepted
        ).toFixed(2)}%)`,

      totalMentah +
        ` (${countPercentage(
          totalMentah,
          item.grading_result.total_tandan
        ).toFixed(2)}%)`,
      totalMatang +
        ` (${countPercentage(
          totalMatang,
          item.grading_result.total_tandan
        ).toFixed(2)}%)`,
      totalLewatMatang +
        ` (${countPercentage(
          totalLewatMatang,
          item.grading_result.total_tandan
        ).toFixed(2)}%)`,
      totalJanjangKosong +
        ` (${countPercentage(
          totalJanjangKosong,
          item.grading_result.total_tandan
        ).toFixed(2)}%)`,
      totalBuahKecil +
        ` (${countPercentage(
          totalBuahKecil,
          item.grading_result.total_tandan
        ).toFixed(2)}%)`,
      totalTangkaiPanjang +
        ` (${countPercentage(
          totalTangkaiPanjang,
          item.grading_result.total_tandan
        ).toFixed(2)}%)`,
      '',
    ]);
  });

  // Create a worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);

  // Create a workbook and add the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

  // Write the file
  XLSX.writeFile(workbook, 'CommisioningReport.xlsx');
  console.log('Excel file generated successfully!');
}

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
  await generateExcel('03/13/2025').catch(console.error);
  // await generateExcel('01/23/2025').catch(console.error);
  // await generateExcel('01/24/2025').catch(console.error);
  // await generateExcel('01/25/2025').catch(console.error);

  console.log('Done');
  process.exit(1);
});

// Run the function with a specific date
