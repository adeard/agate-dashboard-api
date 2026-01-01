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

      // Filter by date range (date is stored as string with time)
      if (start_date || end_date) {
        qp['date'] = {};
        if (start_date) {
          // If date doesn't include time, add start of day
          qp['date']['$gte'] = start_date.includes(':') ? start_date : `${start_date} 00:00:00`;
        }
        if (end_date) {
          // If date doesn't include time, add end of day
          qp['date']['$lte'] = end_date.includes(':') ? end_date : `${end_date} 23:59:59`;
        }
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

      // Filter by date (date is stored as string)
      if (date) {
        qp['date'] = date;
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
