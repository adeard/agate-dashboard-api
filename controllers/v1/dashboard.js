const dayjs = require('dayjs');
const FactoryModel = require('../../models/factory');
const InspectionHistoryModel = require('../../models/inspection-history');
const VendorModel = require('../../models/vendor');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');

const ObjectId = require('mongoose').Types.ObjectId;

class DashboardController {
  static async getDataDashboard(req, res, next) {
    try {
      const baseQuery = { ...req.body };
      delete baseQuery['factory'];
      delete baseQuery['vendor'];

      const { query, page, limit } = getBasicQuery(baseQuery, {
        parseToNumber: ['status'],
      });

      let payload = { ...query };

      if (req.body.factory) {
        payload['factory'] = {
          $in: req.body.factory.map((d) => new ObjectId(d)),
        };
      }

      if (req.body.vendor) {
        payload['vendor'] = {
          $in: req.body.vendor.map((d) => new ObjectId(d)),
        };
      }

      const results = await InspectionHistoryModel.aggregate([
        {
          $match: {},
        },
        {
          $lookup: {
            from: FactoryModel.collection.name,
            localField: 'factory',
            foreignField: '_id',
            as: 'factory',
          },
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
        {
          $project: {
            total_tandon: 1,
            total_received: 1,
            total_rejected: 1,
            vehicle_number: 1,
            waybill_number: 1,
            unripe: 1,
            ripe: 1,
            half_ripe: 1,
            over_ripe: 1,
            rotten: 1,
            pest_infection: 1,
            long_stash: 1,
            total_in_kg: 1,
          },
        },
      ]);
      const totalData = await InspectionHistoryModel.countDocuments({});

      const totalAllTandon = results.reduce(
        (curr, acc) => Number(acc.total_tandon || 0) + curr,
        0
      );
      const totalRejected = results.reduce(
        (curr, acc) => Number(acc.total_rejected || 0) + curr,
        0
      );
      const totalPassed = results.reduce(
        (curr, acc) => Number(acc.total_received || 0) + curr,
        0
      );
      const totalGraded = results.reduce((curr, acc) => {
        return (
          curr +
          Number(acc.ripe || 0) +
          Number(acc.unripe || 0) +
          Number(acc.half_ripe || 0) +
          Number(acc.over_ripe || 0) +
          Number(acc.rotten || 0) +
          Number(acc.pest_infection || 0) +
          Number(acc.long_stash || 0)
        );
      }, 0);
      const totalWeight = results.reduce(
        (curr, acc) => Number(acc.total_in_kg || 0) + curr,
        0
      );

      const getTotalFruitClassification = (type) => {
        const total = results.reduce(
          (curr, acc) => curr + Number(acc[type] || 0),
          0
        );
        return {
          total,
          percent: (total / totalGraded) * 100 + '%',
        };
      };

      const percentRejected = (totalRejected / totalAllTandon) * 100 + '%';

      const data = {
        total_grading: totalData,
        total_tbs_graded: totalGraded,
        tbs_avg_weight: Number(totalWeight / totalGraded).toFixed(2) + 'kg',
        total_passed: totalPassed,
        total_rejected: totalRejected,
        percent_rejected: percentRejected,
        classifications: {
          ripe: getTotalFruitClassification('ripe'),
          unripe: getTotalFruitClassification('unripe'),
          half_ripe: getTotalFruitClassification('half_ripe'),
          over_ripe: getTotalFruitClassification('over_ripe'),
          rotten: getTotalFruitClassification('rotten'),
          pest_infection: getTotalFruitClassification('pest_infection'),
          long_stash: getTotalFruitClassification('long_stash'),
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
}

module.exports = DashboardController;
