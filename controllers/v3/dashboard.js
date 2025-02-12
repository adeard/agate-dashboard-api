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
  }
  object[key][time][String(timeKey)][x]['data'].push({
    value: duration,
    machine,
  });
};

const convertDemographyChartToArray = (object, main, time, divider = 1) => {
  let x = object[main][time];
  return Object.keys(x).map((key) => {
    // let total = Object.keys(x[key]).reduce(
    //   (tot, acc) => Number(tot) + Number(x[key][acc] || 0),
    //   0
    // );

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

class DashboardV2Controller {
  static async getDataDashboard(req, res, next) {
    try {
      const {
        year = new Date().getFullYear(),
        factory = '',
        date_to = null,
        date_from = null,
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

      // if (year) {
      //   q['year'] = Number(year);
      // }

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

      let allChartData = {
        summary_performance: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
        durations: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
        truck_gaps: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
        truck_fines: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
        rejected: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
        machine_utility: {
          monthly: generateTemplate(months),
          weekly: generateTemplate(weeks),
          daily: generateTemplate(days),
        },
      };

      let totalDurationInspection = 0;
      let acceptedPercents = [];
      let rejectedPercents = [];
      let finedPercents = [];

      let usageMachine = {};
      let lastFinishMachine = {};

      inspections.forEach((inspection) => {
        const { day, monthYear } = getDateMonthYearDay(
          inspection['date'],
          true
        );
        const week = getWeekNumber(inspection['date']);

        const start = dayjs(inspection.date);
        const finish = dayjs(inspection.finish_date);
        const duration = finish.diff(start, 'seconds');

        totalDurationInspection += duration;

        acceptedPercents.push(
          countPercentage(
            inspection['grading_result']['total_accepted'],
            inspection['grading_result']['total_tandan']
          )
        );
        rejectedPercents.push(
          countPercentage(
            inspection['grading_result']['total_rejected'],
            inspection['grading_result']['total_tandan']
          )
        );
        finedPercents.push(
          countPercentage(
            inspection['grading_result']['total_fined'],
            inspection['grading_result']['total_accepted']
          )
        );

        if (!usageMachine[inspection.machine]) {
          usageMachine[inspection.machine] = 0;
        }

        usageMachine[inspection.machine] += 1;

        // console.log({ grading_result: inspection['grading_result'] });

        totalAcceptedInti +=
          inspection['grading_result']['total_accepted'] || 0;

        if (lastFinishMachine?.[inspection.machine]) {
          const different = dayjs(lastFinishMachine[inspection.machine]).diff(
            start,
            'minutes'
          );
          // objectRowToAdd['Gap Truk Sebelum'].push(different);

          setChartDataTruckGap(
            Math.abs(different),
            allChartData,
            'truck_gaps',
            'monthly',
            monthYear,
            inspection.machine
          );
          setChartDataTruckGap(
            Math.abs(different),
            allChartData,
            'truck_gaps',
            'weekly',
            week,
            inspection.machine
          );
          setChartDataTruckGap(
            Math.abs(different),
            allChartData,
            'truck_gaps',
            'daily',
            day,
            inspection.machine
          );
          lastFinishMachine[inspection.machine] = finish;
        } else {
          // objectRowToAdd['Gap Truk Sebelum'].push('');
          lastFinishMachine[inspection.machine] = finish;
        }

        setChartDataTruckGap(
          1,
          allChartData,
          'machine_utility',
          'monthly',
          monthYear,
          inspection.machine
        );
        setChartDataTruckGap(
          1,
          allChartData,
          'machine_utility',
          'weekly',
          week,
          inspection.machine
        );
        setChartDataTruckGap(
          1,
          allChartData,
          'machine_utility',
          'daily',
          day,
          inspection.machine
        );

        setChartDataDuration(
          duration,
          allChartData,
          'durations',
          'monthly',
          monthYear,
          'duration'
        );
        setChartDataDuration(
          duration,
          allChartData,
          'durations',
          'weekly',
          week,
          'duration'
        );
        setChartDataDuration(
          duration,
          allChartData,
          'durations',
          'daily',
          day,
          'duration'
        );

        setChartDataDuration(
          inspection.grading_result.total_fined * 2,
          allChartData,
          'truck_fines',
          'monthly',
          monthYear,
          'fine'
        );
        setChartDataDuration(
          inspection.grading_result.total_fined * 2,
          allChartData,
          'truck_fines',
          'weekly',
          week,
          'fine'
        );
        setChartDataDuration(
          inspection.grading_result.total_fined * 2,
          allChartData,
          'truck_fines',
          'daily',
          day,
          'fine'
        );

        setChartDataDuration(
          inspection.grading_result.total_rejected,
          allChartData,
          'rejected',
          'monthly',
          monthYear,
          'reject'
        );
        setChartDataDuration(
          inspection.grading_result.total_rejected,
          allChartData,
          'rejected',
          'weekly',
          week,
          'reject'
        );
        setChartDataDuration(
          inspection.grading_result.total_rejected,
          allChartData,
          'rejected',
          'daily',
          day,
          'reject'
        );

        setChartDataPerformance(
          inspection,
          allChartData,
          'summary_performance',
          'monthly',
          monthYear,
          'total_accepted'
        );
        setChartDataPerformance(
          inspection,
          allChartData,
          'summary_performance',
          'monthly',
          monthYear,
          'total_rejected'
        );
        setChartDataPerformance(
          inspection,
          allChartData,
          'summary_performance',
          'monthly',
          monthYear,
          'total_fined'
        );

        setChartDataPerformance(
          inspection,
          allChartData,
          'summary_performance',
          'weekly',
          week,
          'total_accepted'
        );
        setChartDataPerformance(
          inspection,
          allChartData,
          'summary_performance',
          'weekly',
          week,
          'total_rejected'
        );
        setChartDataPerformance(
          inspection,
          allChartData,
          'summary_performance',
          'weekly',
          week,
          'total_fined'
        );

        setChartDataPerformance(
          inspection,
          allChartData,
          'summary_performance',
          'daily',
          day,
          'total_accepted'
        );
        setChartDataPerformance(
          inspection,
          allChartData,
          'summary_performance',
          'daily',
          day,
          'total_rejected'
        );
        setChartDataPerformance(
          inspection,
          allChartData,
          'summary_performance',
          'daily',
          day,
          'total_fined'
        );

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

            if (!Object.keys(byIntiFruits[k]['vendors']).includes(vendorName)) {
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
                  inspection['grading_result']['classification_summary']?.[k]?.[
                    sub
                  ] || 0;

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
                  inspection['grading_result']['classification_summary']?.[k]?.[
                    sub
                  ] || 0;

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
                  inspection['grading_result']['classification_summary']?.[k]?.[
                    sub
                  ] || 0;

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
                  inspection['grading_result']['classification_summary']?.[k]?.[
                    sub
                  ] || 0;

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

      let { average: averageAccepted } = getStats(acceptedPercents);
      let { average: averageRejected } = getStats(rejectedPercents);
      let { average: averageFined } = getStats(finedPercents);

      let machineUtility = Object.keys(usageMachine).map((key) => {
        return {
          machine: key,
          percent: countPercentage(usageMachine[key], totalInspection),
          value: usageMachine[key],
        };
      });

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all data',
          {
            // average: {
            //   accepted: `${Number(averageAccepted).toFixed(1)}%`,
            //   rejected: `${Number(averageRejected).toFixed(1)}%`,
            //   fined: `${Number(averageFined).toFixed(1)}%`,
            //   duration:
            //     Math.ceil(
            //       Math.ceil(totalDurationInspection / totalInspection) / 60
            //     ) + ' Min',
            // },
            // machine_utility: machineUtility,
            charts_data: {
              machine_utility: Object.keys(allChartData.machine_utility).reduce(
                (mObj, kTime) => {
                  if (!mObj[kTime]) {
                    mObj[kTime] = [];
                  }

                  mObj[kTime] = Object.entries(
                    allChartData.machine_utility[kTime]
                  ).map(([month, value]) => {
                    const sumValue = value.machines?.data
                      ? value.machines.data?.reduce(
                          (prev, curr) => prev + Number(curr?.value || 0),
                          0
                        )
                      : 0;
                    const machineObject = value.machines?.data
                      ? value.machines?.data.reduce((obj, data) => {
                          if (!obj[data.machine]) {
                            obj[data.machine] = 0;
                          }

                          obj[data.machine] += data?.value || 0;
                          return obj;
                        }, {})
                      : {};

                    return {
                      title: month,
                      data: Object.entries(machineObject).map(
                        ([machine, value]) => {
                          return {
                            name: machine,
                            total:
                              sumValue > 0
                                ? Math.round(countPercentage(value, sumValue))
                                : 0,
                          };
                        }
                      ),
                      sumValue,
                    };
                  });

                  return mObj;
                },
                {}
              ),
              summary_performance: converToObjectData(
                allChartData.summary_performance
              ),
              durations: Object.keys(allChartData.durations).reduce(
                (o, key) => {
                  if (!o[key]) {
                    o[key] = {};
                  }

                  o[key] = Object.keys(allChartData.durations[key]).map((k) => {
                    const { average, highest, lowest } = getStats(
                      allChartData.durations[key][k]['duration']?.data || []
                    );

                    return {
                      title: k,
                      data: allChartData.durations[key][k]['duration']?.data
                        ? [
                            {
                              name: 'Highest',
                              total: Math.ceil(highest / 60),
                            },
                            {
                              name: 'Average',
                              total: Math.ceil(average / 60),
                            },
                            {
                              name: 'Lowest',
                              total: Math.ceil(lowest / 60),
                            },
                          ]
                        : [],
                    };
                  });

                  return o;
                },
                {}
              ),
              truck_gaps: Object.keys(allChartData.truck_gaps).reduce(
                (output, key) => {
                  if (!output[key]) {
                    output[key] = {};
                  }

                  output[key] = Object.keys(allChartData.truck_gaps[key]).map(
                    (timeKey) => {
                      const gapData =
                        allChartData.truck_gaps[key][timeKey]?.machines?.data ||
                        [];

                      // Group by machine
                      const machineGroups = gapData.reduce((groups, item) => {
                        if (!groups[item.machine]) {
                          groups[item.machine] = [];
                        }
                        groups[item.machine].push(item.value);
                        return groups;
                      }, {});

                      // Calculate stats for each machine and store in object
                      const machineStats = {
                        All: (() => {
                          const allDifferences = gapData.map(
                            (item) => item.value
                          );
                          // const highest = Math.max(...allDifferences);
                          // const lowest = Math.min(...allDifferences);
                          // const average =
                          //   allDifferences.reduce((a, b) => a + b, 0) /
                          //   allDifferences.length;
                          const { average, highest, lowest } =
                            getStats(allDifferences);

                          return [
                            {
                              name: 'Highest',
                              total: Math.ceil(Math.abs(highest)),
                            },
                            {
                              name: 'Average',
                              total: Math.ceil(Math.abs(average)),
                            },
                            {
                              name: 'Lowest',
                              total: Math.ceil(Math.abs(lowest)),
                            },
                          ];
                        })(),
                      };

                      // Add individual machine stats
                      Object.keys(machineGroups).forEach((machineNumber) => {
                        const differences = machineGroups[machineNumber];
                        const { average, highest, lowest } =
                          getStats(differences);

                        machineStats[`${machineNumber}`] = [
                          {
                            name: 'Highest',
                            total: Math.ceil(Math.abs(highest)),
                          },
                          {
                            name: 'Average',
                            total: Math.ceil(Math.abs(average)),
                          },
                          {
                            name: 'Lowest',
                            total: Math.ceil(Math.abs(lowest)),
                          },
                        ];
                      });

                      return {
                        title: timeKey,
                        data: machineStats,
                      };
                    }
                  );

                  return output;
                },
                {}
              ),
              truck_fines: Object.keys(allChartData.truck_fines).reduce(
                (o, key) => {
                  if (!o[key]) {
                    o[key] = {};
                  }

                  o[key] = Object.keys(allChartData.truck_fines[key]).map(
                    (k) => {
                      const { average, highest, lowest } = getStats(
                        allChartData.truck_fines[key][k]['fine']?.data || []
                      );

                      return {
                        title: k,
                        data: allChartData.truck_fines[key][k]['fine']?.data
                          ? [
                              {
                                name: 'Highest',
                                total: Math.ceil(highest),
                              },
                              {
                                name: 'Average',
                                total: Math.ceil(average),
                              },
                              {
                                name: 'Lowest',
                                total: Math.ceil(lowest),
                              },
                            ]
                          : [],
                      };
                    }
                  );

                  return o;
                },
                {}
              ),
              rejected: Object.keys(allChartData.rejected).reduce((o, key) => {
                if (!o[key]) {
                  o[key] = {};
                }

                o[key] = Object.keys(allChartData.rejected[key]).map((k) => {
                  const { average, highest, lowest } = getStats(
                    allChartData.rejected[key][k]['reject']?.data || []
                  );

                  return {
                    title: k,
                    data: allChartData.rejected[key][k]['reject']?.data
                      ? [
                          {
                            name: 'Highest',
                            total: Math.ceil(highest),
                          },
                          {
                            name: 'Average',
                            total: Math.ceil(average),
                          },
                          {
                            name: 'Lowest',
                            total: Math.ceil(lowest),
                          },
                        ]
                      : [],
                  };
                });

                return o;
              }, {}),
              demography: byDemographyInti,
            },
            // by_demography_plasma: byDemographyPlasma,
            // by_demography: byDemographyInti,
            // by_plasma_accepted: sortDataByKey(
            //   byVendorPlasmaAccepted,
            //   'percent'
            // ),
            by_vendor_accepted: sortDataByKey(byVendorIntiAccepted, 'percent'),
            by_fruits: byIntiFruits,
            by_fruits_tp: byIntiFruitsTP,
            by_fruits_size: byIntiFruitsSize,
            // by_plasma_fruits: byPlasmaFruits,
            // by_plasma_fruits_size: byPlasmaFruitsSize,
            // by_plasma_fruits_tp: byPlasmaFruitsTP,
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

      // const getTotalFruitClassification = (type) => {
      //   const total = results.reduce(
      //     (curr, acc) => curr + Number(acc[type] || 0),
      //     0
      //   );
      //   return {
      //     total,
      //     percent: (total / totalGraded) * 100,
      //   };
      // };

      const totalAllTandonInti = inspections
        .filter((i) => i['vendor_type'] === '1')
        .reduce(
          (curr, acc) => Number(acc.grading_result.total_tandan || 0) + curr,
          0
        );

      const totalAllTandonPlasma = inspections
        .filter((i) => i['vendor_type'] === '2')
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
          if (i['vendor_type'] === '2') {
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
          if (i['vendor_type'] === '2') {
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
          if (i['vendor_type'] === '2') {
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
