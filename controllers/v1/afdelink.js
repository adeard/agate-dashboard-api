const AfdelinkModel = require('../../models/afdelink');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');

class AfdelinkController {
  static async getAllAfdelink(req, res, next) {
    try {
      const { name = '', factory = '' } = req.query;

      const regexPattern = new RegExp(name || '', 'i');

      const afdelinks = await AfdelinkModel.find({
        name: { $regex: regexPattern },
        factory: factory,
      })
        .sort({ updatedAt: -1 })
        .lean();

      const totalData = await AfdelinkModel.count({});

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all afdelinks',
          afdelinks,
          {
            total_data: totalData,
            page,
            limit,
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async createAfdelink(req, res, next) {
    try {
      const body = req.body;

      await vBody('afdelink', body);

      await AfdelinkModel.create(body);

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success create new afdelink',
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async updateAfdelink(req, res, next) {
    try {
      const { afdelinkId } = req.params;
      const body = req.body;

      await vBody('afdelink', body);

      await AfdelinkModel.findByIdAndUpdate(afdelinkId, body);

      return res
        .status(200)
        .json(
          createResponseSuccess(200, 'Success', 'Success update afdelink', {})
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AfdelinkController;
