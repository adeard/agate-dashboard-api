const MachineLogsFileModel = require('../../models/machine-logs-file');
const MachineLogsDataModel = require('../../models/machine-logs-data');
const FactoryModel = require('../../models/factory');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');

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

      // Filter by date
      if (date) {
        qp['date'] = date;
      }

      // Filter by filename
      if (filename) {
        const regexPattern = new RegExp(filename || '', 'i');
        qp['filename'] = { $regex: regexPattern };
      }

      const machineLogsFiles = await MachineLogsFileModel.aggregate([
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

      const totalData = await MachineLogsFileModel.countDocuments({
        ...query,
        ...qp,
      });

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

      // Filter by status
      if (status) {
        qp['status'] = status;
      }

      // Filter by subject
      if (subject) {
        const regexPattern = new RegExp(subject || '', 'i');
        qp['subject'] = { $regex: regexPattern };
      }

      // Filter by code
      if (code) {
        const regexPattern = new RegExp(code || '', 'i');
        qp['code'] = { $regex: regexPattern };
      }

      // Filter by filename
      if (filename) {
        const regexPattern = new RegExp(filename || '', 'i');
        qp['filename'] = { $regex: regexPattern };
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

      const machineLogsData = await MachineLogsDataModel.aggregate([
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

      const totalData = await MachineLogsDataModel.countDocuments({
        ...query,
        ...qp,
      });

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
