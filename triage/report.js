const XLSX = require('xlsx');
const dayjs = require('dayjs');
const InspectionDataModel = require('../models/inspection-data');
const connectToDatabase = require('../lib/db-connect');
require('dotenv').config();

const fs = require('fs');
const { getWeekNumber } = require('../utils/helpers');

require('dayjs/locale/id');
dayjs.locale('id');

const millisecondsToMinutes = (ms) => {
  return Math.floor(ms / (1000 * 60));
};

const getDurationStringFromMs = (ms) => {
  const minutes = Math.floor(ms / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

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

const getDurationMs = (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  // Calculate difference in milliseconds
  const diffMs = end.diff(start, 'milliseconds');

  // Convert to minutes and seconds
  return diffMs;
};

function countWeekdaysInRange(startDateStr, endDateStr) {
  const weekdays = [
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
    'Minggu',
  ];
  const counts = {
    Minggu: 0,
    Senin: 0,
    Selasa: 0,
    Rabu: 0,
    Kamis: 0,
    Jumat: 0,
    Sabtu: 0,
    Minggu: 0,
  };

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayIndex = d.getDay(); // 0: Minggu, 1: Senin, dst
    const dayName = weekdays[dayIndex];
    counts[dayName]++;
  }

  return counts;
}

function countDays(daysDateArray) {
  const dayCount = {
    Senin: 0,
    Selasa: 0,
    Rabu: 0,
    Kamis: 0,
    Jumat: 0,
    Sabtu: 0,
    Minggu: 0,
  };

  for (const item of daysDateArray) {
    if (dayCount[item.day] !== undefined) {
      dayCount[item.day]++;
    }
  }

  return dayCount;
}

async function generateExcel(targetDate, targetEnd) {
  // Parse the target date using dayjs
  const startDate = dayjs(targetDate).startOf('day').add(7, 'hour'); // 6 AM on the target date
  const endDate = dayjs(targetEnd).add(1, 'day').startOf('day').add(3, 'hour'); // 3 AM the next day

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
      e.grading_result?.total_tandan > 210 &&
      e.vehicle_number !== 'BH 1240 ALB' &&
      e.vendor_name !== 'Vendor 2 Plasma' &&
      e.vendor_name !== 'Vendor B'
  );

  const periodString = `${dayjs(targetDate).format('MMMM YYYY')} - ${dayjs(
    targetEnd
  ).format('MMMM YYYY')}`;

  // Prepare the Excel data
  const rawDataExcel = [
    [periodString],
    [
      'No',
      'Tanggal',
      'Mesin AGATE',
      'Surat Jalan',
      'Plat Nomor',
      'Vendor',
      'Jumlah Janjang',
      'TBS Diterima',
      'TBS Ditolak',
      'TBS Didenda',
      'Mentah',
      'Matang',
      'Lewat Matang',
      'Janjang Kosong',
      'Buah Kecil <3kg',
      'Buah Kecil <5kg',
      'Tangkai Panjang',
    ],
  ];

  let totalAllTandan = 0;

  const avgWeek = {};
  const avgWeekDemography = {};
  const bestAcceptedTrucks = {};
  const hourDataReject = {
    before6pm: {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_trucks: 0,
      trucks: {},
    },
    after6pm: {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_trucks: 0,
      trucks: {},
    },
  };
  const totalJanjangObj = {
    '<600': {
      total_trucks: 0,
      trucks: {},
      vendors: {},
      total_janjang: 0,
      total_accepted: 0,
      matang: 0,
      lewat_matang: 0,
      tangkai_panjang: 0,
      mentah: 0,
      buah_kecil: 0,
      janjang_kosong: 0,
    },
    '<1000': {
      total_trucks: 0,
      trucks: {},
      vendors: {},
      total_janjang: 0,
      total_accepted: 0,
      matang: 0,
      lewat_matang: 0,
      tangkai_panjang: 0,
      mentah: 0,
      buah_kecil: 0,
      janjang_kosong: 0,
    },
    '>1000': {
      total_trucks: 0,
      trucks: {},
      vendors: {},
      total_janjang: 0,
      total_accepted: 0,
      matang: 0,
      lewat_matang: 0,
      tangkai_panjang: 0,
      mentah: 0,
      buah_kecil: 0,
      janjang_kosong: 0,
    },
  };
  const machineUtilityWeek = {};
  const avgVendor = {};

  const totalJanjangObjDuration = {
    '<600': {
      total_trucks: 0,
      trucks: {},
      vendors: {},
      total_janjang: 0,
      total_accepted: 0,
      matang: 0,
      lewat_matang: 0,
      tangkai_panjang: 0,
      mentah: 0,
      buah_kecil: 0,
      janjang_kosong: 0,
      duration: 0,
    },
    '<1000': {
      total_trucks: 0,
      trucks: {},
      vendors: {},
      total_janjang: 0,
      total_accepted: 0,
      matang: 0,
      lewat_matang: 0,
      tangkai_panjang: 0,
      mentah: 0,
      buah_kecil: 0,
      janjang_kosong: 0,
      duration: 0,
    },
    '>1000': {
      total_trucks: 0,
      trucks: {},
      vendors: {},
      total_janjang: 0,
      total_accepted: 0,
      matang: 0,
      lewat_matang: 0,
      tangkai_panjang: 0,
      mentah: 0,
      buah_kecil: 0,
      janjang_kosong: 0,
      duration: 0,
    },
  };

  const dailyTruckCount = {};

  let daysDateArray = [];

  data.forEach((item, index) => {
    const date = dayjs(item.date).format('DD/MM/YYYY');
    const month = dayjs(item.date).format('MMMM YYYY');
    const hour = dayjs(item.date).hour();
    const minute = dayjs(item.date).minute();
    const week = getWeekNumber(item.date);
    const day = dayjs(item.date).format('dddd');

    if (!daysDateArray.some((e) => e?.date === date)) {
      daysDateArray.push({ date: date, day });
    }

    const vehicleNumber = item.vehicle_number;
    const vendorName = item.vendor_name;

    totalAllTandan += item.grading_result['total_tandan'];

    const start = dayjs(item.date);
    const end = dayjs(item.finish_date);

    if (!dailyTruckCount[day]) {
      dailyTruckCount[day] = {
        '00': 0,
        '05': 0,
        10: 0,
        12: 0,
        14: 0,
        16: 0,
        18: 0,
        19: 0,
        21: 0,
        total_truk: 0,
        total_hari: 0,
      };
    }

    if (hour >= 0 && hour < 2) {
      dailyTruckCount[day]['00'] += 1;
    } else if (hour >= 5 && hour < 10) {
      dailyTruckCount[day]['05'] += 1;
    } else if (hour >= 10 && hour < 12) {
      dailyTruckCount[day]['10'] += 1;
    } else if (hour >= 12 && hour < 14) {
      dailyTruckCount[day]['12'] += 1;
    } else if (hour >= 14 && hour < 16) {
      dailyTruckCount[day]['14'] += 1;
    } else if (hour >= 16 && hour < 18) {
      dailyTruckCount[day]['16'] += 1;
    } else if (hour >= 18 && hour < 19) {
      dailyTruckCount[day]['18'] += 1;
    } else if (hour >= 19 && hour < 21) {
      dailyTruckCount[day]['19'] += 1;
    } else if (hour >= 19 && hour < 23 && minute < 59) {
      dailyTruckCount[day]['21'] += 1;
    }
    dailyTruckCount[day]['total_truk'] += 1;

    if (!avgWeek[week]) {
      avgWeek[week] = { accepted: [], rejected: [], fined: [] };
    }

    if (!avgWeekDemography[week]) {
      avgWeekDemography[week] = {
        accepted: {
          matang: [],
          lewat_matang: [],
          tangkai_panjang: [],
        },
        rejected: {
          mentah: [],
          janjang_kosong: [],
          buah_kecil: [],
        },
      };
    }

    if (!machineUtilityWeek[week]) {
      machineUtilityWeek[week] = {
        total_trucks: 0,
        machine: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
        },
      };
    }

    machineUtilityWeek[week]['total_trucks'] += 1;
    machineUtilityWeek[week]['machine'][item.machine] += 1;

    if (!bestAcceptedTrucks[vehicleNumber]) {
      bestAcceptedTrucks[vehicleNumber] = {
        vendor: item.vendor_name,
        count: 0,
        tandan: 0,
        accepted: 0,
        matang: 0,
        lewat_matang: 0,
        tangkai_panjang: 0,
        mentah: 0,
        janjang_kosong: 0,
        buah_kecil: 0,
      };
    }

    if (!avgVendor[vendorName]) {
      avgVendor[vendorName] = {
        count: 0,
        tandan: 0,
        accepted: 0,
        matang: 0,
        lewat_matang: 0,
        tangkai_panjang: 0,
        mentah: 0,
        janjang_kosong: 0,
        buah_kecil: 0,
        trucks: {},
      };
    }

    if (!avgVendor[vendorName]['trucks'][vehicleNumber]) {
      avgVendor[vendorName]['trucks'][vehicleNumber] = {
        count: 0,
        tandan: 0,
        accepted: 0,
        matang: 0,
        lewat_matang: 0,
        tangkai_panjang: 0,
        mentah: 0,
        janjang_kosong: 0,
        buah_kecil: 0,
      };
    }

    const totalTandan = item.grading_result.total_tandan;

    const totalRejectedModified =
      Object.keys(item.grading_result['accepted_summary']).reduce(
        (n, k) =>
          n +
          Number(
            item.grading_result['accepted_summary'][k][
              'BUAH KECIL DIBAWAH 5KG'
            ] || 0
          ),
        0
      ) + Number(item.grading_result['total_rejected']);
    const totalAcceptedModified =
      Number(item.grading_result['total_accepted']) -
      Object.keys(item.grading_result['accepted_summary']).reduce(
        (n, k) =>
          n +
          Number(
            item.grading_result['accepted_summary'][k][
              'BUAH KECIL DIBAWAH 5KG'
            ] || 0
          ),
        0
      );

    const percentAccepted = countPercentage(
      totalAcceptedModified,
      item.grading_result['total_tandan']
    );
    const percentRejected = countPercentage(
      totalRejectedModified,
      item.grading_result['total_tandan']
    );
    const percentFined = countPercentage(
      item.grading_result['total_fined'],
      totalAcceptedModified
    );

    avgWeek[week]['accepted'].push(percentAccepted);
    avgWeek[week]['rejected'].push(percentRejected);
    avgWeek[week]['fined'].push(percentFined);

    if (percentRejected >= 25) {
      if (hour >= 7 && hour < 18) {
        hourDataReject['before6pm']['total_trucks'] += 1;
        hourDataReject['before6pm']['total_tandan'] +=
          item['grading_result']['total_tandan'];
        hourDataReject['before6pm']['total_accepted'] += totalAcceptedModified;
        hourDataReject['before6pm']['total_rejected'] += totalRejectedModified;

        if (!hourDataReject['before6pm']['trucks'][vehicleNumber]) {
          hourDataReject['before6pm']['trucks'][vehicleNumber] = {
            vendor_name: item.vendor_name,
            count: 0,
            percent_rejected: 0,
          };
        }

        hourDataReject['before6pm']['trucks'][vehicleNumber]['count'] += 1;
        hourDataReject['before6pm']['trucks'][vehicleNumber][
          'percent_rejected'
        ] += percentRejected;
      } else if (
        hour >= 18 ||
        (hour < 7 && dayjs(item.date).date() === endDate.date())
      ) {
        hourDataReject['after6pm']['total_trucks'] += 1;
        hourDataReject['after6pm']['total_tandan'] +=
          item['grading_result']['total_tandan'];
        hourDataReject['after6pm']['total_accepted'] += totalAcceptedModified;
        hourDataReject['after6pm']['total_rejected'] += totalRejectedModified;

        if (!hourDataReject['after6pm']['trucks'][vehicleNumber]) {
          hourDataReject['after6pm']['trucks'][vehicleNumber] = {
            vendor_name: item.vendor_name,
            count: 0,
            percent_rejected: 0,
          };
        }

        hourDataReject['after6pm']['trucks'][vehicleNumber]['count'] += 1;
        hourDataReject['after6pm']['trucks'][vehicleNumber][
          'percent_rejected'
        ] += percentRejected;
      }
    }

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

    const { totalBuahKecil3, totalBuahKecil5 } = Object.keys(
      item.grading_result['classification_summary']
    ).reduce(
      (obj, key) => {
        const data = item['grading_result']['classification_summary'][key];

        obj['totalBuahKecil3'] += data['BUAH KECIL DIBAWAH 3KG'];
        obj['totalBuahKecil5'] += data['BUAH KECIL DIBAWAH 5KG'];
        obj['totalTangkaiPanjang'] += data['TANGKAI PANJANG'];

        return obj;
      },
      { totalBuahKecil3: 0, totalBuahKecil5: 0 }
    );

    const { totalTangkaiPanjang } = Object.keys(
      item.grading_result['accepted_summary']
    ).reduce(
      (obj, key) => {
        const data = item['grading_result']['accepted_summary'][key];

        obj['totalTangkaiPanjang'] += data['TANGKAI PANJANG'];

        return obj;
      },
      { totalTangkaiPanjang: 0 }
    );

    const percentMatang = countPercentage(totalMatang, totalTandan);
    const percentLewatMatang = countPercentage(totalLewatMatang, totalTandan);
    const percentTangkaiPanjang = countPercentage(
      totalTangkaiPanjang,
      totalAcceptedModified
    );
    const percentMentah = countPercentage(totalMentah, totalTandan);
    const percentJangkos = countPercentage(totalJanjangKosong, totalTandan);
    const percentBuahKecil = countPercentage(
      totalBuahKecil3 + totalBuahKecil5,
      totalTandan
    );

    const duration = getDurationMs(item['date'], item['finish_date']);
    const durationMinute = millisecondsToMinutes(duration);

    if (totalTandan < 600) {
      totalJanjangObj['<600']['total_trucks'] += 1;
      totalJanjangObj['<600']['total_janjang'] += totalTandan;
      totalJanjangObj['<600']['total_accepted'] += totalAcceptedModified;
      totalJanjangObj['<600']['matang'] += totalMatang;
      totalJanjangObj['<600']['lewat_matang'] += totalLewatMatang;
      totalJanjangObj['<600']['tangkai_panjang'] += totalTangkaiPanjang;

      totalJanjangObj['<600']['mentah'] += totalMentah;
      totalJanjangObj['<600']['janjang_kosong'] += totalJanjangKosong;
      totalJanjangObj['<600']['buah_kecil'] +=
        totalBuahKecil3 + totalBuahKecil5;

      if (!totalJanjangObj['<600']['trucks'][vehicleNumber]) {
        totalJanjangObj['<600']['trucks'][vehicleNumber] = {
          vendor_name: item.vendor_name,
          count: 0,
        };
      }
      totalJanjangObj['<600']['trucks'][vehicleNumber]['count'] += 1;

      if (!totalJanjangObj['<600']['vendors'][vendorName]) {
        totalJanjangObj['<600']['vendors'][vendorName] = {
          vendor_name: item.vendor_name,
          count: 0,
        };
      }
      totalJanjangObj['<600']['vendors'][vendorName]['count'] += 1;

      if (durationMinute < 19) {
        totalJanjangObjDuration['<600']['total_trucks'] += 1;
        totalJanjangObjDuration['<600']['total_janjang'] += totalTandan;
        totalJanjangObjDuration['<600']['total_accepted'] +=
          totalAcceptedModified;
        totalJanjangObjDuration['<600']['matang'] += totalMatang;
        totalJanjangObjDuration['<600']['lewat_matang'] += totalLewatMatang;
        totalJanjangObjDuration['<600']['tangkai_panjang'] +=
          totalTangkaiPanjang;
        totalJanjangObjDuration['<600']['duration'] += duration;

        totalJanjangObjDuration['<600']['mentah'] += totalMentah;
        totalJanjangObjDuration['<600']['janjang_kosong'] += totalJanjangKosong;
        totalJanjangObjDuration['<600']['buah_kecil'] +=
          totalBuahKecil3 + totalBuahKecil5;

        if (!totalJanjangObjDuration['<600']['trucks'][vehicleNumber]) {
          totalJanjangObjDuration['<600']['trucks'][vehicleNumber] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObjDuration['<600']['trucks'][vehicleNumber]['count'] += 1;

        if (!totalJanjangObjDuration['<600']['vendors'][vendorName]) {
          totalJanjangObjDuration['<600']['vendors'][vendorName] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObjDuration['<600']['vendors'][vendorName]['count'] += 1;
      }
    } else if (totalTandan >= 600 && totalTandan <= 1000) {
      totalJanjangObj['<1000']['total_trucks'] += 1;
      totalJanjangObj['<1000']['total_janjang'] += totalTandan;
      totalJanjangObj['<1000']['total_accepted'] += totalAcceptedModified;
      totalJanjangObj['<1000']['matang'] += totalMatang;
      totalJanjangObj['<1000']['lewat_matang'] += totalLewatMatang;
      totalJanjangObj['<1000']['tangkai_panjang'] += totalTangkaiPanjang;

      totalJanjangObj['<1000']['mentah'] += totalMentah;
      totalJanjangObj['<1000']['janjang_kosong'] += totalJanjangKosong;
      totalJanjangObj['<1000']['buah_kecil'] +=
        totalBuahKecil3 + totalBuahKecil5;

      if (!totalJanjangObj['<1000']['trucks'][vehicleNumber]) {
        totalJanjangObj['<1000']['trucks'][vehicleNumber] = {
          vendor_name: item.vendor_name,
          count: 0,
        };
      }
      totalJanjangObj['<1000']['trucks'][vehicleNumber]['count'] += 1;

      if (!totalJanjangObj['<1000']['vendors'][vendorName]) {
        totalJanjangObj['<1000']['vendors'][vendorName] = {
          vendor_name: item.vendor_name,
          count: 0,
        };
      }
      totalJanjangObj['<1000']['vendors'][vendorName]['count'] += 1;

      if (durationMinute < 28) {
        totalJanjangObjDuration['<1000']['total_trucks'] += 1;
        totalJanjangObjDuration['<1000']['total_janjang'] += totalTandan;
        totalJanjangObjDuration['<1000']['total_accepted'] +=
          totalAcceptedModified;
        totalJanjangObjDuration['<1000']['matang'] += totalMatang;
        totalJanjangObjDuration['<1000']['lewat_matang'] += totalLewatMatang;
        totalJanjangObjDuration['<1000']['tangkai_panjang'] +=
          totalTangkaiPanjang;
        totalJanjangObjDuration['<1000']['duration'] += duration;

        totalJanjangObjDuration['<1000']['mentah'] += totalMentah;
        totalJanjangObjDuration['<1000']['janjang_kosong'] +=
          totalJanjangKosong;
        totalJanjangObjDuration['<1000']['buah_kecil'] +=
          totalBuahKecil3 + totalBuahKecil5;

        if (!totalJanjangObjDuration['<1000']['trucks'][vehicleNumber]) {
          totalJanjangObjDuration['<1000']['trucks'][vehicleNumber] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObjDuration['<1000']['trucks'][vehicleNumber]['count'] += 1;

        if (!totalJanjangObjDuration['<1000']['vendors'][vendorName]) {
          totalJanjangObjDuration['<1000']['vendors'][vendorName] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObjDuration['<1000']['vendors'][vendorName]['count'] += 1;
      }
    } else if (totalTandan > 1000) {
      totalJanjangObj['>1000']['total_trucks'] += 1;
      totalJanjangObj['>1000']['total_janjang'] += totalTandan;
      totalJanjangObj['>1000']['total_accepted'] += totalAcceptedModified;
      totalJanjangObj['>1000']['matang'] += totalMatang;
      totalJanjangObj['>1000']['lewat_matang'] += totalLewatMatang;
      totalJanjangObj['>1000']['tangkai_panjang'] += totalTangkaiPanjang;

      totalJanjangObj['>1000']['mentah'] += totalMentah;
      totalJanjangObj['>1000']['janjang_kosong'] += totalJanjangKosong;
      totalJanjangObj['>1000']['buah_kecil'] +=
        totalBuahKecil3 + totalBuahKecil5;

      if (!totalJanjangObj['>1000']['trucks'][vehicleNumber]) {
        totalJanjangObj['>1000']['trucks'][vehicleNumber] = {
          vendor_name: item.vendor_name,
          count: 0,
        };
      }
      totalJanjangObj['>1000']['trucks'][vehicleNumber]['count'] += 1;

      if (!totalJanjangObj['>1000']['vendors'][vendorName]) {
        totalJanjangObj['>1000']['vendors'][vendorName] = {
          vendor_name: item.vendor_name,
          count: 0,
        };
      }
      totalJanjangObj['>1000']['vendors'][vendorName]['count'] += 1;

      if (durationMinute < 36) {
        totalJanjangObjDuration['>1000']['total_trucks'] += 1;
        totalJanjangObjDuration['>1000']['total_janjang'] += totalTandan;
        totalJanjangObjDuration['>1000']['total_accepted'] +=
          totalAcceptedModified;
        totalJanjangObjDuration['>1000']['matang'] += totalMatang;
        totalJanjangObjDuration['>1000']['lewat_matang'] += totalLewatMatang;
        totalJanjangObjDuration['>1000']['tangkai_panjang'] +=
          totalTangkaiPanjang;
        totalJanjangObjDuration['>1000']['duration'] += duration;

        totalJanjangObjDuration['>1000']['mentah'] += totalMentah;
        totalJanjangObjDuration['>1000']['janjang_kosong'] +=
          totalJanjangKosong;
        totalJanjangObjDuration['>1000']['buah_kecil'] +=
          totalBuahKecil3 + totalBuahKecil5;

        if (!totalJanjangObjDuration['>1000']['trucks'][vehicleNumber]) {
          totalJanjangObjDuration['>1000']['trucks'][vehicleNumber] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObjDuration['>1000']['trucks'][vehicleNumber]['count'] += 1;

        if (!totalJanjangObjDuration['>1000']['vendors'][vendorName]) {
          totalJanjangObjDuration['>1000']['vendors'][vendorName] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObjDuration['>1000']['vendors'][vendorName]['count'] += 1;
      }
    }

    avgWeekDemography[week]['accepted']['matang'].push(percentMatang);
    avgWeekDemography[week]['accepted']['lewat_matang'].push(
      percentLewatMatang
    );
    avgWeekDemography[week]['accepted']['tangkai_panjang'].push(
      percentTangkaiPanjang
    );

    avgWeekDemography[week]['rejected']['mentah'].push(percentMentah);
    avgWeekDemography[week]['rejected']['janjang_kosong'].push(percentJangkos);
    avgWeekDemography[week]['rejected']['buah_kecil'].push(percentBuahKecil);

    bestAcceptedTrucks[vehicleNumber]['count'] += 1;
    bestAcceptedTrucks[vehicleNumber]['tandan'] += totalTandan;
    bestAcceptedTrucks[vehicleNumber]['accepted'] += percentAccepted;
    bestAcceptedTrucks[vehicleNumber]['matang'] += percentMatang;
    bestAcceptedTrucks[vehicleNumber]['lewat_matang'] += percentLewatMatang;
    bestAcceptedTrucks[vehicleNumber]['tangkai_panjang'] +=
      percentTangkaiPanjang;
    bestAcceptedTrucks[vehicleNumber]['mentah'] += percentMentah;
    bestAcceptedTrucks[vehicleNumber]['janjang_kosong'] += percentJangkos;
    bestAcceptedTrucks[vehicleNumber]['buah_kecil'] += percentBuahKecil;

    avgVendor[vendorName]['count'] += 1;
    avgVendor[vendorName]['tandan'] += totalTandan;
    avgVendor[vendorName]['accepted'] += percentAccepted;
    avgVendor[vendorName]['matang'] += percentMatang;
    avgVendor[vendorName]['lewat_matang'] += percentLewatMatang;
    avgVendor[vendorName]['tangkai_panjang'] += percentTangkaiPanjang;
    avgVendor[vendorName]['mentah'] += percentMentah;
    avgVendor[vendorName]['janjang_kosong'] += percentJangkos;
    avgVendor[vendorName]['buah_kecil'] += percentBuahKecil;

    avgVendor[vendorName]['trucks'][vehicleNumber]['count'] += 1;
    avgVendor[vendorName]['trucks'][vehicleNumber]['tandan'] += totalTandan;
    avgVendor[vendorName]['trucks'][vehicleNumber]['accepted'] +=
      percentAccepted;
    avgVendor[vendorName]['trucks'][vehicleNumber]['matang'] += percentMatang;
    avgVendor[vendorName]['trucks'][vehicleNumber]['lewat_matang'] +=
      percentLewatMatang;
    avgVendor[vendorName]['trucks'][vehicleNumber]['tangkai_panjang'] +=
      percentTangkaiPanjang;
    avgVendor[vendorName]['trucks'][vehicleNumber]['mentah'] += percentMentah;
    avgVendor[vendorName]['trucks'][vehicleNumber]['janjang_kosong'] +=
      percentJangkos;
    avgVendor[vendorName]['trucks'][vehicleNumber]['buah_kecil'] +=
      percentBuahKecil;

    rawDataExcel.push([
      index + 1,
      date,
      item.machine,
      item.delivery_number,
      vehicleNumber,
      item.vendor_name,
      item.grading_result.total_tandan,
      item.grading_result.total_accepted,
      item.grading_result.total_rejected,
      item.grading_result.total_fined,
      totalMentah,
      totalMatang,
      totalLewatMatang,
      totalJanjangKosong,
      totalBuahKecil3,
      totalBuahKecil5,
      totalTangkaiPanjang,
      '',
    ]);
  });

  const avgWeekData = [
    [periodString],
    ['Week', '% Diterima', '% Ditolak', '% Didenda'],
  ];
  Object.keys(avgWeek).forEach((week) => {
    let accepted = avgWeek[week]['accepted'];
    let rejected = avgWeek[week]['rejected'];
    let fined = avgWeek[week]['fined'];

    let acceptedAvg =
      accepted.reduce((n, c) => n + Number(c), 0) / accepted?.length;
    let rejectedAvg =
      rejected.reduce((n, c) => n + Number(c), 0) / rejected?.length;
    let finedAvg = fined.reduce((n, c) => n + Number(c), 0) / accepted?.length;

    avgWeekData.push([
      week,
      acceptedAvg.toFixed(2),
      rejectedAvg.toFixed(2),
      finedAvg.toFixed(2),
    ]);
  });
  avgWeekData.push(['** Didenda buah diterima yang memiliki tangkai panjang']);
  avgWeekData.push(['** Ditolak termasuk buah <5kg']);

  const avgWeekDemographyData = [
    [periodString],
    ['Week', 'Buah Diterima', '', '', 'Buah Ditolak', '', ''],
    ['', '% MM', '% LM', '% TP', '% M', '% JK', '% BK'],
  ];
  Object.keys(avgWeekDemography).forEach((week) => {
    let accepted = avgWeekDemography[week]['accepted'];
    let rejected = avgWeekDemography[week]['rejected'];
    const joined = { ...accepted, ...rejected };

    let temp = [week, '', '', '', '', '', '', ''];

    Object.keys(joined).forEach((key) => {
      const item = joined[key];
      let avg = item.reduce((n, c) => n + Number(c), 0) / item?.length;
      switch (key) {
        case 'matang':
          temp[1] = avg.toFixed(2);
          break;
        case 'lewat_matang':
          temp[2] = avg.toFixed(2);
          break;
        case 'tangkai_panjang':
          temp[3] = avg.toFixed(2);
          break;
        case 'mentah':
          temp[4] = avg.toFixed(2);
          break;
        case 'janjang_kosong':
          temp[5] = avg.toFixed(2);
          break;
        case 'buah_kecil':
          temp[6] = avg.toFixed(2);
          break;
      }
    });

    avgWeekDemographyData.push(temp);
  });

  const bestAcceptedTrucksData = [
    [periodString],
    [
      'No',
      'Plat Nomor',
      'Vendor',
      'Total Truk',
      'Kontribusi',
      'Avg Tandan',
      'Estimasi BJR',
      'Avg % Diterima',
      'Avg % MM',
      'Avg % LM',
      'Avg % TP',
      'Avg % M',
      'Avg % JK',
      'Avg % BK',
    ],
  ];
  Object.keys(bestAcceptedTrucks)
    .map((k) => ({
      truck: k,
      ...bestAcceptedTrucks[k],
      avg_accepted: Number(
        bestAcceptedTrucks[k]['accepted'] / bestAcceptedTrucks[k]['count']
      ),
    }))
    .sort((a, b) => b.avg_accepted - a.avg_accepted)
    .slice(0, 20)
    .forEach((item, idx) => {
      let count = item['count'];
      let avgTandan = Math.round(Number(item['tandan'] / count));

      let temp = [
        idx + 1,
        item.truck,
        item.vendor,
        count,
        countPercentage(item['tandan'], totalAllTandan).toFixed(2) + '%',
        avgTandan,
        Number(10000 / avgTandan).toFixed(2),
        Number(item['accepted'] / count).toFixed(2),
        Number(item['matang'] / count).toFixed(2),
        Number(item['lewat_matang'] / count).toFixed(2),
        Number(item['tangkai_panjang'] / count).toFixed(2),
        Number(item['mentah'] / count).toFixed(2),
        Number(item['janjang_kosong'] / count).toFixed(2),
        Number(item['buah_kecil'] / count).toFixed(2),
      ];

      bestAcceptedTrucksData.push(temp);
    });
  bestAcceptedTrucksData.push([
    '** Kontribusi merupakan persentase terhadap keseluruhan truk dalam Januari - Maret 2025',
  ]);

  const worstAcceptedTrucksData = [
    [periodString],
    [
      'No',
      'Plat Nomor',
      'Vendor',
      'Total Truk',
      'Kontribusi',
      'Avg Tandan',
      'Estimasi BJR',
      'Avg % Diterima',
      'Avg % MM',
      'Avg % LM',
      'Avg % TP',
      'Avg % M',
      'Avg % JK',
      'Avg % BK',
    ],
  ];
  Object.keys(bestAcceptedTrucks)
    .map((k) => ({
      truck: k,
      ...bestAcceptedTrucks[k],
      avg_accepted: Number(
        bestAcceptedTrucks[k]['accepted'] / bestAcceptedTrucks[k]['count']
      ),
    }))
    .sort((a, b) => a.avg_accepted - b.avg_accepted)
    .slice(0, 20)
    .forEach((item, idx) => {
      let count = item['count'];
      let avgTandan = Math.round(Number(item['tandan'] / count));

      let temp = [
        idx + 1,
        item.truck,
        item.vendor,
        count,
        countPercentage(item['tandan'], totalAllTandan).toFixed(2) + '%',
        avgTandan,
        Number(10000 / avgTandan).toFixed(2),
        Number(item['accepted'] / count).toFixed(2),
        Number(item['matang'] / count).toFixed(2),
        Number(item['lewat_matang'] / count).toFixed(2),
        Number(item['tangkai_panjang'] / count).toFixed(2),
        Number(item['mentah'] / count).toFixed(2),
        Number(item['janjang_kosong'] / count).toFixed(2),
        Number(item['buah_kecil'] / count).toFixed(2),
      ];

      worstAcceptedTrucksData.push(temp);
    });
  worstAcceptedTrucksData.push([
    '** Kontribusi merupakan persentase terhadap keseluruhan truk dalam Januari - Maret 2025',
  ]);

  const hourDataRejectData = [
    [periodString],
    ['No', 'Kategori', '% Diterima', '% Ditolak'],
  ];
  hourDataRejectData.push([
    1,
    '07:00 - 18:00',
    countPercentage(
      hourDataReject['before6pm'].total_accepted,
      hourDataReject['before6pm'].total_tandan
    ).toFixed(2),
    countPercentage(
      hourDataReject['before6pm'].total_rejected,
      hourDataReject['before6pm'].total_tandan
    ).toFixed(2),
  ]);
  hourDataRejectData.push([
    2,
    '18:00 - 03:00',
    countPercentage(
      hourDataReject['after6pm'].total_accepted,
      hourDataReject['after6pm'].total_tandan
    ).toFixed(2),
    countPercentage(
      hourDataReject['after6pm'].total_rejected,
      hourDataReject['after6pm'].total_tandan
    ).toFixed(2),
  ]);
  hourDataRejectData.push(['']);
  Object.keys(hourDataReject).forEach((category, idx) => {
    const item = hourDataReject[category];
    const categoryTime =
      category === 'before6pm' ? '07:00 - 18:00' : '18:00 - 03:00';
    hourDataRejectData.push([`Truk Grading ${categoryTime}`]);
    hourDataRejectData.push([
      'No',
      'Plat Nomor',
      'Vendor',
      'Total',
      'Kontribusi',
    ]);
    Object.keys(item.trucks)
      .map((k) => ({
        vehicle_number: k,
        ...item.trucks[k],
      }))
      .sort((a, b) => b.percent_rejected - a.percent_rejected)
      .slice(0, 10)
      .forEach((t, idx) => {
        hourDataRejectData.push([
          idx + 1,
          t.vehicle_number,
          t.vendor_name,
          t.count + 'x',
          countPercentage(t.count, item.total_trucks).toFixed(2) + '%',
        ]);
      });

    hourDataRejectData.push(['']);
  });

  const totalJanjangData = [
    [periodString],
    [
      'No',
      'Kategori',
      'Estimasi BJR',
      'Total Truk',
      'Kontribusi',
      'Total Janjang',
      '% Diterima',
      '% Matang',
      '% Lewat Matang',
      '% Tangkai Panjang',
      '% Mentah',
      '% Janjang Kosong',
      '% Buah Kecil',
    ],
  ];
  totalJanjangData.push([
    1,
    '400 - 600 Janjang',
    '16 - 30kg',
    totalJanjangObj['<600'].total_trucks,
    countPercentage(totalJanjangObj['<600'].total_trucks, data?.length).toFixed(
      2
    ),
    totalJanjangObj['<600'].total_janjang,
    countPercentage(
      totalJanjangObj['<600'].total_accepted,
      totalJanjangObj['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<600'].matang,
      totalJanjangObj['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<600'].lewat_matang,
      totalJanjangObj['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<600'].tangkai_panjang,
      totalJanjangObj['<600'].total_accepted
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<600'].mentah,
      totalJanjangObj['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<600'].janjang_kosong,
      totalJanjangObj['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<600'].buah_kecil,
      totalJanjangObj['<600'].total_janjang
    ).toFixed(2),
  ]);
  totalJanjangData.push([
    2,
    '601 - 1000 Janjang',
    '10 - 15kg',
    totalJanjangObj['<1000'].total_trucks,
    countPercentage(
      totalJanjangObj['<1000'].total_trucks,
      data?.length
    ).toFixed(2),
    totalJanjangObj['<1000'].total_janjang,
    countPercentage(
      totalJanjangObj['<1000'].total_accepted,
      totalJanjangObj['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<1000'].matang,
      totalJanjangObj['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<1000'].lewat_matang,
      totalJanjangObj['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<1000'].tangkai_panjang,
      totalJanjangObj['<1000'].total_accepted
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<1000'].mentah,
      totalJanjangObj['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<1000'].janjang_kosong,
      totalJanjangObj['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['<1000'].buah_kecil,
      totalJanjangObj['<1000'].total_janjang
    ).toFixed(2),
  ]);
  totalJanjangData.push([
    3,
    '> 1000 Janjang',
    '<10kg',
    totalJanjangObj['>1000'].total_trucks,
    countPercentage(
      totalJanjangObj['>1000'].total_trucks,
      data?.length
    ).toFixed(2),
    totalJanjangObj['>1000'].total_janjang,
    countPercentage(
      totalJanjangObj['>1000'].total_accepted,
      totalJanjangObj['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['>1000'].matang,
      totalJanjangObj['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['>1000'].lewat_matang,
      totalJanjangObj['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['>1000'].tangkai_panjang,
      totalJanjangObj['>1000'].total_accepted
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['>1000'].mentah,
      totalJanjangObj['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['>1000'].janjang_kosong,
      totalJanjangObj['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObj['>1000'].buah_kecil,
      totalJanjangObj['>1000'].total_janjang
    ).toFixed(2),
  ]);
  totalJanjangData.push(['']);
  Object.keys(totalJanjangObj).forEach((category, idx) => {
    const item = totalJanjangObj[category];
    const categoryTotal =
      category === '<600'
        ? '400 - 600 Janjang'
        : category === '<1000'
        ? '601 - 1000 Janjang'
        : '> 1000 Janjang';
    totalJanjangData.push([`Kategori ${categoryTotal}`]);
    totalJanjangData.push([
      'No',
      'Vendor',
      'Total',
      'Kontribusi',
    ]);
    Object.keys(item.vendors)
      .map((k) => ({
        vendor: k,
        ...item.vendors[k],
      }))
      .sort((a, b) => b.count - a.count)
      .forEach((t, idx) => {
        totalJanjangData.push([
          idx + 1,
          t.vendor_name,
          t.count + 'x',
          countPercentage(t.count, item.total_trucks).toFixed(2) + '%',
        ]);
      });

    totalJanjangData.push(['']);
  });

  const machineUtilityWeekData = [
    [periodString],
    [
      'Week',
      'Total Truk',
      'Avg Truk Harian',
      'Mesin 1',
      '',
      'Mesin 2',
      '',
      'Mesin 3',
      '',
      'Mesin 4',
      '',
    ],
    [
      '',
      '',
      '',
      'Total',
      '% Utilitas',
      'Total',
      '% Utilitas',
      'Total',
      '% Utilitas',
      'Total',
      '% Utilitas',
    ],
  ];
  Object.keys(machineUtilityWeek).forEach((week) => {
    const item = machineUtilityWeek[week];
    machineUtilityWeekData.push([
      week,
      item.total_trucks,
      Math.round(item.total_trucks / 7),
      item['machine'][1],
      countPercentage(item['machine'][1], item.total_trucks).toFixed(2) + '%',
      item['machine'][2],
      countPercentage(item['machine'][2], item.total_trucks).toFixed(2) + '%',
      item['machine'][3],
      countPercentage(item['machine'][3], item.total_trucks).toFixed(2) + '%',
      item['machine'][4],
      countPercentage(item['machine'][4], item.total_trucks).toFixed(2) + '%',
    ]);
  });

  const avgVendorHeader = [
    'Total Truk',
    'Kontribusi %',
    'Avg Tandan',
    'Estimasi BJR',
    'Avg Diterima %',
    'Avg MM %',
    'Avg LM %',
    'Avg TP %',
    'Avg M %',
    'Avg JK %',
    'Avg BK %',
  ];
  const avgVendorData = [[periodString], ['No', 'Vendor', ...avgVendorHeader]];
  Object.keys(avgVendor).forEach((vendor, idx) => {
    const item = avgVendor[vendor];
    const avgTandan = Math.round(item.tandan / item.count);

    avgVendorData.push([
      idx + 1,
      vendor,
      item.count,
      countPercentage(item.count, data?.length).toFixed(2),
      avgTandan,
      (10000 / avgTandan).toFixed(2),
      (item.accepted / item.count).toFixed(2),
      (item.matang / item.count).toFixed(2),
      (item.lewat_matang / item.count).toFixed(2),
      (item.tangkai_panjang / item.count).toFixed(2),
      (item.mentah / item.count).toFixed(2),
      (item.janjang_kosong / item.count).toFixed(2),
      (item.buah_kecil / item.count).toFixed(2),
    ]);
  });

  avgVendorData.push([
    '** Kontribusi merupakan persentase terhadap keseluruhan truk dalam Januari - Maret 2025',
  ]);

  Object.keys(avgVendor)
    .map((vendor, idx) => {
      const item = avgVendor[vendor];

      return { vendor_name: vendor, ...item };
    })
    .sort((a, b) => b.count - a.count)
    .forEach((d) => {
      avgVendorData.push(['']);
      avgVendorData.push([`Most Frequent Truck ${d.vendor_name}`]);
      avgVendorData.push(['No', 'Plat Nomor', ...avgVendorHeader]);
      Object.keys(d.trucks)
        .map((t) => ({ vehicle_number: t, ...d['trucks'][t] }))
        .sort((a, b) => b.count - a.count)
        .forEach((item, idx) => {
          const avgTandan = Math.round(item.tandan / item.count);

          avgVendorData.push([
            idx + 1,
            item.vehicle_number,
            item.count,
            countPercentage(item.count, data?.length).toFixed(2),
            avgTandan,
            (10000 / avgTandan).toFixed(2),
            (item.accepted / item.count).toFixed(2),
            (item.matang / item.count).toFixed(2),
            (item.lewat_matang / item.count).toFixed(2),
            (item.tangkai_panjang / item.count).toFixed(2),
            (item.mentah / item.count).toFixed(2),
            (item.janjang_kosong / item.count).toFixed(2),
            (item.buah_kecil / item.count).toFixed(2),
          ]);
        });

      avgVendorData.push([
        '** Kontribusi merupakan persentase terhadap keseluruhan truk dalam Januari - Maret 2025',
      ]);
    });

  const totalJanjangDurationData = [
    [periodString],
    [
      'No',
      'Kategori',
      'Estimasi BJR',
      'Total Truk',
      'Kontribusi',
      'Total Janjang',
      '% Diterima',
      '% Matang',
      '% Lewat Matang',
      '% Tangkai Panjang',
      '% Mentah',
      '% Janjang Kosong',
      '% Buah Kecil',
      'Avg Durasi',
    ],
  ];
  totalJanjangDurationData.push([
    1,
    '400 - 600 Janjang',
    '16 - 30kg',
    totalJanjangObjDuration['<600'].total_trucks,
    countPercentage(
      totalJanjangObjDuration['<600'].total_trucks,
      data?.length
    ).toFixed(2),
    totalJanjangObjDuration['<600'].total_janjang,
    countPercentage(
      totalJanjangObjDuration['<600'].total_accepted,
      totalJanjangObjDuration['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<600'].matang,
      totalJanjangObjDuration['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<600'].lewat_matang,
      totalJanjangObjDuration['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<600'].tangkai_panjang,
      totalJanjangObjDuration['<600'].total_accepted
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<600'].mentah,
      totalJanjangObjDuration['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<600'].janjang_kosong,
      totalJanjangObjDuration['<600'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<600'].buah_kecil,
      totalJanjangObjDuration['<600'].total_janjang
    ).toFixed(2),
    getDurationStringFromMs(
      Math.round(
        totalJanjangObjDuration['<600'].duration /
          totalJanjangObjDuration['<600'].total_trucks
      )
    ),
  ]);
  totalJanjangDurationData.push([
    2,
    '601 - 1000 Janjang',
    '10 - 15kg',
    totalJanjangObjDuration['<1000'].total_trucks,
    countPercentage(
      totalJanjangObjDuration['<1000'].total_trucks,
      data?.length
    ).toFixed(2),
    totalJanjangObjDuration['<1000'].total_janjang,
    countPercentage(
      totalJanjangObjDuration['<1000'].total_accepted,
      totalJanjangObjDuration['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<1000'].matang,
      totalJanjangObjDuration['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<1000'].lewat_matang,
      totalJanjangObjDuration['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<1000'].tangkai_panjang,
      totalJanjangObjDuration['<1000'].total_accepted
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<1000'].mentah,
      totalJanjangObjDuration['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<1000'].janjang_kosong,
      totalJanjangObjDuration['<1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['<1000'].buah_kecil,
      totalJanjangObjDuration['<1000'].total_janjang
    ).toFixed(2),
    getDurationStringFromMs(
      Math.round(
        totalJanjangObjDuration['<1000'].duration /
          totalJanjangObjDuration['<1000'].total_trucks
      )
    ),
  ]);
  totalJanjangDurationData.push([
    3,
    '> 1000 Janjang',
    '<10kg',
    totalJanjangObjDuration['>1000'].total_trucks,
    countPercentage(
      totalJanjangObjDuration['>1000'].total_trucks,
      data?.length
    ).toFixed(2),
    totalJanjangObjDuration['>1000'].total_janjang,
    countPercentage(
      totalJanjangObjDuration['>1000'].total_accepted,
      totalJanjangObjDuration['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['>1000'].matang,
      totalJanjangObjDuration['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['>1000'].lewat_matang,
      totalJanjangObjDuration['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['>1000'].tangkai_panjang,
      totalJanjangObjDuration['>1000'].total_accepted
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['>1000'].mentah,
      totalJanjangObjDuration['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['>1000'].janjang_kosong,
      totalJanjangObjDuration['>1000'].total_janjang
    ).toFixed(2),
    countPercentage(
      totalJanjangObjDuration['>1000'].buah_kecil,
      totalJanjangObjDuration['>1000'].total_janjang
    ).toFixed(2),
    getDurationStringFromMs(
      Math.round(
        totalJanjangObjDuration['>1000'].duration /
          totalJanjangObjDuration['>1000'].total_trucks
      )
    ),
  ]);

  const orderDay = countDays(daysDateArray);
  const dailyTruckCountData = [
    [periodString],
    ['Rata - Rata Grading Berdasarkan Hari Dan Waktu'],
    [
      'Hari',
      '00 - 02',
      '05 - 10',
      '10 - 12',
      '12 - 14',
      '14 - 16',
      '16 - 18',
      '18 - 19',
      '19 - 21',
      '21 - 24',
    ],
  ];
  Object.keys(orderDay).forEach((d) => {
    const item = dailyTruckCount[d];
    const totalDay = orderDay[d];
    dailyTruckCountData.push([
      d,
      Number(item['00'] / totalDay).toFixed(1),
      Number(item['05'] / totalDay).toFixed(1),
      Number(item['10'] / totalDay).toFixed(1),
      Number(item['12'] / totalDay).toFixed(1),
      Number(item['14'] / totalDay).toFixed(1),
      Number(item['16'] / totalDay).toFixed(1),
      Number(item['18'] / totalDay).toFixed(1),
      Number(item['19'] / totalDay).toFixed(1),
      Number(item['21'] / totalDay).toFixed(1),
    ]);
  });

  const workbook = XLSX.utils.book_new();
  // Create a worksheet
  const wsRaw = XLSX.utils.aoa_to_sheet(rawDataExcel);
  XLSX.utils.book_append_sheet(workbook, wsRaw, 'Raw Data');
  const wsAvgWeek = XLSX.utils.aoa_to_sheet(avgWeekData);
  XLSX.utils.book_append_sheet(workbook, wsAvgWeek, 'Average Reject Accept');
  const wsAvgWeekDemography = XLSX.utils.aoa_to_sheet(avgWeekDemographyData);
  XLSX.utils.book_append_sheet(
    workbook,
    wsAvgWeekDemography,
    'Average Demografi Klasifikasi'
  );
  const wsBestAccepted = XLSX.utils.aoa_to_sheet(bestAcceptedTrucksData);
  XLSX.utils.book_append_sheet(workbook, wsBestAccepted, 'Best 20 Accepted');
  const wsWorsttAccepted = XLSX.utils.aoa_to_sheet(worstAcceptedTrucksData);
  XLSX.utils.book_append_sheet(
    workbook,
    wsWorsttAccepted,
    'Top 20 Worst Trucks'
  );
  const wsHourTruck = XLSX.utils.aoa_to_sheet(hourDataRejectData);
  XLSX.utils.book_append_sheet(workbook, wsHourTruck, 'Reject by Shift Data');
  const wsTotalJanjang = XLSX.utils.aoa_to_sheet(totalJanjangData);
  XLSX.utils.book_append_sheet(workbook, wsTotalJanjang, 'Total Tandan Recap');
  const wsMachineUtility = XLSX.utils.aoa_to_sheet(machineUtilityWeekData);
  XLSX.utils.book_append_sheet(workbook, wsMachineUtility, 'Machine Utilities');
  const wsAvgVendor = XLSX.utils.aoa_to_sheet(avgVendorData);
  XLSX.utils.book_append_sheet(workbook, wsAvgVendor, 'Average Vendor');
  const wsTotalJanjangDuration = XLSX.utils.aoa_to_sheet(
    totalJanjangDurationData
  );
  XLSX.utils.book_append_sheet(
    workbook,
    wsTotalJanjangDuration,
    'Total Tandan Duration Recap'
  );
  const wsDailyTruck = XLSX.utils.aoa_to_sheet(dailyTruckCountData);
  XLSX.utils.book_append_sheet(workbook, wsDailyTruck, 'Daily Truck Day Time');

  // Write the file
  XLSX.writeFile(workbook, `Report${new Date().toISOString()}.xlsx`);
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
  await generateExcel('01/01/2025', '01/31/2025').catch(console.error);
  await generateExcel('02/01/2025', '02/28/2025').catch(console.error);
  await generateExcel('03/01/2025', '03/31/2025').catch(console.error);
  await generateExcel('04/01/2025', '04/15/2025').catch(console.error);

  console.log('Done');
  process.exit(1);
});

// Run the function with a specific date
