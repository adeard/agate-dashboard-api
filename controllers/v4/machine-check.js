const MachineCheckModel = require('../../models/machine-check');
const FactoryModel = require('../../models/factory');
const { createResponseSuccess } = require('../../utils/helpers');

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
        group = '',
      } = req.query;

      let qp = {};

      // Filter by factory
      if (factory) {
        qp['factory'] = new ObjectId(factory);
      }

      // Filter by machine
      if (machine) {
        qp['machine'] = machine;
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

      if (group) {
        qp['group'] = String(group).trim;
      }

      const machineChecks = await MachineCheckModel.aggregate([
        {
          $match: qp,
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

      const totalData = await MachineCheckModel.countDocuments(qp);

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
      const { factory = '', machine = '', date = '' } = req.query;

      let qp = {};

      // Filter by factory
      if (factory) {
        qp['factory'] = new ObjectId(factory);
      }

      // Filter by machine
      if (machine) {
        qp['machine'] = { $regex: machine, $options: 'i' };
      }

      // Filter by date
      if (date) {
        qp['date'] = new Date(date);
      }

      const machineChecks = await MachineCheckModel.aggregate([
        {
          $match: qp,
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

      const totalData = await MachineCheckModel.countDocuments(qp);

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get machine check detail',
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
}

module.exports = MachineCheckController;
