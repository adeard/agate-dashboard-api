const dayjs = require('dayjs');
const FactoryModel = require('../../models/factory');
const InspectionHistoryModel = require('../../models/inspection-history');
const VendorModel = require('../../models/vendor');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');
const InspectionDataModel = require('../../models/inspection-data');

const ObjectId = require('mongoose').Types.ObjectId;

const CLASSIFICAITON_ENUM = [
  'unripe',
  'half_ripe',
  'ripe',
  'over_ripe',
  'rotten',
  'pest_infection',
  'long_stash',
];

const KLASIFIKASI = [
  'MENTAH',
  'KURANG MATANG',
  'MATANG',
  'LEWAT MATANG',
  'JANJANG KOSONG',
];

const SUB_KLASIFIKASI = [
  'TANGKAI PANJANG',
  'BUAH KECIL DIBAWAH 3KG',
  'BUAH KECIL DIBAWAH 5KG',
];

class DashboardController {

  //       0
  //       0
  //       0
  //         curr +
  //         Number(acc.ripe || 0) +
  //         Number(acc.unripe || 0) +
  //         Number(acc.half_ripe || 0) +
  //         Number(acc.over_ripe || 0) +
  //         Number(acc.rotten || 0) +
  //         Number(acc.pest_infection || 0) +
  //       0

  //         0

  //       .json(
  //         createResponseSuccess(

  static async getDataDashboard(req, res, next) {
    try {
      const inspections = await InspectionDataModel.find({});

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

      const classification = KLASIFIKASI.map((key) => {
        const total = inspections.reduce((a, i) => {
          let sum = i.grading_result['classification_summary']?.[key]
            ? Number(i.grading_result['classification_summary']?.[key]['TOTAL'])
            : 0;

          return a + (sum || 0);
        }, 0);

        return {
          label: key.toLowerCase(),
          total: total,
          percentage: (total / totalAllTandon) * 100,
        };
      });

      const subclass = SUB_KLASIFIKASI.map((key) => {
        const total = inspections.reduce((a, i) => {
          let sum = Object.keys(
            i.grading_result['classification_summary']
          ).reduce((c, k) => {
            return (
              c + (i.grading_result['classification_summary'][k][key] || 0)
            );
          }, 0);

          return a + (sum || 0);
        }, 0);

        return {
          label: key.toLowerCase(),
          total: total,
          percentage: (total / totalAllTandon) * 100,
        };
      });

      const percentRejected = (totalRejected / totalAllTandon) * 100;
      const percentAccepted = (totalPassed / totalAllTandon) * 100;

      const data = {
        total_tandan: totalAllTandon,
        total_grading: totalInspection,
        total_passed: totalPassed,
        total_rejected: totalRejected,
        total_fined: totalFined,
        percent_rejected: percentRejected,
        percent_passed: percentAccepted,
        classification: [...classification, ...subclass],
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

  static async getDetail(req, res, next) {
    try {
      const result = await InspectionHistoryModel.find()
        .select(
          'factory vendor waybill_number vehicle_number total_tandon total_received total_rejected start_date createdAt'
        )
        .populate({ path: 'factory', select: 'name _id' })
        .populate({ path: 'vendor', select: 'name _id' })
        .lean();

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success get detail grading',
            result
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getDetailClassification(req, res, next) {
    try {
      const { type } = req.query;

      if (!CLASSIFICAITON_ENUM.includes(type)) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Classification type not found.',
        };
      }

      let result = await InspectionHistoryModel.find({
        [type]: {
          $gt: 0,
        },
      })
        .populate({ path: 'vendor', select: 'name _id' })
        .lean();

      result = result.map((r) => {
        return {
          vendor: r.vendor,
          total: r[type],
          percentage: (r[type] / r.total_tandon) * 100,
        };
      });

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success get detail grading by classification',
            result
          )
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;
