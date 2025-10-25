const FactoryModel = require('../../models/factory');
const VendorV2Model = require('../../models/v2/vendor');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');

class FactoryController {
  static async getAllFactory(req, res, next) {
    try {
      const user = req.user;
      const { name = '' } = req.query;

      const regexPattern = new RegExp(name || '', 'i');

      let factories = await FactoryModel.find({
        name: { $regex: regexPattern },
        company: user.company,
      })
        .sort({ updatedAt: -1 })
        .lean();

      let populated = [];

      await factories.reduce(async (p, fac) => {
        await p;
        const totalVendor = await VendorV2Model.count({ factory: fac._id });

        fac['total_vendor'] = totalVendor;

        populated.push(fac);
      }, Promise.resolve());

      const totalData = await FactoryModel.count({});

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all factories',
          populated,
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
      const user = req.user;
      const body = req.body;

      await vBody('factory', body);

      await FactoryModel.create({ company: user.company, ...body });

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
