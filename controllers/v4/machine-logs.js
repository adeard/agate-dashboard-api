const MachineLogsFileModel = require('../../models/machine-logs-file');
const MachineLogsDataModel = require('../../models/machine-logs-data');
const FactoryModel = require('../../models/factory');
const { createResponseSuccess } = require('../../utils/helpers');

const ObjectId = require('mongoose').Types.ObjectId;

class MachineLogsController {
  static async getAllMachineLogsFile(req, res, next) {
    try {
      const {
        factory = '',
        machine = '',
        date = '',
        filename = '',
      } = req.query;

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
        qp['date'] = date;
      }

      // Filter by filename
      if (filename) {
        qp['filename'] = { $regex: filename, $options: 'i' };
      }

      const machineLogsFiles = await MachineLogsFileModel.aggregate([
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

      const totalData = await MachineLogsFileModel.countDocuments(qp);

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all machine logs files',
          machineLogsFiles,
          {
            total_data: totalData,
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getMachineLogsFileDetail(req, res, next) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        throw {
          code: 400,
          title: 'Bad Request',
          message: 'Invalid machine logs file ID',
        };
      }

      const machineLogsFile = await MachineLogsFileModel.findById(id)
        .populate('factory')
        .lean();

      if (!machineLogsFile) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Machine logs file not found',
        };
      }

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get machine logs file detail',
          machineLogsFile
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAllMachineLogsData(req, res, next) {
    try {
      const {
        factory = '',
        machine = '',
        status = '',
        subject = '',
        code = '',
        filename = '',
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
        qp['machine'] = machine
      }

      // Filter by status
      if (status) {
        qp['status'] = status;
      }

      // Filter by subject
      if (subject) {
        qp['subject'] = { $regex: subject, $options: 'i' };
      }

      // Filter by code
      if (code) {
        qp['code'] = { $regex: code, $options: 'i' };
      }

      // Filter by filename
      if (filename) {
        qp['filename'] = { $regex: filename, $options: 'i' };
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

      const machineLogsData = await MachineLogsDataModel.aggregate([
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

      const totalData = await MachineLogsDataModel.countDocuments(qp);

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all machine logs data',
          machineLogsData,
          {
            total_data: totalData,
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getMachineLogsDataDetail(req, res, next) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        throw {
          code: 400,
          title: 'Bad Request',
          message: 'Invalid machine logs data ID',
        };
      }

      const machineLogsData = await MachineLogsDataModel.findById(id)
        .populate('factory')
        .lean();

      if (!machineLogsData) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Machine logs data not found',
        };
      }

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get machine logs data detail',
          machineLogsData
        )
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MachineLogsController;
