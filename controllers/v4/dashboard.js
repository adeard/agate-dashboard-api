const dayjs = require('dayjs');
const FactoryModel = require('../../models/factory');
const InspectionHistoryModel = require('../../models/inspection-history');
const VendorModel = require('../../models/vendor');
const {
  createResponseSuccess,
  generateWeeks,
  generateDatesByYear,
  generateMonths,
  getDateMonthYearDay,
  getWeekNumber,
  sortDataByKey,
  countPercentage,
  getStats,
  sortObjectByValues,
} = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');
const InspectionDataModel = require('../../models/inspection-data');

const utilsInspection = {
  getTotalAndPercentClassification: (item) => {
    const totalTandan = item.grading_result['total_tandan'];
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
    const totalFined = item.grading_result['total_fined'];

    const percentAcceptedModified = countPercentage(
      totalAcceptedModified,
      totalTandan
    );

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
    const percentBuahKecil3 = countPercentage(totalBuahKecil3, totalTandan);
    const percentBuahKecil5 = countPercentage(totalBuahKecil5, totalTandan);
    const percentBuahKecil = countPercentage(
      totalBuahKecil3 + totalBuahKecil5,
      totalTandan
    );

    return {
      totalMatang,
      totalLewatMatang,
      totalMentah,
      totalJanjangKosong,
      totalBuahKecil3,
      totalBuahKecil5,
      totalTangkaiPanjang,
      percentBuahKecil,
      percentJangkos,
      percentBuahKecil3,
      percentBuahKecil5,
      percentLewatMatang,
      percentMatang,
      percentMentah,
      percentTangkaiPanjang,
      percentAcceptedModified,
      totalAcceptedModified,
      totalRejectedModified,
      totalTandan,
      totalFined,
    };
  },
  getAllMonitoringData: (inspections) => {
    const totalTandan = inspections.reduce(
      (curr, acc) => Number(acc.grading_result.total_tandan || 0) + curr,
      0
    );
    const totalRejected = inspections.reduce(
      (curr, acc) => Number(acc.grading_result.total_rejected || 0) + curr,
      0
    );
    const totalPassed = inspections.reduce(
      (curr, acc) => Number(acc.grading_result.total_accepted || 0) + curr,
      0
    );
    const totalFined = inspections.reduce(
      (curr, acc) => Number(acc.grading_result.total_fined || 0) + curr,
      0
    );
    const totalInspection = inspections.length;

    const percentRejected = (totalRejected / totalTandan) * 100;
    const percentAccepted = (totalPassed / totalTandan) * 100;
    const percentFined = (totalFined / totalPassed) * 100;

    return {
      totalTandan,
      totalRejected,
      totalAccepted: totalPassed,
      totalFined,
      totalInspection,
      percentAccepted,
      percentFined,
      percentRejected,
    };
  },
};

const ObjectId = require('mongoose').Types.ObjectId;

const KLASIFIKASI_SORTING = [
  'MENTAH',
  'KURANG MATANG',
  'MATANG',
  'LEWAT MATANG',
  'JANJANG KOSONG',
  'BUAH KECIL DIBAWAH 3KG',
  'BUAH KECIL DIBAWAH 5KG',
  'TANGKAI PANJANG',
];

const KLASIFIKASI_INTI = [
  'MENTAH',
  'KURANG MATANG',
  'MATANG',
  'LEWAT MATANG',
  'JANJANG KOSONG',
];

const KLASIFIKASI_PLASMA = [
  'MENTAH',
  'MATANG',
  'LEWAT MATANG',
  'JANJANG KOSONG',
];

const SUB_KLASIFIKASI = [
  'TANGKAI PANJANG',
  'BUAH KECIL DIBAWAH 3KG',
  'BUAH KECIL DIBAWAH 5KG',
];

const SUB_KLASIFIKASI_SIZE = [
  'BUAH KECIL DIBAWAH 3KG',
  'BUAH KECIL DIBAWAH 5KG',
];

const SUB_KLASIFIKASI_TP = ['TANGKAI PANJANG'];

