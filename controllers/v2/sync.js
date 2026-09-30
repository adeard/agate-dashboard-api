const mongoose = require("mongoose");
const { default: axios } = require("axios");
const FactoryModel = require("../../models/factory");
const CompanyModel = require("../../models/company");
const InspectionDataModel = require("../../models/inspection-data");
const WbGradingService = require("../../services/wb-grading.service");
const VendorV2Model = require("../../models/v2/vendor");
const WABroadcastModel = require("../../models/wa-broadcast");
const {
  createResponseSuccess,
  countPercentage,
} = require("../../utils/helpers");
const { getBasicQuery } = require("../../utils/query-helpers");
const { vBody } = require("../../validators/joi");
const dayjs = require("dayjs");
const MachineCheckModel = require("../../models/machine-check");
const MachineLogsFileModel = require("../../models/machine-logs-file");
const MachineLogsDataModel = require("../../models/machine-logs-data");

const agenda = require("../../lib/agenda");

const formatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

class SyncDataController {
  static async syncVendor(req, res, next) {
    try {
      const body = req.body;

      delete body["is_integrated"];

      await vBody("vendor-2", body);

      const factory = await FactoryModel.findOne({
        name: body["factory"],
      }).lean();

      if (!factory) {
        throw {
          code: 404,
          title: "Not Found",
          message: "Factory not found",
        };
      }

      body["factory"] = factory._id;

      await VendorV2Model.findOneAndUpdate(
        {
          name: body["name"].trim(),
          factory: factory._id,
          id: body["id"],
        },
        { ...body, factory: factory._id },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      return res
        .status(200)
        .json(createResponseSuccess(200, "Success", "Success sync vendor", {}));
    } catch (err) {
      console.log({ err }, "<<< ERROR SYNC VENDOR");
      next(err);
    }
  }

  static async syncInspection(req, res, next) {
    try {
      const body = req.body;
      const { direct = null } = req.query;

      console.log({ body });

      if (body["notes"] === "") {
        body["notes"] = "-";
      }

      if (body["is_integrated_wb"] === null) {
        body["is_integrated_wb"] = false;
      }

      const factory = await FactoryModel.findOne({
        name: body["factory"],
      }).lean();

      if (!factory) {
        throw {
          code: 404,
          title: "Not Found",
          message: "Factory not found",
        };
      }

      let vendorQuery = {
        factory: factory._id,
      };
      if (body["vendor_name"]) {
        vendorQuery.name = body["vendor_name"].trim();
      }
      if (body["vendor_id"]) {
        vendorQuery.id = body["vendor_id"];
      }

      let vendor = null;
      if (body["vendor_name"] || body["vendor_id"]) {
        vendor = await VendorV2Model.findOne(vendorQuery).lean();
      }

      if (!vendor && (body["vendor_name"] || body["vendor_id"])) {
        const vendorType = body["vendor_type"] ? Number(body["vendor_type"]) : 3;
        vendor = await VendorV2Model.findOneAndUpdate(
          vendorQuery,
          {
            id: body["vendor_id"] || body["id"] || "",
            name: (body["vendor_name"] || "").trim(),
            type: isNaN(vendorType) ? 3 : vendorType,
            factory: factory._id,
            vendor_id: body["vendor_id"] || "",
            bjr: body["bjr"] || "",
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            returnDocument: true,
          },
        );
      }

      delete body["is_integrated"];
      body["is_integrated"] = true;

      body["company"] = factory.company.toString();

      if (
        !body["main_classification_accepted"] ||
        !Array.isArray(body["main_classification_accepted"])
      ) {
        if (body["grading_result"]?.["accepted"]) {
          body["main_classification_accepted"] = Object.keys(
            body["grading_result"]["accepted"],
          );
        } else {
          body["main_classification_accepted"] = [];
        }
      }

      if (
        !body["sub_classification_accepted"] ||
        !Array.isArray(body["sub_classification_accepted"])
      ) {
        if (body["grading_result"]?.["fined"]) {
          body["sub_classification_accepted"] = Object.keys(
            body["grading_result"]["fined"],
          );
        } else {
          body["sub_classification_accepted"] = [];
        }
      }

      if (
        !body["classification_rejected"] ||
        !Array.isArray(body["classification_rejected"])
      ) {
        if (body["grading_result"]?.["rejected"]) {
          body["classification_rejected"] = Object.keys(
            body["grading_result"]["rejected"],
          );
        } else {
          body["classification_rejected"] = [];
        }
      }

      if (!body["vendor_type"]) {
        body["vendor_type"] = "3";
      }

      if (!body["manual_input"] && body["grading_result"]?.["manual_input"]) {
        body["manual_input"] = body["grading_result"]["manual_input"];
      }

      if (
        !body["manual_input_rules"] &&
        body["grading_result"]?.["manual_input_rules"]
      ) {
        body["manual_input_rules"] = body["grading_result"]["manual_input_rules"];
      }

      if (
        (body["tarra"] === null || body["tarra"] === undefined) &&
        body["grading_result"]?.["manual_input"]?.["tare"]
      ) {
        body["tarra"] = body["grading_result"]["manual_input"]["tare"];
      }

      await vBody("inspection-data", body);

      body["factory"] = factory._id;
      if (vendor) {
        body["vendor"] = vendor._id;
      }

      console.log({ body }, "<<<< BODY SYNC DATA INSPECTION");

      // Save to SQL Server WbGrading tables
      try {
        await WbGradingService.upsertInspection(body);
      } catch (sqlErr) {
        console.error("[SQL Server Sync Error]:", sqlErr.message);
      }

      const doc = await InspectionDataModel.findOneAndUpdate(
        { id: body["id"] },
        body,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          returnDocument: true,
        },
      );



      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            "Success",
            "Success create integrate inspection",
            { success: true },
          ),
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
          status: body["status"],
        },
      });

      return res
        .status(200)
        .json(createResponseSuccess(200, "Success", "Done", { success: true }));
    } catch (err) {
      next(err);
    }
  }

  static async syncInspectionImage(req, res, next) {
    // return res.status(200).json({ success: true, url: null });
    try {
      const file = req.file;
      const { id } = req.params;

      console.log({ file, id });

      if (!file.url) {
        return res.status(200).json(
          createResponseSuccess(200, "Success", "Success integrate image", {
            url: null,
          }),
        );
      }

      await InspectionDataModel.findByIdAndUpdate(id, {
        $set: {
          images: file.url,
        },
      });

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            "Success",
            "Success create integrate inspection",
            { url: file.url },
          ),
        );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  }

  static async syncMachineCheck(req, res, next) {
    try {
      const body = req.body;

      delete body["is_integrated"];

      await vBody("machine-check", body);

      const factory = await FactoryModel.findOne({
        name: body["factory"],
      }).lean();

      if (!factory) {
        throw {
          code: 404,
          title: "Not Found",
          message: "Factory not found",
        };
      }

      body["factory"] = factory._id;

      if (body.date) {
        body.date = new Date(body.date);
      }

      const filter = {
        machine_check_id: body.machine_check_id,
      };

      const machineCheck = await MachineCheckModel.findOneAndUpdate(
        filter,
        { ...body, date_string: body.date },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      );

      return res.status(200).json(
        createResponseSuccess(200, "Success", "Success sync machine check", {
          id: machineCheck._id,
        }),
      );
    } catch (err) {
      console.error("Error syncing machine check:", {
        error: err.message,
        stack: err.stack,
        body: req.body,
      });
      next(err);
    }
  }

  static async syncMachineLogsFile(req, res, next) {
    try {
      const body = req.body;

      delete body["is_integrated"];
      console.log({ body });

      // await vBody("machine-logs-file", body);

      await agenda.now("sync-machine-logs-file", { body });

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            "Success",
            "Success queue machine logs file",
            { status: "queued" },
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  static async syncMachineLogsData(req, res, next) {
    try {
      const body = req.body;

      delete body["is_integrated"];

      // await vBody("machine-logs-data", body);

      await agenda.now("sync-machine-logs-data", { body });

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            "Success",
            "Success queue machine logs data",
            { status: "queued" },
          ),
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SyncDataController;
