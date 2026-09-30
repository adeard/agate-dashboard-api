const FactoryModel = require('../../models/factory');
const VendorV2Model = require('../../models/v2/vendor');
const VendorModel = require('../../models/vendor');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');

const ObjectId = require('mongoose').Types.ObjectId;

class VendorController {
  static async getAllVendor(req, res, next) {
    try {
      const user = req.user;
      const { name = '', factory = '' } = req.query;

      const { query } = getBasicQuery(req.query);

      let qp = {};

      if (name) {
        const regexPattern = new RegExp(name || '', 'i');
        qp['name'] = { $regex: regexPattern };
      }

      console.log({ query, qp });

      console.log({ user });

      let filter = { ...qp };
      if (factory) {
        filter['factory'] = factory;
      }

      let vendors = await VendorV2Model.find(filter).sort({ updatedAt: -1 }).lean();
      const totalData = await VendorV2Model.countDocuments(filter);

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
