const dayjs = require('dayjs');
const FactoryModel = require('../../models/factory');
const InspectionHistoryModel = require('../../models/inspection-history');
const VendorModel = require('../../models/vendor');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');
const InspectionDataModel = require('../../models/inspection-data');

const ObjectId = require('mongoose').Types.ObjectId;

const KLASIFIKASI = [
  'MENTAH',
  'KURANG MATANG',
  'MATANG',
  'LEWAT MATANG',
  'JANJANG KOSONG',
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

const countPercentage = (number = 0, divider = 1) => {
  return divider > 0 && number ? (Number(number) / Number(divider)) * 100 : 0;
};

class DashboardV2Controller {
  static async getDataDashboard(req, res, next) {
    try {
      const { year = '2024', factory = '' } = req.query;

      const inspections = await InspectionDataModel.find({
        // year: Number(year),
      });

      let byVendorIntiAccepted = {};
      let totalAcceptedInti = 0;

      let byVendorPlasmaAccepted = {};
      let totalAcceptedPlasma = 0;

      let byIntiFruits = KLASIFIKASI_INTI.reduce((curr, k) => {
        curr[k] = {
          total: 0,
          percentage: 0,
          vendors: {},
        };

        return curr;
      }, {});
      let totalIntiFruits = 0;
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

      let byPlasmaFruits = KLASIFIKASI_PLASMA.reduce((curr, k) => {
        curr[k] = {
          total: 0,
          percentage: 0,
          vendors: {},
        };

        return curr;
      }, {});
      let totalPlasmaFruits = 0;
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

      inspections.forEach((inspection) => {
        if (inspection.vendor_type === '1') {
          totalAcceptedInti +=
            inspection['grading_result']['total_accepted'] || 0;

          const vendorName = inspection['vendor_name'];
          if (!Object.keys(byVendorIntiAccepted).includes(vendorName)) {
            byVendorIntiAccepted[vendorName] = {
              total: 0,
              percent: 0,
              demography: {},
            };
          }

          byVendorIntiAccepted[vendorName]['total'] +=
            inspection['grading_result']['total_accepted'];

          byVendorIntiAccepted[vendorName]['demography'] =
            KLASIFIKASI_INTI.reduce((curr, k) => {
              if (!Object.keys(curr).includes(k)) {
                curr[k] = {
                  total: 0,
                  percent: 0,
                };
              }

              curr[k]['total'] +=
                inspection['grading_result']['accepted_summary']?.[k]?.[
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

              SUB_KLASIFIKASI.forEach((sub) => {
                if (!Object.keys(curr).includes(sub)) {
                  curr[sub] = {
                    total: 0,
                    percent: 0,
                  };
                }

                curr[sub]['total'] +=
                  inspection['grading_result']['accepted_summary']?.[k]?.[
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
            };
          }

          byVendorPlasmaAccepted[vendorName]['total'] +=
            inspection['grading_result']['total_accepted'];

          byVendorPlasmaAccepted[vendorName]['demography'] =
            KLASIFIKASI_PLASMA.reduce((curr, k) => {
              if (!Object.keys(curr).includes(k)) {
                curr[k] = {
                  total: 0,
                  percent: 0,
                };
              }

              curr[k]['total'] +=
                inspection['grading_result']['accepted_summary']?.[k]?.[
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

              SUB_KLASIFIKASI.forEach((sub) => {
                if (!Object.keys(curr).includes(sub)) {
                  curr[sub] = {
                    total: 0,
                    percent: 0,
                  };
                }

                curr[sub]['total'] +=
                  inspection['grading_result']['accepted_summary']?.[k]?.[
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
                }
              });

              return curr;
            }, byVendorPlasmaAccepted[vendorName]['demography']);
        }
      });

      byVendorIntiAccepted = Object.keys(byVendorIntiAccepted).map((key) => {
        const demography = byVendorIntiAccepted[key]['demography'];
        const total = byVendorIntiAccepted[key]['total'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalAcceptedInti),
          demography: Object.keys(demography).map((kd) => ({
            label: kd,
            total: demography[kd]['total'],
            percent: countPercentage(demography[kd]['total'], total),
          })),
        };
      });
      byVendorPlasmaAccepted = Object.keys(byVendorPlasmaAccepted).map(
        (key) => {
          const demography = byVendorPlasmaAccepted[key]['demography'];
          const total = byVendorPlasmaAccepted[key]['total'];
          return {
            label: key,
            total: byVendorPlasmaAccepted[key]['total'],
            percent: countPercentage(
              byVendorPlasmaAccepted[key]['total'],
              totalAcceptedPlasma
            ),
            demography: Object.keys(demography).map((kd) => ({
              label: kd,
              total: demography[kd]['total'],
              percent: countPercentage(demography[kd]['total'], total),
            })),
          };
        }
      );
      byIntiFruits = Object.keys(byIntiFruits).map((key) => {
        let total = byIntiFruits[key]['total'];
        let vendors = byIntiFruits[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalIntiFruits),
          vendors: Object.keys(vendors).map((kv) => {
            return {
              label: kv,
              total: vendors[kv]['total'],
              percent: countPercentage(vendors[kv]['total'], total),
            };
          }),
        };
      });
      byIntiFruitsSize = Object.keys(byIntiFruitsSize).map((key) => {
        let total = byIntiFruitsSize[key]['total'];
        let vendors = byIntiFruitsSize[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalIntiFruits),
          vendors: Object.keys(vendors).map((kv) => {
            return {
              label: kv,
              total: vendors[kv]['total'],
              percent: countPercentage(vendors[kv]['total'], total),
            };
          }),
        };
      });
      byIntiFruitsTP = Object.keys(byIntiFruitsTP).map((key) => {
        let total = byIntiFruitsTP[key]['total'];
        let vendors = byIntiFruitsTP[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalIntiFruits),
          vendors: Object.keys(vendors).map((kv) => {
            return {
              label: kv,
              total: vendors[kv]['total'],
              percent: countPercentage(vendors[kv]['total'], total),
            };
          }),
        };
      });
      byPlasmaFruits = Object.keys(byPlasmaFruits).map((key) => {
        let total = byPlasmaFruits[key]['total'];
        let vendors = byPlasmaFruits[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalPlasmaFruits),
          vendors: Object.keys(vendors).map((kv) => {
            return {
              label: kv,
              total: vendors[kv]['total'],
              percent: countPercentage(vendors[kv]['total'], total),
            };
          }),
        };
      });
      byPlasmaFruitsSize = Object.keys(byPlasmaFruitsSize).map((key) => {
        let total = byPlasmaFruitsSize[key]['total'];
        let vendors = byPlasmaFruitsSize[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalPlasmaFruits),
          vendors: Object.keys(vendors).map((kv) => {
            return {
              label: kv,
              total: vendors[kv]['total'],
              percent: countPercentage(vendors[kv]['total'], total),
            };
          }),
        };
      });
      byPlasmaFruitsTP = Object.keys(byPlasmaFruitsTP).map((key) => {
        let total = byPlasmaFruitsTP[key]['total'];
        let vendors = byPlasmaFruitsTP[key]['vendors'];
        return {
          label: key,
          total: total,
          percent: countPercentage(total, totalPlasmaFruits),
          vendors: Object.keys(vendors).map((kv) => {
            return {
              label: kv,
              total: vendors[kv]['total'],
              percent: countPercentage(vendors[kv]['total'], total),
            };
          }),
        };
      });

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all data',
          {
            by_inti_accepted: byVendorIntiAccepted,
            by_plasma_accepted: byVendorPlasmaAccepted,
            by_inti_fruits: byIntiFruits,
            by_plasma_fruits: byPlasmaFruits,
            by_inti_fruits_size: byIntiFruitsSize,
            by_inti_fruits_tp: byIntiFruitsTP,
            by_plasma_fruits_size: byPlasmaFruitsSize,
            by_plasma_fruits_tp: byPlasmaFruitsTP,
          },
          {}
        )
      );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  }
}

module.exports = DashboardV2Controller;
