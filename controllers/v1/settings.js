const FactoryModel = require('../../models/factory');
const SettingsModel = require('../../models/settings');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');

class SettingsController {
  static async getSettings(req, res, next) {
    try {
      const result = await SettingsModel.findOne({}).lean();

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get setting',
          result ?? {
            good: { min: 0, max: 0 },
            not_good: { min: 0, max: 0 },
            bad: { min: 0, max: 0 },
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async createSettings(req, res, next) {
    try {
      const body = req.body;

      await vBody('settings', body);

      const myObject = new SettingsModel(body);

      await myObject.save();

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success create new setting',
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SettingsController;
