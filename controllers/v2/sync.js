const FactoryModel = require('../../models/factory');
const InspectionDataModel = require('../../models/inspection-data');
const VendorV2Model = require('../../models/v2/vendor');
const WABroadcastModel = require('../../models/wa-broadcast');
const { createResponseSuccess } = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');

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