const ACCEPTED_PLASMA = ['MATANG', 'LEWAT MATANG'];
const FINED_PLASMA = ['BUAH KECIL DIBAWAH 5KG', 'TANGKAI PANJANG'];
const REJECTED_PLASMA = ['MENTAH', 'JANJANG KOSONG', 'BUAH KECIL DIBAWAH 3KG'];

const generateTemplate = (array) => {
  return array.reduce((curr, m) => {
    if (!Object.keys(curr).includes(m)) {
      curr[m] = {};
    }

    return curr;
  }, {});
};

const setChartData = (
  inspection,
  object,
  key,
  time,
  timeKey,
  mainClass,
  subClass,
  isSubClass = false
) => {
  let x = isSubClass ? subClass : mainClass;
  let vendorName = inspection['vendor_name'];

  if (Object.keys(object[key][time]).includes(String(timeKey))) {
    if (!Object.keys(object[key][time][String(timeKey)]).includes(x)) {
      object[key][time][String(timeKey)][x] = { value: 0, vendors: {} };
    }

    let vendors = object[key][time][String(timeKey)][x]['vendors'];

    if (!Object.keys(vendors).includes(vendorName)) {
      vendors[vendorName] = 0;
    }

    vendors[vendorName] +=
      inspection['grading_result']['classification_summary']?.[mainClass]?.[
        isSubClass ? subClass : 'TOTAL'
      ] || 0;

    object[key][time][String(timeKey)][x]['vendors'] = vendors;
    object[key][time][String(timeKey)][x]['value'] +=
      inspection['grading_result']['classification_summary']?.[mainClass]?.[
        isSubClass ? subClass : 'TOTAL'
      ] || 0;
  }
};

const setChartDataPerformance = (
  inspection,
  object,
  key,
  time,
  timeKey,
  status
) => {
  let x = status;

  if (Object.keys(object[key][time]).includes(String(timeKey))) {
    if (!Object.keys(object[key][time][String(timeKey)]).includes(x)) {
      object[key][time][String(timeKey)][x] = { value: 0 };
    }

    object[key][time][String(timeKey)][x]['value'] +=
      inspection['grading_result']?.[x] || 0;
  }
};

const setChartDataDuration = (duration, object, key, time, timeKey, status) => {
  let x = status;

  if (Object.keys(object[key][time]).includes(String(timeKey))) {
    if (!Object.keys(object[key][time][String(timeKey)]).includes(x)) {
      object[key][time][String(timeKey)][x] = { data: [] };
    }

    object[key][time][String(timeKey)][x]['data'].push(duration);
  }
};

const setChartDataTruckGap = (
  duration,
  object,
  key,
  time,
  timeKey,
  machine
) => {
  let x = 'machines';

  if (Object.keys(object[key][time]).includes(String(timeKey))) {
    if (!Object.keys(object[key][time][String(timeKey)]).includes(x)) {
      object[key][time][String(timeKey)][x] = { data: [] };
    }
    object[key][time][String(timeKey)][x]['data'].push({
      value: duration,
      machine,
    });
  }
};

const convertDemographyChartToArray = (object, main, time, divider = 1) => {
  let x = object[main][time];

  return Object.keys(x).map((key) => {
    let data = Object.keys(x[key]).reduce((curr, acc) => {
      let val = curr[acc]['value'];
      let percent = countPercentage(val, divider);
      curr[acc]['percent'] = percent;

      return curr;
    }, x[key]);

    let finalData = Object.keys(data).map((k) => {
      let vendorData = Object.keys(data[k]['vendors']).map((kv) => {
        return {
          name: kv,
          percent: countPercentage(data[k]['vendors'][kv], data[k]['value']),
          total: data[k]['vendors'][kv],
        };
      });

      return {
        name: k,
        total: data[k]['value'],
        vendors: vendorData.filter((e) => e.total > 0),
      };
    });

    return {
      title: key,
      data: finalData,
      // percent,
      // total: countPercentage(total, divider),
    };
  });
};

const mapVendorData = (vendors, total) => {
  return sortDataByKey(
    Object.keys(vendors)
      .map((kv) => {
        return {
          label: kv,
          total: vendors[kv]['total'],
          percent: countPercentage(vendors[kv]['total'], total),
        };
      })
      .filter((e) => e.total > 0),
    'total'
  );
};

