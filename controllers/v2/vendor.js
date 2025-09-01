const FactoryModel = require('../../models/factory');
const VendorV2Model = require('../../models/v2/vendor');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');

const ObjectId = require('mongoose').Types.ObjectId;
class VendorV2Controller {
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

      const vendors = await VendorV2Model.aggregate([
        {
          $match: {
            ...query,
            ...qp,
            factory: new ObjectId(factory),
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
            path: '$factory',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $sort: { updatedAt: -1 } },
      ]);

      const totalData = await VendorV2Model.count({});

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

      await vBody('vendor-2', body);

      const factory = await FactoryModel.findOne({
        name: body['factory'],
      }).lean();

      if (!factory) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Factory not found',
        };
      }

      body['factory'] = factory['_id'];

      await VendorV2Model.findOneAndUpdate({ name: body['name'] }, body, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });

      return res
        .status(200)
        .json(
          createResponseSuccess(200, 'Success', 'Success create new vendor', {})
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = VendorV2Controller;
