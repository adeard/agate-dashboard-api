const dayjs = require('dayjs');
const FactoryModel = require('../../models/factory');
const InspectionDataModel = require('../../models/inspection-data');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');

class InspectionDataController {
  static async getAll(req, res, next) {
    try {
      const {
        name = '',
        delivery_number = '',
        vehicle_number = '',
        vendor_id = '',
        date_from = '',
        date_to = '',
      } = req.query;
      const { factoryId } = req.params;

      let q = {};
      if (factoryId) {
        q['factory'] = factoryId;
      }
      if (name) {
        const regexPattern = new RegExp(name || '', 'i');
        q['name'] = {
          name: { $regex: regexPattern },
        };
      }

      if (delivery_number) {
        q['delivery_number'] = String(delivery_number).trim();
      }
      if (vehicle_number) {
        q['vehicle_number'] = String(vehicle_number).trim();
      }
      if (vendor_id) {
        q['vendor'] = vendor_id;
      }
      if (date_from && date_to) {
        q['date'] = {
          $gte: new Date(date_from),
          $lte: new Date(date_to),
        };
      }

      const inspections = await InspectionDataModel.find(q)
        .sort({ date: -1 })
        .lean();

      const totalData = await InspectionDataModel.count(q);

      const totalAllTandon = inspections.reduce(
        (curr, acc) => Number(acc.grading_result.total_tandan || 0) + curr,
        0
      );
      const totalRejected = inspections.reduce(
        (curr, acc) => Number(acc.grading_result.total_rejected || 0) + curr,
        0
      );
      const totalAccepted = inspections.reduce(
        (curr, acc) => Number(acc.grading_result.total_accepted || 0) + curr,
        0
      );
      const totalFined = inspections.reduce(
        (curr, acc) => Number(acc.grading_result.total_fined || 0) + curr,
        0
      );

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Success get all inspections',
          inspections,
          {
            total_data: totalData,
            total_accepted: totalAccepted,
            total_fined: totalFined,
            total_rejected: totalRejected,
            total_tandan: totalAllTandon,
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

      const founded = await InspectionDataModel.findOne({
        id: body['id'],
      }).lean();

      if (founded) {
        return res
          .status(200)
          .json(
            createResponseSuccess(
              200,
              'Success',
              'Inspection already integrated',
              {}
            )
          );
      }

      delete body['is_integrated'];

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
      console.log({ err });
      next(err);
    }
  }

  static async getDetail(req, res, next) {
    try {
      const { inspectionId } = req.params;

      const inspections = await InspectionDataModel.findById(
        inspectionId
      ).lean();

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success get detail inspections',
            inspections,
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InspectionDataController;
