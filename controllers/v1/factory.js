const FactoryModel = require('../../models/factory');
const UserModel = require('../../models/user');
const VendorV2Model = require('../../models/v2/vendor');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');

class FactoryController {
  static async getAllFactory(req, res, next) {
    try {
      const user = req.user;
      const { name = '', filter = 'true' } = req.query;

      const userData = await UserModel.findById(user._id).lean();
      const factoriesFilter = userData?.access_factory;

      const regexPattern = new RegExp(name || '', 'i');

      let q = {
        name: { $regex: regexPattern },
        company: user.company,
      };

      if (filter === 'true') {
        q['_id'] = { $in: factoriesFilter };
      }

      let factories = await FactoryModel.find(q).sort({ updatedAt: -1 }).lean();

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
