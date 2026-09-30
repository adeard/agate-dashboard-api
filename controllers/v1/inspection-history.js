const dayjs = require('dayjs');
const FactoryModel = require('../../models/factory');
const InspectionHistoryModel = require('../../models/inspection-history');
const VendorModel = require('../../models/vendor');
const WbGradingService = require('../../services/wb-grading.service');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');

const ObjectId = require('mongoose').Types.ObjectId;

class InspectionHistoryControllers {
  static async getAllList(req, res, next) {
    try {
      const baseQuery = { ...req.body };
      delete baseQuery['factory'];
      delete baseQuery['vendor'];

      const { query, page, limit } = getBasicQuery(baseQuery, {
        parseToNumber: ['status'],
      });

      // Attempt SQL Server query
      try {
        const sqlRes = await WbGradingService.getInspectionHistory(
          {
            delivery_number: req.body.delivery_number,
            vehicle_number: req.body.vehicle_number,
            vendor_id: req.body.vendor?.[0],
          },
          { page, limit }
        );

        if (sqlRes && sqlRes.data && sqlRes.data.length > 0) {
          return res.status(200).json(
            createResponseSuccess(200, 'Success', 'Success get all data', sqlRes.data, {
              total_data: sqlRes.totalData,
            })
          );
        }
      } catch (sqlErr) {
        console.warn('[SQL Server getInspectionHistory fallback to Mongo]:', sqlErr.message);
      }

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

      if (req.body.delivery_number) {
        const regexPattern = new RegExp(req.body.delivery_number || '', 'i');
        payload['delivery_number'] = {
          $regex: regexPattern,
        };
      }

      const results = await InspectionHistoryModel.aggregate([
        {
          $match: {
            ...payload,
          },
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
          $lookup: {
            from: VendorModel.collection.name,
            localField: 'vendor',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        {
          $unwind: {
            path: '$vendor',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$factory',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
        {
          $skip: (Math.max(1, Number(page)) - 1) * Number(limit),
        },
        {
          $limit: Number(limit),
        },
        {
          $project: {
            total_tandan: 1,
            total_rejected: 1,
            vehicle_number: 1,
            waybill_number: 1,
            'vendor._id': 1,
            'vendor.name': 1,
            'factory._id': 1,
            'factory.name': 1,
            start_date: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);
      const totalData = await InspectionHistoryModel.countDocuments(payload);

      return res.status(200).json(
        createResponseSuccess(200, 'Success', 'Success get all data', results, {
          total_data: totalData,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async getDetail(req, res, next) {
    try {
      const { inspectionId } = req.params;

      let result = null;
      try {
        result = await WbGradingService.getInspectionDetail(inspectionId);
      } catch (sqlErr) {
        console.warn('[SQL Server getDetail fallback to Mongo]:', sqlErr.message);
      }

      if (!result) {
        result = await InspectionHistoryModel.findById(inspectionId)
          .populate({ path: 'factory', select: 'name _id' })
          .populate({ path: 'vendor', select: 'name _id' })
          .lean();
      }

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success get detail data',
            result
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async setupInspectionHistory(req, res, next) {
    try {
      const body = req.body;

      await vBody('inspection', body);

      await InspectionHistoryModel.create({
        ...body.summary,
        start_date: dayjs(body.summary.start_date),
        finish_date: dayjs(body.summary.finish_date),
        ...body.standard,
        ...body.grading_results,
        notes: body.notes,
      });

      return res
        .status(201)
        .json(
          createResponseSuccess(
            201,
            'Success',
            'Anda berhasil menambahkan hasil pemeriksaan'
          )
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InspectionHistoryControllers;