const dictionaryPerformance = {
  total_accepted: 'Diterima',
  total_rejected: 'Ditolak',
  total_fined: 'Didenda',
};

const objectToTitleDataArray = (obj) => {
  return Object.keys(obj).map((key) => ({
    title: key,
    data: Object.keys(obj[key]).map((k) => {
      return {
        name: dictionaryPerformance[k],
        total: obj[key][k]['value'],
      };
    }),
  }));
};

const converToObjectData = (obj) => {
  return Object.keys(obj).reduce((o, k) => {
    if (!o[k]) {
      o[k] = [];
    }
    o[k] = objectToTitleDataArray(obj[k]);

    return o;
  }, {});
};

const setChartDataValue = (
  object,
  keyTime,
  time,
  keyItem,
  valueItem,
  asArray = false
) => {
  if (Array.isArray(keyItem)) {
    keyItem.forEach((key, index) => {
      if (asArray) {
        if (!object[keyTime][time][key]) {
          object[keyTime][time][key] = [];
        }
        object[keyTime][time][key].push(valueItem[index]);
        return;
      }
      if (!object[keyTime][time][key]) {
        object[keyTime][time][key] = 0;
      }
      object[keyTime][time][key] += valueItem[index];
    });
  } else {
    if (asArray) {
      if (!object[keyTime][time][keyItem]) {
        object[keyTime][time][keyItem] = [];
      }
      object[keyTime][time][keyItem].push(valueItem);
      return;
    }
    if (!object[keyTime][time][keyItem]) {
      object[keyTime][time][keyItem] = 0;
    }
    object[keyTime][time][keyItem] += valueItem;
  }
};

const generateChartArrayFromObject = (data = {}, isArrayValue = false) => {
  return Object.entries(data).reduce(
    (obj, [key, value]) => {
      obj[key] = Object.entries(value)
        .map(([k, v]) => {
          return {
            title: k,
            data: Object.entries(v)
              .map(([k2, v2]) => {
                if (k2 === 'Total') return;

                const t = isArrayValue
                  ? v2.reduce((n, i) => n + (i || 0), 0)
                  : v2;

                return {
                  name: k2,
                  total: isArrayValue
                    ? t / v2.length
                    : countPercentage(t, data[key][k]['Total']),
                };
              })
              .filter(Boolean),
          };
        })
        .filter(Boolean);

      return obj;
    },
    { daily: [], monthly: [], weekly: [] }
  );
};

const generateChartArrayFromObjectTrucks = (data = {}) => {
  return Object.entries(data).reduce(
    (obj, [key, value]) => {
      obj[key] = Object.entries(value)
        .map(([k, v]) => {
          return {
            title: k,
            data: Object.entries(v)
              .map(([k2, v2]) => {
                if (k2.includes('Mesin')) return;
                return {
                  name: k2,
                  total: v2,
                  machines: [
                    {
                      name: 'Mesin 1',
                      total: data[key][k]['Mesin 1'],
                    },
                    {
                      name: 'Mesin 2',
                      total: data[key][k]['Mesin 2'],
                    },
                    {
                      name: 'Mesin 3',
                      total: data[key][k]['Mesin 3'],
                    },
                    {
                      name: 'Mesin 4',
                      total: data[key][k]['Mesin 4'],
                    },
                  ],
                };
              })
              .filter(Boolean),
          };
        })
        .filter(Boolean);

      return obj;
    },
    { daily: [], monthly: [], weekly: [] }
  );
};

