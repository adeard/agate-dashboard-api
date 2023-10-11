const FactoryModel = require('../../models/factory');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');

class FactoryController {
  static async getAllFactory(req, res, next) {
    try {
      const { name = '' } = req.query;

      const regexPattern = new RegExp(name || '', 'i');

      const factories = await FactoryModel.find({
        name: { $regex: regexPattern },
      })
        .sort({ updatedAt: -1 })
        .lean();

      const totalData = await FactoryModel.count({});

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all factories',
          factories,
          {
            total_data: totalData,
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async createFactory(req, res, next) {
    try {
      const body = req.body;

      await vBody('factory', body);

      await FactoryModel.create(body);

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success create new factory',
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async updateFactory(req, res, next) {
    try {
      const { factoryId } = req.params;
      const body = req.body;

      await vBody('factory', body);

      await FactoryModel.findByIdAndUpdate(factoryId, body);

      return res
        .status(200)
        .json(
          createResponseSuccess(200, 'Success', 'Success update factory', {})
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FactoryController;
