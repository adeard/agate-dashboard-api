const { createResponseSuccess } = require('../../utils/helpers');
const FactoryModel = require('../../models/factory');
const VendorModel = require('../../models/vendor');
const VendorV2Model = require('../../models/v2/vendor');
const UserModel = require('../../models/user');

const labelKey = {
  factory: 'name',
  vendor: 'name',
};

const enumType = Object.keys(labelKey);

class OptionsController {
  static async getOptionsSelector(req, res, next) {
    try {
      const user = req.user;
      const { type } = req.params;
      const { factory = '', filter = 'true' } = req.query;

      let datas = [];
      const userData = await UserModel.findById(user._id).lean();
      const factories = userData?.access_factory;

      if (!enumType.includes(type)) {
        throw {
          code: 500,
          title: 'Tipe Tidak Ditemukan',
          message: 'Tipe filter tidak ditemukan',
        };
      }

      if (type === 'factory') {
        let q = {
          company: user.company,
        };
        if (filter === 'true') {
          q['_id'] = { $in: factories };
        }
        datas = await FactoryModel.find(q).lean();
      }

      if (type === 'vendor') {
        let q = { company: user.company };
        if (factory) {
          q['factory'] = factory;
        }
        datas = await VendorV2Model.find(q).lean();
      }

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get filter options',
          datas.map((d) => ({
            label: type === 'item' ? `${d[labelKey[type]]}` : d[labelKey[type]],
            value: d._id,
            additional_information:
              type === 'item'
                ? {
                    customer: `${d['customer']['name']}`,
                    item_name: d['item_name'],
                  }
                : null,
          }))
        )
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OptionsController;
