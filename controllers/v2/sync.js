const { default: axios } = require('axios');
const FactoryModel = require('../../models/factory');
const InspectionDataModel = require('../../models/inspection-data');
const VendorV2Model = require('../../models/v2/vendor');
const WABroadcastModel = require('../../models/wa-broadcast');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');
const dayjs = require('dayjs');

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

class SyncDataController {
  static async syncVendor(req, res, next) {
    try {
      const body = req.body;

      await vBody('vendor-2', body);

      const factory = await FactoryModel.findOne({
        name: body['factory'],
      }).lean();

      if (!factory) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Factory not found',
        };
      }

      const founded = VendorV2Model.findOne({ name: body['name'] }).lean();

      if (!founded) {
        throw {
          code: 400,
          title: 'Founded',
          message: 'Vendor already exist',
        };
      }

      body['factory'] = factory._id;

      await VendorV2Model.findOneAndUpdate({ name: body['name'] }, body, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });

      return res
        .status(200)
        .json(createResponseSuccess(200, 'Success', 'Success sync vendor', {}));
    } catch (err) {
      next(err);
    }
  }

  static async syncInspection(req, res, next) {
    try {
      const body = req.body;
      const { direct = null } = req.query;

      const factory = await FactoryModel.findOne({
        name: body['factory'],
      }).lean();

      if (!factory) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Factory not found',
        };
      }

      const vendor = await VendorV2Model.findOne({
        id: body['vendor_id'],
      }).lean();

      if (!vendor) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Vendor not found',
        };
      }

      const founded = await InspectionDataModel.findOne({
        id: body['id'],
      }).lean();

      if (founded) {
        return res.status(200).json(
          createResponseSuccess(
            200,
            'Success',
            'Inspection already integrated',
            {
              data: true,
            }
          )
        );
      }

      delete body['is_integrated'];

      await vBody('inspection-data', body);

      body['factory'] = factory._id;
      body['vendor'] = vendor._id;

      const doc = await InspectionDataModel.findOneAndUpdate(
        { id: body['id'] },
        body,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      if (direct) {
        const finedObject = {};
        const finedSummary = doc.grading_result.fined_summary;
        const fined = Object.keys(finedSummary);

        let totalFined = 0;
        let totalFinedKg = 0;

        if (fined.length) {
          fined.forEach((key) => {
            if (!finedObject[key]) {
              let total = finedSummary[key]['TOTAL'];
              let finedKg = finedSummary[key]['DENDA'];
              finedObject[key] = `${total} Jjg / ${Math.round(
                Number(total) * Number(finedKg)
              )}kg`;

              totalFined += total;
              totalFinedKg += finedKg;
            }
          });
        }

        const totalAccepted = Number(doc.grading_result.total_accepted);
        const totalRejected = Number(doc.grading_result.total_rejected);
        const totalTandan = Number(doc.grading_result.total_tandan);

        const percentRejected =
          totalTandan > 0
            ? ((totalRejected || 0) / (totalTandan || 1)) * 100
            : 0;
        const percentAccepted =
          totalTandan > 0
            ? ((totalAccepted || 0) / (totalTandan || 1)) * 100
            : 0;

        const payload = {
          sendWhatsAppId: 'direct',
          template: 'agate_direct_report_2',
          variable_qiscus: {
            1: 'KDA Langling Mill',
            2: dayjs(doc.date).format('DD MMMM YYYY'),
            3: doc.vehicle_number,
            4: doc.vendor_name,
            5: doc.grading_result.total_tandan,
            6: formatter.format(percentAccepted) + '%',
            7: formatter.format(percentRejected) + '%',
            8: `${totalFined} Jjg /  ${Math.round(
              Number(totalFined) * Number(totalFinedKg)
            )}kg`,
            9: finedObject['TANGKAI PANJANG'],
            10: finedObject['BUAH KECIL DIBAWAH 5KG'],
            11:
              doc.grading_result['classification_summary']['MENTAH']['TOTAL'] +
              ' Jjg',
            12:
              doc.grading_result['classification_summary']['JANJANG KOSONG'][
                'TOTAL'
              ] + ' Jjg',
            13:
              Object.values(
                doc.grading_result['classification_summary']
              ).reduce((total, category) => {
                return total + category['BUAH KECIL DIBAWAH 3KG'];
              }, 0) + 'Jjg',
            14: `https://api-grading-hq.accelego.id/api/v1/inspection-data/download-pdf/${doc._id}`,
          },
          redirect_url: `inspection-data/download-pdf/${doc._id}`,
          origin: 'https://api-grading-hq.accelego.id/api/v2/sync/wa-status',
          source: 'agate',
        };

        const responseWa = await axios.post(
          `${process.env.WA_URI}/api/v2/broadcast`,
          { ...payload, phone: '6282111161253' }
        );
        const responseWa2 = await axios.post(
          `${process.env.WA_URI}/api/v2/broadcast`,
          { ...payload, phone: '6281385784854' }
        );
        const responseWa3 = await axios.post(
          `${process.env.WA_URI}/api/v2/broadcast`,
          { ...payload, phone: '6285295058857' }
        );

        console.log({ responseWa, responseWa2, responseWa3 });
      }

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

  static async syncWAStatus(req, res, next) {
    try {
      const body = req.body;

      console.log({ body });

      await WABroadcastModel.findByIdAndUpdate(body.sendWhatsAppId, {
        $set: {
          status: body['status'],
        },
      });

      return res
        .status(200)
        .json(createResponseSuccess(200, 'Success', 'Done', { success: true }));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SyncDataController;
