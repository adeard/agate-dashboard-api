const dayjs = require('dayjs');
const FactoryModel = require('../../models/factory');
const {
  createResponseSuccess,
  generateWeeks,
  generateDatesByYear,
  generateMonths,
  getDateMonthYearDay,
  getWeekNumber,
  sortDataByKey,
} = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');
const InspectionDataModel = require('../../models/inspection-data');

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

const countPercentage = (number = 0, divider = 1) => {
  return divider > 0 && number ? (Number(number) / Number(divider)) * 100 : 0;
};

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

const convertDemographyChartToArray = (object, main, time, divider = 1) => {
  let x = object[main][time];
  return Object.keys(x).map((key) => {
    //   0

    let data = Object.keys(x[key]).reduce((curr, acc) => {
      let val = curr[acc]['value'];
      let percent = countPercentage(val, divider);
      curr[acc]['percent'] = percent;

      return curr;
    }, x[key]);

    return {
      title: key,
      data: Object.keys(data).map((k) => {
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
      }),
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

class DashboardV2Controller {
  static async getDataDashboard(req, res, next) {
    try {
      const user = req.user;
      const {
        year = new Date().getFullYear(),
        factory = '',
        date_to = null,
        date_from = null,
      } = req.query;

      const weeks = generateWeeks(year);
      const days = generateDatesByYear(year);
      const months = generateMonths(year);

      let q = { company: user.company };

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

      const inspections = await InspectionDataModel.find(q);

      const totalAllTandon = inspections.reduce(
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

      const percentRejected = (totalRejected / totalAllTandon) * 100;
      const percentAccepted = (totalPassed / totalAllTandon) * 100;
      const percentFined = (totalFined / totalPassed) * 100;

      let byVendorIntiAccepted = {};
      let totalAcceptedInti = 0;

      let byVendorPlasmaAccepted = {};
      let totalAcceptedPlasma = 0;

      let totalIntiFruits = 0;
      let byIntiFruits = KLASIFIKASI_INTI.reduce((curr, k) => {
        curr[k] = {
          total: 0,
          percentage: 0,
          vendors: {},
        };

        return curr;
      }, {});
      let byIntiFruitsSize = SUB_KLASIFIKASI_SIZE.reduce((curr, k) => {
        curr[k] = {
          total: 0,
          percentage: 0,
          vendors: {},
        };

        return curr;
      }, {});
      let byIntiFruitsTP = SUB_KLASIFIKASI_TP.reduce((curr, k) => {
        curr[k] = {
          total: 0,
          percentage: 0,
          vendors: {},
        };

        return curr;
      }, {});

      let totalPlasmaFruits = 0;
      let byPlasmaFruits = KLASIFIKASI_PLASMA.reduce((curr, k) => {
        curr[k] = {
          total: 0,
          percentage: 0,
          vendors: {},
        };

        return curr;
      }, {});
      let byPlasmaFruitsSize = SUB_KLASIFIKASI_SIZE.reduce((curr, k) => {
        curr[k] = {
          total: 0,
          percentage: 0,
          vendors: {},
        };

        return curr;
      }, {});
      let byPlasmaFruitsTP = SUB_KLASIFIKASI_TP.reduce((curr, k) => {
        curr[k] = {
          total: 0,
          percentage: 0,
          vendors: {},
        };

        return curr;
      }, {});

      let byDemographyInti = {
        main: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
        size: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
        tp: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
      };

      let byDemographyPlasma = {
        main: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
        size: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
        tp: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
      };

      inspections.forEach((inspection) => {
        const { day, monthYear } = getDateMonthYearDay(
          inspection['date'],
          true
        );
        const week = getWeekNumber(inspection['date']);

        console.log({ grading_result: inspection['grading_result'] });

        if (inspection.vendor_type === '1') {
          totalAcceptedInti +=
            inspection['grading_result']['total_accepted'] || 0;

          const vendorName = inspection['vendor_name'];
          if (!Object.keys(byVendorIntiAccepted).includes(vendorName)) {
            byVendorIntiAccepted[vendorName] = {
              total: 0,
              percent: 0,
              demography: {},
              total_tandan: 0,
            };
          }

          byVendorIntiAccepted[vendorName]['total'] +=
            inspection['grading_result']['total_accepted'];
          byVendorIntiAccepted[vendorName]['total_tandan'] +=
            inspection['grading_result']['total_tandan'];

          byVendorIntiAccepted[vendorName]['demography'] =
            KLASIFIKASI_INTI.reduce((curr, k) => {
              if (!Object.keys(curr).includes(k)) {
                curr[k] = {
                  total: 0,
                  percent: 0,
                };
              }

              curr[k]['total'] +=
                inspection['grading_result']['classification_summary']?.[k]?.[
                  'TOTAL'
                ] || 0;

              byIntiFruits[k]['total'] +=
                inspection['grading_result']['classification_summary']?.[k]?.[
                  'TOTAL'
                ] || 0;

              totalIntiFruits +=
                inspection['grading_result']['classification_summary']?.[k]?.[
                  'TOTAL'
                ] || 0;

              if (
                !Object.keys(byIntiFruits[k]['vendors']).includes(vendorName)
              ) {
                byIntiFruits[k]['vendors'][vendorName] = {
                  total: 0,
                  percent: 0,
                };
              }

              byIntiFruits[k]['vendors'][vendorName]['total'] +=
                inspection['grading_result']['classification_summary']?.[k]?.[
                  'TOTAL'
                ] || 0;

              setChartData(
                inspection,
                byDemographyInti,
                'main',
                'monthly',
                monthYear,
                k,
                null,
                false
              );
              setChartData(
                inspection,
                byDemographyInti,
                'main',
                'weekly',
                week,
                k,
                null,
                false
              );
              setChartData(
                inspection,
                byDemographyInti,
                'main',
                'daily',
                day,
                k,
                null,
                false
              );

              SUB_KLASIFIKASI.forEach((sub) => {
                if (!Object.keys(curr).includes(sub)) {
                  curr[sub] = {
                    total: 0,
                    percent: 0,
                  };
                }

                curr[sub]['total'] +=
                  inspection['grading_result']['classification_summary']?.[k]?.[
                    sub
                  ] || 0;

                if (sub === 'TANGKAI PANJANG') {
                  byIntiFruitsTP[sub]['total'] +=
                    inspection['grading_result']['classification_summary']?.[
                      k
                    ]?.[sub] || 0;

                  if (
                    !Object.keys(byIntiFruitsTP[sub]['vendors']).includes(
                      vendorName
                    )
                  ) {
                    byIntiFruitsTP[sub]['vendors'][vendorName] = {
                      total: 0,
                      percent: 0,
                    };
                  }
                  byIntiFruitsTP[sub]['vendors'][vendorName]['total'] +=
                    inspection['grading_result']['classification_summary']?.[
                      k
                    ]?.[sub] || 0;

                  setChartData(
                    inspection,
                    byDemographyInti,
                    'tp',
                    'monthly',
                    monthYear,
                    k,
                    sub,
                    true
                  );
                  setChartData(
                    inspection,
                    byDemographyInti,
                    'tp',
                    'weekly',
                    week,
                    k,
                    sub,
                    true
                  );
                  setChartData(
                    inspection,
                    byDemographyInti,
                    'tp',
                    'daily',
                    day,
                    k,
                    sub,
                    true
                  );
                } else {
                  byIntiFruitsSize[sub]['total'] +=
                    inspection['grading_result']['classification_summary']?.[
                      k
                    ]?.[sub] || 0;

                  if (
                    !Object.keys(byIntiFruitsSize[sub]['vendors']).includes(
                      vendorName
                    )
                  ) {
                    byIntiFruitsSize[sub]['vendors'][vendorName] = {
                      total: 0,
                      percent: 0,
                    };
                  }
                  byIntiFruitsSize[sub]['vendors'][vendorName]['total'] +=
                    inspection['grading_result']['classification_summary']?.[
                      k
                    ]?.[sub] || 0;

                  setChartData(
                    inspection,
                    byDemographyInti,
                    'size',
                    'monthly',
                    monthYear,
                    k,
                    sub,
                    true
                  );
                  setChartData(
                    inspection,
                    byDemographyInti,
                    'size',
                    'weekly',
                    week,
                    k,
                    sub,
                    true
                  );
                  setChartData(
                    inspection,
                    byDemographyInti,
                    'size',
                    'daily',
                    day,
                    k,
                    sub,
                    true
                  );
                }
              });

              return curr;
            }, byVendorIntiAccepted[vendorName]['demography']);
        } else {
          totalAcceptedPlasma +=
            inspection['grading_result']['total_accepted'] || 0;

          const vendorName = inspection['vendor_name'];
          if (!Object.keys(byVendorPlasmaAccepted).includes(vendorName)) {
            byVendorPlasmaAccepted[vendorName] = {
              total: 0,
              percent: 0,
              demography: {},
              total_tandan: 0,
            };
          }

          byVendorPlasmaAccepted[vendorName]['total'] +=
            inspection['grading_result']['total_accepted'];
          byVendorPlasmaAccepted[vendorName]['total_tandan'] +=
            inspection['grading_result']['total_tandan'];

          byVendorPlasmaAccepted[vendorName]['demography'] =
            KLASIFIKASI_PLASMA.reduce((curr, k) => {
              if (!Object.keys(curr).includes(k)) {
                curr[k] = {
                  total: 0,
                  percent: 0,
                };
              }

              curr[k]['total'] +=
                inspection['grading_result']['classification_summary']?.[k]?.[
                  'TOTAL'
                ] || 0;

              byPlasmaFruits[k]['total'] +=
                inspection['grading_result']['classification_summary']?.[k]?.[
                  'TOTAL'
                ] || 0;

              totalPlasmaFruits +=
                inspection['grading_result']['classification_summary']?.[k]?.[
                  'TOTAL'
                ] || 0;

              if (
                !Object.keys(byPlasmaFruits[k]['vendors']).includes(vendorName)
              ) {
                byPlasmaFruits[k]['vendors'][vendorName] = {
                  total: 0,
                  percent: 0,
                };
              }

              byPlasmaFruits[k]['vendors'][vendorName]['total'] +=
                inspection['grading_result']['classification_summary']?.[k]?.[
                  'TOTAL'
                ] || 0;

              setChartData(
                inspection,
                byDemographyPlasma,
                'main',
                'monthly',
                monthYear,
                k,
                null,
                false
              );
              setChartData(
                inspection,
                byDemographyPlasma,
                'main',
                'weekly',
                week,
                k,
                null,
                false
              );
              setChartData(
                inspection,
                byDemographyPlasma,
                'main',
                'daily',
                day,
                k,
                null,
                false
              );

              SUB_KLASIFIKASI.forEach((sub) => {
                if (!Object.keys(curr).includes(sub)) {
                  curr[sub] = {
                    total: 0,
                    percent: 0,
                  };
                }

                curr[sub]['total'] +=
                  inspection['grading_result']['classification_summary']?.[k]?.[
                    sub
                  ] || 0;

                if (sub === 'TANGKAI PANJANG') {
                  byPlasmaFruitsTP[sub]['total'] +=
                    inspection['grading_result']['classification_summary']?.[
                      k
                    ]?.[sub] || 0;

                  if (
                    !Object.keys(byPlasmaFruitsTP[sub]['vendors']).includes(
                      vendorName
                    )
                  ) {
                    byPlasmaFruitsTP[sub]['vendors'][vendorName] = {
                      total: 0,
                      percent: 0,
                    };
                  }
                  byPlasmaFruitsTP[sub]['vendors'][vendorName]['total'] +=
                    inspection['grading_result']['classification_summary']?.[
                      k
                    ]?.[sub] || 0;

                  setChartData(
                    inspection,
                    byDemographyPlasma,
                    'tp',
                    'monthly',
                    monthYear,
                    k,
                    sub,
                    true
                  );
                  setChartData(
                    inspection,
                    byDemographyPlasma,
                    'tp',
                    'weekly',
                    week,
                    k,
                    sub,
                    true
                  );
                  setChartData(
                    inspection,
                    byDemographyPlasma,
                    'tp',
                    'daily',
                    day,
                    k,
                    sub,
                    true
                  );
                } else {
                  byPlasmaFruitsSize[sub]['total'] +=
                    inspection['grading_result']['classification_summary']?.[
                      k
                    ]?.[sub] || 0;

                  if (
                    !Object.keys(byPlasmaFruitsSize[sub]['vendors']).includes(
                      vendorName
                    )
                  ) {
                    byPlasmaFruitsSize[sub]['vendors'][vendorName] = {
                      total: 0,
                      percent: 0,
                    };
                  }
                  byPlasmaFruitsSize[sub]['vendors'][vendorName]['total'] +=
                    inspection['grading_result']['classification_summary']?.[
                      k
                    ]?.[sub] || 0;

                  setChartData(
                    inspection,
                    byDemographyPlasma,
                    'size',
                    'monthly',
                    monthYear,
                    k,
                    sub,
                    true
                  );
                  setChartData(
                    inspection,
                    byDemographyPlasma,
                    'size',
                    'weekly',
                    week,
                    k,
                    sub,
                    true
                  );
                  setChartData(
                    inspection,
                    byDemographyPlasma,
                    'size',
                    'daily',
                    day,
                    k,
                    sub,
                    true
                  );
                }
              });

              return curr;
            }, byVendorPlasmaAccepted[vendorName]['demography']);
        }
      });

      byVendorIntiAccepted = Object.keys(byVendorIntiAccepted)
        .map((key) => {
          const demography = byVendorIntiAccepted[key]['demography'];
          const total = byVendorIntiAccepted[key]['total'];
          const totalTandan = byVendorIntiAccepted[key]['total_tandan'];
          return {
            label: key,
            total: total,
            percent: countPercentage(total, totalTandan),
            demography: Object.keys(demography)
              .map((kd) => ({
                label: kd,
                total: demography[kd]['total'],
                percent: countPercentage(demography[kd]['total'], totalTandan),
              }))
              .sort(
                (a, b) =>
                  KLASIFIKASI_SORTING.indexOf(a.label) -
                  KLASIFIKASI_SORTING.indexOf(b.label)
              ),
          };
        })
        .filter((e) => e.total > 0);
      byVendorPlasmaAccepted = Object.keys(byVendorPlasmaAccepted)
        .map((key) => {
          const demography = byVendorPlasmaAccepted[key]['demography'];
          const total = byVendorPlasmaAccepted[key]['total'];
          const totalTandan = byVendorPlasmaAccepted[key]['total_tandan'];
          return {
            label: key,
            total: byVendorPlasmaAccepted[key]['total'],
            percent: countPercentage(
              byVendorPlasmaAccepted[key]['total'],
              totalTandan
            ),
            demography: Object.keys(demography)
              .map((kd) => ({
                label: kd,
                total: demography[kd]['total'],
                percent: countPercentage(demography[kd]['total'], totalTandan),
              }))
              .sort(
                (a, b) =>
                  KLASIFIKASI_SORTING.indexOf(a.label) -
                  KLASIFIKASI_SORTING.indexOf(b.label)
              ),
          };
        })
        .filter((e) => e.total > 0);
      byIntiFruits = Object.keys(byIntiFruits).map((key) => {
        let total = byIntiFruits[key]['total'];
        let vendors = byIntiFruits[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalIntiFruits),
          vendors: mapVendorData(vendors, total),
        };
      });
      byIntiFruitsSize = Object.keys(byIntiFruitsSize).map((key) => {
        let total = byIntiFruitsSize[key]['total'];
        let vendors = byIntiFruitsSize[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalIntiFruits),
          vendors: mapVendorData(vendors, total),
        };
      });
      byIntiFruitsTP = Object.keys(byIntiFruitsTP).map((key) => {
        let total = byIntiFruitsTP[key]['total'];
        let vendors = byIntiFruitsTP[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalIntiFruits),
          vendors: mapVendorData(vendors, total),
        };
      });
      byPlasmaFruits = Object.keys(byPlasmaFruits).map((key) => {
        let total = byPlasmaFruits[key]['total'];
        let vendors = byPlasmaFruits[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalPlasmaFruits),
          vendors: mapVendorData(vendors, total),
        };
      });
      byPlasmaFruitsSize = Object.keys(byPlasmaFruitsSize).map((key) => {
        let total = byPlasmaFruitsSize[key]['total'];
        let vendors = byPlasmaFruitsSize[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalPlasmaFruits),
          vendors: mapVendorData(vendors, total),
        };
      });
      byPlasmaFruitsTP = Object.keys(byPlasmaFruitsTP).map((key) => {
        let total = byPlasmaFruitsTP[key]['total'];
        let vendors = byPlasmaFruitsTP[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalPlasmaFruits),
          vendors: mapVendorData(vendors, total),
        };
      });

      byDemographyPlasma = Object.keys(byDemographyPlasma).reduce(
        (curr, key) => {
          Object.keys(curr[key]).forEach((k) => {
            curr[key][k] = convertDemographyChartToArray(
              curr,
              key,
              k,
              totalPlasmaFruits
            );
          });
          return curr;
        },
        byDemographyPlasma
      );
      byDemographyInti = Object.keys(byDemographyInti).reduce((curr, key) => {
        Object.keys(curr[key]).forEach((k) => {
          curr[key][k] = convertDemographyChartToArray(
            curr,
            key,
            k,
            totalIntiFruits
          );
        });
        return curr;
      }, byDemographyInti);

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all data',
          {
            by_demography_plasma: byDemographyPlasma,
            by_demography_inti: byDemographyInti,
            by_inti_accepted: sortDataByKey(byVendorIntiAccepted, 'percent'),
            by_plasma_accepted: sortDataByKey(
              byVendorPlasmaAccepted,
              'percent'
            ),
            by_inti_fruits: byIntiFruits,
            by_plasma_fruits: byPlasmaFruits,
            by_inti_fruits_size: byIntiFruitsSize,
            by_inti_fruits_tp: byIntiFruitsTP,
            by_plasma_fruits_size: byPlasmaFruitsSize,
            by_plasma_fruits_tp: byPlasmaFruitsTP,
            monitoring: {
              total_tandan: totalAllTandon,
              total_grading: totalInspection,
              total_passed: totalPassed,
              total_rejected: totalRejected,
              total_fined: totalFined,
              percent_rejected: percentRejected || 0,
              percent_passed: percentAccepted || 0,
              percent_fined: percentFined || 0,
            },
          },
          {}
        )
      );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  }

  static async getDataDashboardMonitoring(req, res, next) {
    try {
      const { date_from = null, date_to = null, factory = null } = req.body;

      let q = {};

      if (date_from && date_to) {
        q['date'] = {
          $gte: new Date(date_from),
          $lte: new Date(date_to),
        };
      }
      if (factory) {
        q['factory'] = factory;
      }

      const inspections = await InspectionDataModel.find(q).lean();

      const totalAllTandon = inspections.reduce(
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

      //     0

      const totalAllTandonInti = inspections
        .filter((i) => i['vendor_type'] === '1')
        .reduce(
          (curr, acc) => Number(acc.grading_result.total_tandan || 0) + curr,
          0
        );

      const totalAllTandonPlasma = inspections
        .filter((i) => i['vendor_type'] === '2' || i['vendor_type'] === '3')
        .reduce(
          (curr, acc) => Number(acc.grading_result.total_tandan || 0) + curr,
          0
        );

      const classification = KLASIFIKASI_INTI.map((key) => {
        let vendors = {};
        const total = inspections.reduce((a, i) => {
          if (i['vendor_type'] === '1') {
            let sum = i.grading_result['classification_summary']?.[key]
              ? Number(
                  i.grading_result['classification_summary']?.[key]['TOTAL']
                )
              : 0;

            if (!Object.keys(vendors).includes(i['vendor_name'])) {
              vendors[i['vendor_name']] = 0;
            }

            vendors[i['vendor_name']] += sum;

            return a + (sum || 0);
          }

          return a + 0;
        }, 0);

        return {
          label: key.toLowerCase(),
          total: total,
          percentage: (total / totalAllTandonInti) * 100 || 0,
          vendors: Object.keys(vendors)
            .map((k) => ({
              label: k,
              total: vendors[k],
              percent: (vendors[k] / total) * 100,
            }))
            .filter((e) => e.total > 0),
        };
      });
      const subclass = SUB_KLASIFIKASI.map((key) => {
        let vendors = {};
        const total = inspections.reduce((a, i) => {
          if (i['vendor_type'] === '1') {
            let sum = Object.keys(
              i.grading_result['classification_summary']
            ).reduce((c, k) => {
              return (
                c + (i.grading_result['classification_summary'][k][key] || 0)
              );
            }, 0);

            if (!Object.keys(vendors).includes(i['vendor_name'])) {
              vendors[i['vendor_name']] = 0;
            }

            vendors[i['vendor_name']] += sum;

            return a + (sum || 0);
          }

          return a + 0;
        }, 0);

        return {
          label: key.toLowerCase(),
          total: total,
          percentage: (total / totalAllTandonInti) * 100 || 0,
          vendors: Object.keys(vendors)
            .map((k) => ({
              label: k,
              total: vendors[k],
              percent: (vendors[k] / total) * 100,
            }))
            .filter((e) => e.total > 0),
        };
      });

      const accepted_plasma = ACCEPTED_PLASMA.map((key) => {
        let vendors = {};
        const total = inspections.reduce((a, i) => {
          if (i['vendor_type'] === '2' || i['vendor_type'] === '3') {
            let sum = i.grading_result['accepted_summary']?.[key]
              ? Number(i.grading_result['accepted_summary']?.[key]['TOTAL'])
              : 0;

            if (!Object.keys(vendors).includes(i['vendor_name'])) {
              vendors[i['vendor_name']] = 0;
            }

            vendors[i['vendor_name']] += sum;

            return a + (sum || 0);
          }

          return a + 0;
        }, 0);

        return {
          label: key.toLowerCase(),
          total: total,
          percentage: (total / totalAllTandonPlasma) * 100 || 0,
          vendors: Object.keys(vendors)
            .map((k) => ({
              label: k,
              total: vendors[k],
              percent: (vendors[k] / total) * 100,
            }))
            .filter((e) => e.total > 0),
        };
      });
      const rejected_plasma = REJECTED_PLASMA.map((key) => {
        let vendors = {};
        const total = inspections.reduce((a, i) => {
          if (i['vendor_type'] === '2' || i['vendor_type'] === '3') {
            const isSub = SUB_KLASIFIKASI.includes(key);
            let sum = Object.keys(i.grading_result['rejected_summary']).reduce(
              (c, k) => {
                return isSub
                  ? c + (i.grading_result['rejected_summary'][k][key] || 0)
                  : c +
                      (i.grading_result['rejected_summary'][key]
                        ? i.grading_result['rejected_summary'][key]['TOTAL'] ||
                          0
                        : 0);
              },
              0
            );
            if (!Object.keys(vendors).includes(i['vendor_name'])) {
              vendors[i['vendor_name']] = 0;
            }

            vendors[i['vendor_name']] += sum;

            return a + (sum || 0);
          }

          return a + 0;
        }, 0);

        return {
          label: key.toLowerCase(),
          total: total,
          percentage: (total / totalAllTandonPlasma) * 100 || 0,
          vendors: Object.keys(vendors)
            .map((k) => ({
              label: k,
              total: vendors[k],
              percent: (vendors[k] / total) * 100,
            }))
            .filter((e) => e.total > 0),
        };
      });
      const fined_plasma = FINED_PLASMA.map((key) => {
        let vendors = {};
        const total = inspections.reduce((a, i) => {
          if (i['vendor_type'] === '2' || i['vendor_type'] === '3') {
            let sum = i.grading_result['fined_summary']?.[key]
              ? Number(i.grading_result['fined_summary']?.[key]['TOTAL'])
              : 0;
            if (!Object.keys(vendors).includes(i['vendor_name'])) {
              vendors[i['vendor_name']] = 0;
            }

            vendors[i['vendor_name']] += sum;

            return a + (sum || 0);
          }

          return a + 0;
        }, 0);

        return {
          label: key.toLowerCase(),
          total: total,
          percentage: (total / totalAllTandon) * 100 || 0,
          vendors: Object.keys(vendors)
            .map((k) => ({
              label: k,
              total: vendors[k],
              percent: (vendors[k] / total) * 100,
            }))
            .filter((e) => e.total > 0),
        };
      });

      const percentRejected = (totalRejected / totalAllTandon) * 100;
      const percentAccepted = (totalPassed / totalAllTandon) * 100;
      const percentFined = (totalFined / totalPassed) * 100;

      const data = {
        total_tandan: totalAllTandon,
        total_grading: totalInspection,
        total_passed: totalPassed,
        total_rejected: totalRejected,
        total_fined: totalFined,
        percent_rejected: percentRejected || 0,
        percent_passed: percentAccepted || 0,
        percent_fined: percentFined || 0,
        classification: {
          inti: {
            main: classification,
            sub: subclass,
          },
          plasma: {
            accepted: accepted_plasma,
            fined: fined_plasma,
            rejected: rejected_plasma,
          },
        },
      };

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success get all data',
            data,
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardV2Controller;
