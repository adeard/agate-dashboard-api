const dayjs = require('dayjs');
const FactoryModel = require('../../models/factory');
const InspectionDataModel = require('../../models/inspection-data');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');
const generatePdf = require('../../lib/pdf');

const countPercentage = (number = 0, divider = 1) => {
  return divider > 0 && number ? (Number(number) / Number(divider)) * 100 : 0;
};
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

  static async downloadExcel(req, res, next) {
    try {
      const { factoryId } = req.params;

      let q = {};
      if (factoryId) {
        q['factory'] = factoryId;
      }

      const inspections = await InspectionDataModel.find(q)
        .sort({ date: -1 })
        .lean();

      let template = [
        [
          'No',
          'Waktu',
          'Vendor',
          'Nomor Surat Jalan',
          'Nomor Plat Kendaraan',
          'Total Tandan',
          'Diterima',
          'Didenda',
          'Ditolak',
        ],
      ];

      inspections.forEach((ins, index) => {
        template.push([
          index + 1,
          dayjs(ins.date).format('DD/MM/YYYY HH:mm'),
          ins.vendor_name,
          ins.delivery_number,
          ins.vehicle_number,
          ins.grading_result ? ins.grading_result.total_tandan : 0,
          ins.grading_result ? ins.grading_result.total_accepted : 0,
          ins.grading_result ? ins.grading_result.total_fined : 0,
          ins.grading_result ? ins.grading_result.total_rejected : 0,
        ]);
      });

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success get all inspections',
            template
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async downloadDetailPdf(req, res, next) {
    try {
      const { inspectionId } = req.params;

      const inspections = await InspectionDataModel.findById(
        inspectionId
      ).lean();

      if (!inspections) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Pemeriksaan tidak ditemukan.',
        };
      }

      let acceptedSummary = inspections.grading_result.accepted_summary;
      let rejectedSummary = inspections.grading_result.rejected_summary;
      let finedSummary = inspections.grading_result.fined_summary;
      let classificationSummary =
        inspections.grading_result.classification_summary;

      let acceptedData = Object.keys(acceptedSummary).map((k) => {
        return {
          label: k,
          ...acceptedSummary[k],
        };
      });
      let rejectedData = Object.keys(rejectedSummary).map((k) => {
        return {
          label: k,
          ...rejectedSummary[k],
        };
      });
      let finedData = Object.keys(finedSummary).map((k) => {
        return {
          label: k,
          ...finedSummary[k],
          'TOTAL DENDA': finedSummary[k]['TOTAL'] * finedSummary[k]['DENDA'],
        };
      });
      let classificationData = Object.keys(classificationSummary).map((k) => {
        return {
          label: k,
          ...classificationSummary[k],
        };
      });

      let total_accepted_percent =
        inspections['grading_result']['total_accepted'] > 0
          ? countPercentage(
              inspections['grading_result']['total_accepted'],
              inspections['grading_result']['total_tandan']
            )
          : 0;
      let total_rejected_percent =
        inspections['grading_result']['total_rejected'] > 0
          ? countPercentage(
              inspections['grading_result']['total_rejected'],
              inspections['grading_result']['total_tandan']
            )
          : 0;
      let total_fined_percent =
        inspections['grading_result']['total_fined'] > 0
          ? countPercentage(
              inspections['grading_result']['total_fined'],
              inspections['grading_result']['total_accepted']
            )
          : 0;

      let data = {
        location: 'Langling, Jambi',
        vendor_type:
          Number(inspections['vendor_type']) === 1 ? 'Inti' : 'Plasma',
        vendor: inspections['vendor_name'],
        delivery_number: inspections['delivery_number'],
        vehicle_number: inspections['vehicle_number'],
        date: dayjs(inspections['date']).format('DD/MM/YYYY HH:mm:ss'),
        finish_date: dayjs(inspections['finish_date']).format(
          'DD/MM/YYYY HH:mm:ss'
        ),
        grading_result: {
          total_tandan: inspections['grading_result']['total_tandan'],
          total_accepted: inspections['grading_result']['total_accepted'],
          total_rejected: inspections['grading_result']['total_rejected'],
          total_fined: inspections['grading_result']['total_fined'],
          total_accepted_percent,
          total_fined_percent,
          total_rejected_percent,
          total_percent: total_rejected_percent + total_accepted_percent,
        },
        classification_result: classificationData,
        accepted_result: acceptedData.length ? acceptedData : null,
        rejected_result: rejectedData.length ? rejectedData : null,
        fined_result: finedData.length ? finedData : null,
      };

      let template = `lib/pdf/templates/grading-result.html`;

      return generatePdf(data, template, res);

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success get detail inspections',
            data,
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InspectionDataController;
