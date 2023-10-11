const FactoryModel = require('../../models/factory');
const VendorModel = require('../../models/vendor');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');

class VendorController {
  static async getAllVendor(req, res, next) {
    try {
      const { name = '', factory = '' } = req.query;

      const { query } = getBasicQuery(req.query);

      const regexPattern = new RegExp(name || '', 'i');

      const vendors = await VendorModel.aggregate([
        { $match: { ...query, name: { $regex: regexPattern } } },
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
            path: '$factory',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $sort: { updatedAt: -1 } },
      ]);

      const totalData = await VendorModel.count({});

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all vendors',
          vendors,
          {
            total_data: totalData,
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async createVendor(req, res, next) {
    try {
      const body = req.body;

      await vBody('vendor', body);

      await VendorModel.create(body);

      return res
        .status(200)
        .json(
          createResponseSuccess(200, 'Success', 'Success create new vendor', {})
        );
    } catch (err) {
      next(err);
    }
  }

  static async updateVendor(req, res, next) {
    try {
      const { vendorId } = req.params;
      const body = req.body;

      await vBody('vendor', body);

      await VendorModel.findByIdAndUpdate(vendorId, body);

      return res
        .status(200)
        .json(
          createResponseSuccess(200, 'Success', 'Success update vendor', {})
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = VendorController;
