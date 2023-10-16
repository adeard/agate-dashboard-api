const { createResponseSuccess } = require('../../utils/helpers');
const FactoryModel = require('../../models/factory');
const VendorModel = require('../../models/vendor');

const labelKey = {
  factory: 'name',
  vendor: 'name',
};

const enumType = Object.keys(labelKey);

class OptionsController {
  static async getOptionsSelector(req, res, next) {
    try {
      const { type } = req.params;

      let datas = [];

      if (!enumType.includes(type)) {
        throw {
          code: 500,
          title: 'Tipe Tidak Ditemukan',
          message: 'Tipe filter tidak ditemukan',
        };
      }

      if (type === 'factory') {
        datas = await FactoryModel.find({}).lean();
      }

      if (type === 'vendor') {
        datas = await VendorModel.find({}).lean();
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
