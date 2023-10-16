const { hashPassword, comparePass } = require('../../lib/bcrypt');
const { decodeToken } = require('../../lib/jwt');
const FactoryModel = require('../../models/factory');
const InspectionHistoryModel = require('../../models/inspection-history');
const UserModel = require('../../models/user');
const VendorModel = require('../../models/vendor');
const { sendEmail } = require('../../utils/email');
const {
  createResponseSuccess,
  generateRandomPassword,
} = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');

class InspectionHistoryControllers {
  static async getAllList(req, res, next) {
    try {
      const { query, page, limit } = getBasicQuery(req.query, {
        parseToNumber: ['status'],
      });

      const users = await InspectionHistoryModel.aggregate([
        {
          $match: {
            ...query,
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
          $unwind: {
            path: '$vendor',
            preserveNullAndEmptyArrays: true,
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
          $skip: Number(page) * Number(limit),
        },
        {
          $limit: Number(limit),
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
        {
          $project: {
            total_tandon: 1,
            rejected: 1,
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
      const totalData = await InspectionHistoryModel.countDocuments({});

      return res.status(200).json(
        createResponseSuccess(200, 'Success', 'Success get all data', users, {
          total_data: totalData,
        })
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
        ...body.standart,
        ...body.grading_results,
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
