const VendorModel = require('../../models/vendor');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');

class VendorController {
  static async getAllVendor(req, res, next) {
    try {
      const { name = '', factory = '' } = req.query;

      const regexPattern = new RegExp(name || '', 'i');

      const vendors = await VendorModel.find({
        name: { $regex: regexPattern },
        factory: factory,
      })
        .sort({ updatedAt: -1 })
        .lean();

      const totalData = await VendorModel.count({});

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all vendors',
          vendors,
          {
            total_data: totalData,
            page,
            limit,
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
