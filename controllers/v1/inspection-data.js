const FactoryModel = require('../../models/factory');
const InspectionDataModel = require('../../models/inspection-data');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');

class InspectionDataController {
  static async getAll(req, res, next) {
    try {
      const { name = '' } = req.query;

      let q = {};
      if (name) {
        const regexPattern = new RegExp(name || '', 'i');
        q['name'] = {
          name: { $regex: regexPattern },
        };
      }

      const inspections = await InspectionDataModel.find(q)
        .sort({ date: -1 })
        .lean();

      const totalData = await InspectionDataModel.count(q);

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all inspections',
          inspections,
          {
            total_data: totalData,
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async createNew(req, res, next) {
    try {
      const body = req.body;

      await vBody('inspection-data', body);

      await InspectionDataModel.findOneAndUpdate({ id: body['id'] }, body, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success create new inspection',
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InspectionDataController;