class DashboardV4Controller {
  static async getDataDashboard(req, res, next) {
    try {
      const {
        year = new Date().getFullYear(),
        factory = '',
        date_to = null,
        date_from = null,
        vendor_type = null,
      } = req.query;

      const weeks = generateWeeks(year);
      const days = generateDatesByYear(year);
      const months = generateMonths(year);

      let q = {};

      if (date_from && !date_to) {
        q['date'] = {
          $gte: dayjs(date_from).startOf('day'),
        };
      } else if (date_to && !date_from) {
        q['date'] = {
          $lte: dayjs(date_to).endOf('day'),
        };
      } else if (date_from && date_to) {
        q['date'] = {
          $gte: dayjs(date_from).startOf('day'),
          $lte: dayjs(date_to).endOf('day'),
        };
      }

      if (factory) {
        q['factory'] = factory;
      }

      if (vendor_type) {
        q['vendor_type'] = vendor_type;
      }

      // if (year) {
      //   q['year'] = Number(year);
      // }

      let inspections = await InspectionDataModel.find(q);

      inspections = inspections.filter(
        (e) => Number(e.grading_result?.['total_tandan'] || 0) > 200
      );

      const {
        totalTandan,
        totalAccepted,
        totalFined,
        totalRejected,
        totalInspection,
        percentAccepted,
        percentFined,
        percentRejected,
      } = utilsInspection.getAllMonitoringData(inspections);

      const avgClassification = {
        matang: [],
        lewat_matang: [],
        mentah: [],
        janjang_kosong: [],
        buah_kecil_3: [],
        buah_kecil_5: [],
        tangkai_panjang: [],
      };
      const avgAcceptedVendor = {};
      const summaryPerformance = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const gradingTrucks = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const fruitAccepted = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const fruitRejected = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const fruitTp = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };

      inspections.forEach((item) => {
        const vendorName = item.vendor_name;
        const { day, monthYear } = getDateMonthYearDay(item['date'], true);
        const week = getWeekNumber(item['date']);

        const {
          percentJangkos,
          percentBuahKecil3,
          percentBuahKecil5,
          percentLewatMatang,
          percentMatang,
          percentMentah,
          percentTangkaiPanjang,
          percentAcceptedModified,
          totalAcceptedModified,
          totalRejectedModified,
          totalFined: totalFinedItem,
          totalTandan: totalTandanItem,
        } = utilsInspection.getTotalAndPercentClassification(item, totalTandan);

        avgClassification['matang'].push(percentMatang);
        avgClassification['lewat_matang'].push(percentLewatMatang);
        avgClassification['mentah'].push(percentMentah);
        avgClassification['janjang_kosong'].push(percentJangkos);
        avgClassification['buah_kecil_3'].push(percentBuahKecil3);
        avgClassification['buah_kecil_5'].push(percentBuahKecil5);
        avgClassification['tangkai_panjang'].push(percentTangkaiPanjang);

        if (!avgAcceptedVendor[vendorName]) {
          avgAcceptedVendor[vendorName] = [];
        }
        avgAcceptedVendor[vendorName].push(percentAcceptedModified);

        // Summary Performance
        setChartDataValue(
          summaryPerformance,
          'daily',
          day,
          ['Diterima', 'Ditolak', 'Didenda', 'Total'],
          [
            totalAcceptedModified,
            totalRejectedModified,
            totalFinedItem,
            totalTandanItem,
          ]
        );
        setChartDataValue(
          summaryPerformance,
          'weekly',
          week,
          ['Diterima', 'Ditolak', 'Didenda', 'Total'],
          [
            totalAcceptedModified,
            totalRejectedModified,
            totalFinedItem,
            totalTandanItem,
          ]
        );
        setChartDataValue(
          summaryPerformance,
          'monthly',
          monthYear,
          ['Diterima', 'Ditolak', 'Didenda', 'Total'],
          [
            totalAcceptedModified,
            totalRejectedModified,
            totalFinedItem,
            totalTandanItem,
          ]
        );

        // Grading Trucks
        setChartDataValue(
          gradingTrucks,
          'daily',
          day,
          ['Truk', 'Mesin 1', 'Mesin 2', 'Mesin 3', 'Mesin 4'],
          [
            1,
            item.machine === 1 ? 1 : 0,
            item.machine === 2 ? 1 : 0,
            item.machine === 3 ? 1 : 0,
            item.machine === 4 ? 1 : 0,
          ]
        );
        setChartDataValue(
          gradingTrucks,
          'weekly',
          week,
          ['Truk', 'Mesin 1', 'Mesin 2', 'Mesin 3', 'Mesin 4'],
          [
            1,
            item.machine === 1 ? 1 : 0,
            item.machine === 2 ? 1 : 0,
            item.machine === 3 ? 1 : 0,
            item.machine === 4 ? 1 : 0,
          ]
        );
        setChartDataValue(
          gradingTrucks,
          'monthly',
          monthYear,
          ['Truk', 'Mesin 1', 'Mesin 2', 'Mesin 3', 'Mesin 4'],
          [
            1,
            item.machine === 1 ? 1 : 0,
            item.machine === 2 ? 1 : 0,
            item.machine === 3 ? 1 : 0,
            item.machine === 4 ? 1 : 0,
          ]
        );

        // Fruit Accepted
        setChartDataValue(
          fruitAccepted,
          'daily',
          day,
          ['Matang', 'Lewat Matang'],
          [percentMatang, percentLewatMatang],
          true
        );
        setChartDataValue(
          fruitAccepted,
          'weekly',
          week,
          ['Matang', 'Lewat Matang'],
          [percentMatang, percentLewatMatang],
          true
        );
        setChartDataValue(
          fruitAccepted,
          'monthly',
          monthYear,
          ['Matang', 'Lewat Matang'],
          [percentMatang, percentLewatMatang],
          true
        );

        // Fruit Tp
        setChartDataValue(
          fruitTp,
          'daily',
          day,
          ['Tangkai Panjang'],
          [percentTangkaiPanjang],
          true
        );
        setChartDataValue(
          fruitTp,
          'weekly',
          week,
          ['Tangkai Panjang'],
          [percentTangkaiPanjang],
          true
        );
        setChartDataValue(
          fruitTp,
          'monthly',
          monthYear,
          ['Tangkai Panjang'],
          [percentTangkaiPanjang],
          true
        );

        // Fruit Rejected
        setChartDataValue(
          fruitRejected,
          'daily',
          day,
          [
            'Mentah',
            'Lewat Matang',
            'Janjang Kosong',
            'Buah <3kg',
            'Buah 3-5kg',
          ],
          [
            percentMentah,
            percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
          ],
          true
        );
        setChartDataValue(
          fruitRejected,
          'weekly',
          week,
          [
            'Mentah',
            'Lewat Matang',
            'Janjang Kosong',
            'Buah <3kg',
            'Buah 3-5kg',
          ],
          [
            percentMentah,
            percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
          ],
          true
        );
        setChartDataValue(
          fruitRejected,
          'monthly',
          monthYear,
          [
            'Mentah',
            'Lewat Matang',
            'Janjang Kosong',
            'Buah <3kg',
            'Buah 3-5kg',
          ],
          [
            percentMentah,
            percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
          ],
          true
        );
      });

      const averageGrading = Object.entries(avgClassification).reduce(
        (obj, [key, value]) => {
          obj[key] = (
            value.reduce((tot, num) => tot + (num || 0), 0) / value.length
          ).toLocaleString('en', { maximumFractionDigits: 2 });

          return obj;
        },
        {}
      );
      const averageVendorAccepted = Object.entries(avgAcceptedVendor).reduce(
        (obj, [key, value]) => {
          obj[key] = (
            value.reduce((tot, num) => tot + (num || 0), 0) / value.length
          ).toLocaleString('en', { maximumFractionDigits: 2 });

          return obj;
        },
        {}
      );

      return res.status(200).json(
        createResponseSuccess(200, 'Success', 'Success get all data', {
          monitoring: {
            total_tandan: totalTandan,
            total_grading: totalInspection,
            total_passed: totalAccepted,
            total_rejected: totalRejected,
            total_fined: totalFined,
            percent_rejected: percentRejected || 0,
            percent_passed: percentAccepted || 0,
            percent_fined: percentFined || 0,
          },
          average_grading: averageGrading,
          average_vendor_accepted: sortObjectByValues(averageVendorAccepted),
          charts_data: {
            summary_performance:
              generateChartArrayFromObject(summaryPerformance),
            grading_trucks: generateChartArrayFromObjectTrucks(gradingTrucks),
            fruit_accepted: generateChartArrayFromObject(fruitAccepted, true),
            fruit_rejected: generateChartArrayFromObject(fruitRejected, true),
            fruit_tangkai_panjang: generateChartArrayFromObject(fruitTp, true),
          },
        })
      );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  }
}

module.exports = DashboardV4Controller;
