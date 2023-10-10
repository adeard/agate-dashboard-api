const DeviceModel = require('../../models/device');
const PlantModel = require('../../models/plant');
const MachineModel = require('../../models/machine');
const CustomerModel = require('../../models/customer');
const ItemModel = require('../../models/item');

const { createResponseSuccess } = require('../../utils/helpers');

const labelKey = {
  device: 'mac_address',
  plant: 'name',
  machine: 'name',
  customer: 'name',
  item: 'item_code',
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

      if (type === 'device') {
        datas = await DeviceModel.find({}).lean();
      }

      if (type === 'plant') {
        datas = await PlantModel.find({}).lean();
      }

      if (type === 'machine') {
        datas = await MachineModel.find({}).lean();
      }

      if (type === 'customer') {
        datas = await CustomerModel.find({}).lean();
      }

      if (type === 'item') {
        datas = await ItemModel.find({}).populate('customer').lean();
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
