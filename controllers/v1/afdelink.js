const AfdelinkModel = require('../../models/afdelink');
const FactoryModel = require('../../models/factory');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');

class AfdelinkController {
  static async getAllAfdelink(req, res, next) {
    try {
      const { name = '', factory = '' } = req.query;

      const { query } = getBasicQuery(req.query);

      const regexPattern = new RegExp(name || '', 'i');

      const afdelinks = await AfdelinkModel.aggregate([
        { $match: { ...query, name: { $regex: regexPattern } } },
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

      const totalData = await AfdelinkModel.count({});

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all afdelinks',
          afdelinks,
          {
            total_data: totalData,
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
