const MachineCheckModel = require('../../models/machine-check');
const FactoryModel = require('../../models/factory');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');

const ObjectId = require('mongoose').Types.ObjectId;

class MachineCheckController {
  static async getAllMachineCheck(req, res, next) {
    try {
      const {
        factory = '',
        machine = '',
        type = '',
        start_date = '',
        end_date = '',
      } = req.query;

      const { query } = getBasicQuery(req.query);

      let qp = {};

      // Filter by factory
      if (factory) {
        qp['factory'] = new ObjectId(factory);
      }

      // Filter by machine
      if (machine) {
        const regexPattern = new RegExp(machine || '', 'i');
        qp['machine'] = { $regex: regexPattern };
      }

      // Filter by type
      if (type) {
        qp['type'] = type;
      }

      // Filter by date range
      if (start_date || end_date) {
        qp['date'] = {};
        if (start_date) {
          qp['date']['$gte'] = new Date(start_date);
        }
        if (end_date) {
          qp['date']['$lte'] = new Date(end_date);
        }
      }

      const machineChecks = await MachineCheckModel.aggregate([
        {
          $match: {
            ...query,
            ...qp,
          },
        },
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
        { $sort: { date: -1, updatedAt: -1 } },
      ]);

      const totalData = await MachineCheckModel.countDocuments({
        ...query,
        ...qp,
      });

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all machine checks',
          machineChecks,
          {
            total_data: totalData,
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getMachineCheckDetail(req, res, next) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        throw {
          code: 400,
          title: 'Bad Request',
          message: 'Invalid machine check ID',
        };
      }

      const machineCheck = await MachineCheckModel.findById(id)
        .populate('factory')
        .lean();

      if (!machineCheck) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Machine check not found',
        };
      }

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get machine check detail',
          machineCheck
        )
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MachineCheckController;
