const dayjs = require("dayjs");
const FactoryModel = require("../../models/factory");
const InspectionDataModel = require("../../models/inspection-data");
const {
  createResponseSuccess,
  capitalizeString,
} = require("../../utils/helpers");
const { vBody } = require("../../validators/joi");
const generatePdf = require("../../lib/pdf");
const getImageFile = require("../../utils/get-image-file");
const CompanyModel = require("../../models/company");
const { getCompanyLimitTandan } = require("../../utils/inspection");

const countPercentage = (number = 0, divider = 1) => {
  let percent =
    divider > 0 && number > 0 ? (Number(number) / Number(divider)) * 100 : 0;
  return percent < 100 && percent > 0 ? percent.toFixed(2) : percent;
};

let dictBuahKecil = {
  "BUAH KECIL DIBAWAH 5KG": "Buah 3-5kg",
  "BUAH KECIL DIBAWAH 3KG": "Buah <3kg",
  "BUAH KECIL DIBAWAH 2KG": "Buah <2kg",
};

function calculateAndAppendTotals(data) {
  if (!data || !data.length) return data;
  const totalCounts = { label: "Total" };

  data.forEach((entry) => {
    Object.keys(entry).forEach((key) => {
      if (key !== "label" && key !== "DENDA") {
        const val = Number(entry[key]) || 0;
        totalCounts[key] = (totalCounts[key] || 0) + val;
      }
    });
  });

  data.push(totalCounts);

  return data;
}

function generateClassificationResultArray(summary) {
  const result = [];

  for (const [key, value] of Object.entries(summary)) {
    result.push({ label: capitalizeString(key), ...value });
  }

  return calculateAndAppendTotals(result);
}

const changeValueToLocalestring = (obj) => {
  return Object.keys(obj).reduce((o, k) => {
    o[k] = typeof obj[k] === "number" ? obj[k].toLocaleString() : obj[k];

    return o;
  }, {});
};
const WbGradingService = require("../../services/wb-grading.service");



class InspectionDataController {
  static async getAll(req, res, next) {
    try {
      const user = req.user;
      const {
        name = "",
        delivery_number = "",
        vehicle_number = "",
        vendor_id = "",
        date_from = "",
        date_to = "",
        limit_minimum = 0,
      } = req.query;
      const { factoryId } = req.params;
      // console.log({ user });

      let q = {
        "grading_result.total_tandan": { $gte: Number(limit_minimum) },
        company: user.company,
      };

      if (factoryId) {
        q["factory"] = factoryId;
      }
      if (name) {
        const regexPattern = new RegExp(name || "", "i");
        q["name"] = { $regex: regexPattern };
      }

      if (delivery_number) {
        const regexPattern = new RegExp(delivery_number || "", "i");
        q["delivery_number"] = { $regex: regexPattern };
      }
      if (vehicle_number) {
        const regexPattern = new RegExp(vehicle_number || "", "i");
        q["vehicle_number"] = { $regex: regexPattern };
      }
      if (vendor_id) {
        q["vendor"] = vendor_id;
      }

      if (date_from && date_to) {
        q["date"] = {
          $gte: dayjs(date_from).hour(6).minute(0).second(0).millisecond(0),
          $lte: dayjs(date_to)
            .add(1, "day")
            .hour(5)
            .minute(59)
            .second(59)
            .millisecond(999),
        };
      }

      // 1. Attempt to query SQL Server WbGradingHeader
      try {
        const sqlRes = await WbGradingService.getInspections(
          {
            delivery_number,
            vehicle_number,
            vendor_id,
            vendor_name: name,
            date_from,
            date_to,
            limit_minimum,
          },
          {
            page: req.query.page || 1,
            limit: req.query.limit || 50,
          }
        );

        if (sqlRes && sqlRes.data && sqlRes.data.length > 0) {
          return res.status(200).json(
            createResponseSuccess(
              200,
              "Success",
              "Success get all inspections",
              sqlRes.data,
              {
                total_data: sqlRes.meta.total_data,
                total_accepted: sqlRes.meta.total_accepted,
                total_fined: sqlRes.meta.total_fined,
                total_rejected: sqlRes.meta.total_rejected,
                total_tandan: sqlRes.meta.total_tandan,
              }
            )
          );
        }
      } catch (sqlErr) {
        console.warn("[SQL Server getInspections fallback to Mongo]:", sqlErr.message);
      }

      const inspections = await InspectionDataModel.find(q)
        .sort({ date: -1 })
        .lean();

      const totalData = await InspectionDataModel.count(q);

      const totalAllTandon = inspections.reduce(
        (curr, acc) => Number(acc.grading_result.total_tandan || 0) + curr,
        0,
      );
      const totalRejected = inspections.reduce(
        (curr, acc) => Number(acc.grading_result.total_rejected || 0) + curr,
        0,
      );
      const totalAccepted = inspections.reduce(
        (curr, acc) => Number(acc.grading_result.total_accepted || 0) + curr,
        0,
      );
      const totalFined = inspections.reduce(
        (curr, acc) => Number(acc.grading_result.total_fined || 0) + curr,
        0,
      );

      return res.status(200).json(
        createResponseSuccess(
          200,
          "Success",
          "Success get all inspections",
          inspections,
          {
            total_data: totalData,
            total_accepted: totalAccepted,
            total_fined: totalFined,
            total_rejected: totalRejected,
            total_tandan: totalAllTandon,
          },
        ),
      );
    } catch (err) {
      next(err);
    }
  }

  static async createNew(req, res, next) {
    try {
      const user = req.user;
      const body = req.body;

      const founded = await InspectionDataModel.findOne({
        id: body["id"],
      }).lean();

      if (founded) {
        return res
          .status(200)
          .json(
            createResponseSuccess(
              200,
              "Success",
              "Inspection already integrated",
              {},
            ),
          );
      }

      delete body["is_integrated"];

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

      await vBody("inspection-data", body);

      await InspectionDataModel.findOneAndUpdate(
        { id: body["id"] },
        { ...body, company: user.company },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            "Success",
            "Success create new inspection",
            {},
          ),
        );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  }

  static async getDetail(req, res, next) {
    try {
      const { inspectionId } = req.params;

      const inspections = await InspectionDataModel.findById(inspectionId)
        .populate("vendor", "bjr")
        .lean();

      if (inspections) {
        inspections.bjr = inspections.vendor?.bjr || null;
        inspections.vendor = inspections.vendor?._id || inspections.vendor;
      }

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            "Success",
            "Success get detail inspections",
            inspections,
            {},
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  static async downloadExcel(req, res, next) {
    try {
      const user = req.user;
      const {
        name = "",
        delivery_number = "",
        vehicle_number = "",
        vendor_id = "",
        date_from = "",
        date_to = "",
        limit_minimum = 0,
      } = req.query;
      const { factoryId } = req.params;

      let q = {
        "grading_result.total_tandan": { $gte: Number(limit_minimum) },
        company: user.company,
      };

      if (factoryId) {
        q["factory"] = factoryId;
      }
      if (name) {
        const regexPattern = new RegExp(name || "", "i");
        q["name"] = { $regex: regexPattern };
      }

      if (delivery_number) {
        const regexPattern = new RegExp(delivery_number || "", "i");
        q["delivery_number"] = { $regex: regexPattern };
      }
      if (vehicle_number) {
        const regexPattern = new RegExp(vehicle_number || "", "i");
        q["vehicle_number"] = { $regex: regexPattern };
      }
      if (vendor_id) {
        q["vendor"] = vendor_id;
      }

      if (date_from && date_to) {
        q["date"] = {
          $gte: dayjs(date_from).hour(6).minute(0).second(0).millisecond(0),
          $lte: dayjs(date_to)
            .add(1, "day")
            .hour(5)
            .minute(59)
            .second(59)
            .millisecond(999),
        };
      }

      const inspections = await InspectionDataModel.find(q)
        .sort({ date: -1 })
        .lean();

      let template = [
        [
          "No",
          "Tanggal",
          "Waktu Mulai",
          "Waktu Selesai",
          "Durasi",
          "Mesin",
          "Vendor",
          "Nomor Surat Jalan",
          "Nomor Plat Kendaraan",
          "Total Tandan",
          "Diterima",
          "Didenda",
          "Ditolak",
        ],
      ];

      inspections.forEach((ins, index) => {
        template.push([
          index + 1,
          dayjs(ins.date).format("DD/MM/YYYY"),
          dayjs(ins.date).format("HH:mm"),
          dayjs(ins.finish_date).format("HH:mm"),
          dayjs(ins.finish_date).diff(dayjs(ins.date), "minutes"),
          ins.machine || "-",
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
            "Success",
            "Success get all inspections",
            template,
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  static async downloadDetailPdf(req, res, next) {
    try {
      const { inspectionId } = req.params;

      let inspections = null;
      try {
        inspections = await WbGradingService.getInspectionDetail(inspectionId);
      } catch (sqlErr) {
        console.warn("[SQL Server getInspectionDetail fallback to Mongo]:", sqlErr.message);
      }

      if (!inspections) {
        inspections = await InspectionDataModel.findById(inspectionId)
          .populate("vendor")
          .lean();
      }

      if (!inspections) {
        throw {
          code: 404,
          title: "Not Found",
          message: "Pemeriksaan tidak ditemukan.",
        };
      }

      const factory = await FactoryModel.findById(inspections.factory).lean();
      const companyData = factory?.company
        ? await CompanyModel.findById(factory.company).lean()
        : null;

      const vendorBjr = Number(inspections.vendor?.bjr || 0);
      const vendorType = Number(inspections.vendor?.type || 0);

      let acceptedSummary = inspections.grading_result.accepted_summary;
      let rejectedSummary = inspections.grading_result.rejected_summary;
      let finedSummary = inspections.grading_result.fined_summary;
      let classificationSummary =
        inspections.grading_result.classification_summary;

      let acceptedData = Object.keys(acceptedSummary).map((k) => {
        return {
          label: capitalizeString(k),
          ...acceptedSummary[k],
        };
      });
      let rejectedData = Object.keys(rejectedSummary).map((k) => {
        return {
          label: capitalizeString(k),
          ...rejectedSummary[k],
        };
      });

      let finedData = Object.keys(finedSummary).map((k) => {
        let dendaValue = Number(finedSummary[k]["DENDA"] || 0);
        let dendaFormula = dendaValue;
        const totalValue = Number(finedSummary[k]["TOTAL"] || 0);
        const totalDenda = totalValue * dendaValue;

        return {
          label: k.includes("BUAH KECIL")
            ? dictBuahKecil[k]
            : capitalizeString(k),
          ...finedSummary[k],
          "DENDA": dendaFormula,
          "TOTAL DENDA": totalDenda,
        };
      });
      let classificationData = Object.keys(classificationSummary).map((k) => {
        return {
          label: capitalizeString(k),
          ...classificationSummary[k],
        };
      });

      let total_accepted_percent =
        inspections["grading_result"]["total_accepted"] > 0
          ? countPercentage(
              inspections["grading_result"]["total_accepted"],
              inspections["grading_result"]["total_tandan"],
            )
          : 0;
      let total_rejected_percent =
        inspections["grading_result"]["total_rejected"] > 0
          ? countPercentage(
              inspections["grading_result"]["total_rejected"],
              inspections["grading_result"]["total_tandan"],
            )
          : 0;
      let total_fined_percent =
        inspections["grading_result"]["total_fined"] > 0
          ? countPercentage(
              inspections["grading_result"]["total_fined"],
              inspections["grading_result"]["total_accepted"],
            )
          : 0;
      let total_percent =
        Number(Number(total_rejected_percent).toFixed(1)) +
        Number(Number(total_accepted_percent).toFixed(1));

      let total_multiple_percent =
        inspections["grading_result"]["total_multiple"] > 0
          ? countPercentage(
              inspections["grading_result"]["total_multiple"],
              inspections["grading_result"]["total_tandan"],
            )
          : 0;

      let classificationResult = generateClassificationResultArray(
        classificationData,
      ).map((e) => changeValueToLocalestring(e));

      let acceptedResult = acceptedData.length
        ? generateClassificationResultArray(acceptedData).map((e) =>
            changeValueToLocalestring(e),
          )
        : null;
      let rejectedResult = rejectedData.length
        ? generateClassificationResultArray(rejectedData).map((e) =>
            changeValueToLocalestring(e),
          )
        : null;

      // let totalResult = acceptedResult
      //   ? acceptedResult.find((e) => e.label.toLowerCase() === 'total')
      //   : null;

      let totalResultRejected = rejectedResult
        ? rejectedResult.find((e) => e.label.toLowerCase() === "total")
        : null;
      // console.log({ totalResult });

      // companyData already fetched above

      let data = {
        sinarmas_logo_img: getImageFile(
          companyData?.image_name ? companyData.image_name : "",
        ),
        agate_logo_img: getImageFile("agate-logo.png"),
        location: factory ? factory.location : "-",
        vendor_type:
          Number(inspections["vendor_type"]) === 1
            ? "Inti"
            : Number(inspections["vendor_type"]) === 2
              ? "Eksternal"
              : "Plasma",
        vendor: inspections["vendor_name"],
        delivery_number: inspections["delivery_number"],
        vehicle_number: inspections["vehicle_number"],
        date: dayjs(inspections["date"]).format("DD/MM/YYYY HH:mm:ss"),
        finish_date: dayjs(inspections["finish_date"]).format(
          "DD/MM/YYYY HH:mm:ss",
        ),
        machine: inspections["machine"],
        date_string: dayjs(inspections["date"]).format("DD/MM/YYYY"),
        grading_result: {
          total_tandan:
            inspections["grading_result"]["total_tandan"].toLocaleString(),
          total_accepted:
            inspections["grading_result"]["total_accepted"].toLocaleString(),
          total_rejected:
            inspections["grading_result"]["total_rejected"].toLocaleString(),
          total_fined:
            inspections["grading_result"]["total_fined"].toLocaleString(),
          total_multiple:
            inspections["grading_result"]["total_multiple"].toLocaleString(),
          total_accepted_percent: total_accepted_percent,
          total_rejected_percent: total_rejected_percent,
          total_fined_percent: total_fined_percent,
          total_percent: total_percent,
          total_multiple_percent: total_multiple_percent,
        },
        classification_result: classificationResult,
        accepted_result: acceptedResult,
        rejected_result: rejectedData.length
          ? generateClassificationResultArray(rejectedData).map((e) =>
              changeValueToLocalestring(e),
            )
          : null,
        fined_result: finedData.length
          ? generateClassificationResultArray(finedData).map((e) =>
              changeValueToLocalestring(e),
            )
          : null,

        report: {
          total_tandan:
            inspections["grading_result"]["total_tandan"].toLocaleString(),
          tandan_kosong: rejectedSummary?.["JANJANG KOSONG"]
            ? Number(
                rejectedSummary["JANJANG KOSONG"]["TOTAL"],
              ).toLocaleString()
            : 0,
          bjr_3: totalResultRejected?.["BUAH KECIL DIBAWAH 3KG"]
            ? totalResultRejected["BUAH KECIL DIBAWAH 3KG"]
            : 0,
          mentah: rejectedSummary?.["MENTAH"]
            ? Number(rejectedSummary["MENTAH"]["TOTAL"]).toLocaleString()
            : 0,

          // bjr_5: finedSummary['BUAH KECIL DIBAWAH 5KG']['TOTAL'],
          // bjr_5_denda: (
          //   Number(finedSummary['BUAH KECIL DIBAWAH 5KG']['TOTAL']) *
          //   Number(finedSummary['BUAH KECIL DIBAWAH 5KG']['DENDA'])
          // ).toLocaleString(),
          tangkai_panjang: finedSummary["TANGKAI PANJANG"]?.["TOTAL"] || 0,
          tangkai_panjang_denda: (() => {
            let dendaValue = Number(finedSummary["TANGKAI PANJANG"]?.["DENDA"] || 0);
            if (isUtjmKjgm && vendorBjr && vendorType === 3) {
              dendaValue = 0.01 * vendorBjr;
            }
            return (
              Number(finedSummary["TANGKAI PANJANG"]?.["TOTAL"] || 0) *
              dendaValue
            ).toLocaleString();
          })(),
        },
      };

      let template = `lib/pdf/templates/grading-result-2.html`;

      return generatePdf(data, template, res);

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            "Success",
            "Success get detail inspections",
            data,
            {},
          ),
        );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  }

  static async downloadPdfSummary(req, res, next) {
    const baseObjectSemua = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "KURANG MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectInti = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "KURANG MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectExternal = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectExternalVendor = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectPlasma = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectPlasmaVendor = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectIntiVendor = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "KURANG MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };
    try {
      const {
        name = "",
        delivery_number = "",
        vehicle_number = "",
        vendor_id = "",
        date_from = "",
        date_to = "",
      } = req.query;
      const { factoryId } = req.params;

      let q = {};
      if (factoryId) {
        q["factory"] = factoryId;
      }
      if (name) {
        const regexPattern = new RegExp(name || "", "i");
        q["name"] = {
          name: { $regex: regexPattern },
        };
      }

      if (delivery_number) {
        const regexPattern = new RegExp(delivery_number || "", "i");
        q["delivery_number"] = { $regex: regexPattern };
      }
      if (vehicle_number) {
        const regexPattern = new RegExp(vehicle_number || "", "i");
        q["vehicle_number"] = { $regex: regexPattern };
      }
      if (vendor_id) {
        q["vendor"] = vendor_id;
      }
      if (date_from && date_to) {
        q["date"] = {
          $gte: dayjs(date_from),
          $lte: dayjs(date_to),
        };
      }

      let inspections = await InspectionDataModel.find(q).lean();

      if (!inspections.length) {
        throw {
          code: 404,
          title: "Not Found",
          message: "Pemeriksaan tidak ditemukan.",
        };
      }

      const factory = await FactoryModel.findById(factoryId).lean();
      const isUtjmKjgm =
        factory && ["UTJM", "KJGM"].some((loc) => factory.name.includes(loc));
      const isLngm =
        factory && ["LNGM"].some((loc) => factory.name.includes(loc));

      const limit = await getCompanyLimitTandan({ company: factory.company });

      inspections = inspections.filter(
        (e) =>
          e.grading_result?.total_tandan > limit &&
          e.vehicle_number !== "BH 1240 ALB" &&
          e.vendor_name !== "Vendor 2 Plasma" &&
          e.vendor_name !== "Vendor B" &&
          e.vehicle_number !== "BH 4321 ALB",
      );

      let demografikSemua = {
        ...baseObjectSemua,
      };

      let demografikInti = {
        ...baseObjectInti,
      };

      let demografikExternal = {
        ...baseObjectExternal,
      };

      let demografikPlasma = {
        ...baseObjectPlasma,
      };

      let demografikVendorInti = {};
      let demografikVendorExternal = {};
      let demografikVendorPlasma = {};

      inspections.forEach((inspection) => {
        if (!inspection.grading_result) return;

        const totalTandan = inspection["grading_result"]["total_tandan"] || 0;
        const totalAccepted = inspection["grading_result"]["total_accepted"] || 0;
        const totalRejected = inspection["grading_result"]["total_rejected"] || 0;
        const totalFined = inspection["grading_result"]["total_fined"] || 0;
        const totalMultiple = inspection["grading_result"]["total_multiple"] || 0;

        const classificationSummary =
          inspection["grading_result"]["classification_summary"] || {};

        const vendorName = inspection["vendor_name"]?.trim() || "Unknown";

        demografikSemua["total_tandan"] += totalTandan;
        demografikSemua["total_accepted"] += totalAccepted;
        demografikSemua["total_fined"] += totalFined;
        demografikSemua["total_rejected"] += totalRejected;
        demografikSemua["total_multiple"] += totalMultiple;

        if (Number(inspection["vendor_type"]) === 1) {
          demografikInti["total_tandan"] += totalTandan;
          demografikInti["total_accepted"] += totalAccepted;
          demografikInti["total_fined"] += totalFined;
          demografikInti["total_rejected"] += totalRejected;
          demografikInti["total_multiple"] += totalMultiple;

          if (!demografikVendorInti[vendorName]) {
            demografikVendorInti[vendorName] = { ...baseObjectIntiVendor };
            demografikVendorInti[vendorName]["vendor"] = vendorName;
          }

          demografikVendorInti[vendorName]["total_tandan"] += totalTandan;
          demografikVendorInti[vendorName]["total_accepted"] += totalAccepted;
          demografikVendorInti[vendorName]["total_fined"] += totalFined;
          demografikVendorInti[vendorName]["total_rejected"] += totalRejected;
        } else if (Number(inspection["vendor_type"]) === 2) {
          demografikExternal["total_tandan"] += totalTandan;
          demografikExternal["total_accepted"] += totalAccepted;
          demografikExternal["total_fined"] += totalFined;
          demografikExternal["total_rejected"] += totalRejected;
          demografikExternal["total_multiple"] += totalMultiple;

          if (!demografikVendorExternal[vendorName]) {
            demografikVendorExternal[vendorName] = {
              ...baseObjectExternalVendor,
            };
            demografikVendorExternal[vendorName]["vendor"] = vendorName;
          }

          demografikVendorExternal[vendorName]["total_tandan"] += totalTandan;
          demografikVendorExternal[vendorName]["total_accepted"] +=
            totalAccepted;
          demografikVendorExternal[vendorName]["total_fined"] += totalFined;
          demografikVendorExternal[vendorName]["total_rejected"] +=
            totalRejected;
        } else if (Number(inspection["vendor_type"]) === 3) {
          demografikPlasma["total_tandan"] += totalTandan;
          demografikPlasma["total_accepted"] += totalAccepted;
          demografikPlasma["total_fined"] += totalFined;
          demografikPlasma["total_rejected"] += totalRejected;
          demografikPlasma["total_multiple"] += totalMultiple;

          if (!demografikVendorPlasma[vendorName]) {
            demografikVendorPlasma[vendorName] = { ...baseObjectPlasmaVendor };
            demografikVendorPlasma[vendorName]["vendor"] = vendorName;
          }

          demografikVendorPlasma[vendorName]["total_tandan"] += totalTandan;
          demografikVendorPlasma[vendorName]["total_accepted"] += totalAccepted;
          demografikVendorPlasma[vendorName]["total_fined"] += totalFined;
          demografikVendorPlasma[vendorName]["total_rejected"] += totalRejected;
        }

        Object.keys(classificationSummary).forEach((k) => {
          const item = classificationSummary[k];
          if (!demografikSemua["classification_summary"][k]) {
            demografikSemua["classification_summary"][k] = {};
          }
          Object.keys(item).forEach((ks) => {
            const value = Number(item[ks] || 0);

            const addToTarget = (targetObj) => {
              if (!targetObj["classification_summary"][k]) {
                targetObj["classification_summary"][k] = {};
              }
              targetObj["classification_summary"][k][ks] =
                (targetObj["classification_summary"][k][ks] || 0) + value;
            };

            addToTarget(demografikSemua);

            if (Number(inspection["vendor_type"]) === 1) {
              addToTarget(demografikInti);
              if (demografikVendorInti[vendorName]) {
                addToTarget(demografikVendorInti[vendorName]);
              }
            } else if (Number(inspection["vendor_type"]) === 2) {
              addToTarget(demografikExternal);
              if (demografikVendorExternal[vendorName]) {
                addToTarget(demografikVendorExternal[vendorName]);
              }
            } else if (Number(inspection["vendor_type"]) === 3) {
              addToTarget(demografikPlasma);
              if (demografikVendorPlasma[vendorName]) {
                addToTarget(demografikVendorPlasma[vendorName]);
              }
            }
          });
        });
      });

      if (isUtjmKjgm) {
        const mergeColsSummary = (demoObj) => {
          if (!demoObj?.classification_summary) return;
          Object.keys(demoObj.classification_summary).forEach((k) => {
            const item = demoObj.classification_summary[k];
            if (item) {
              item["BUAH KECIL DIBAWAH 5KG"] =
                (item["BUAH KECIL DIBAWAH 5KG"] || 0) +
                (item["BUAH KECIL DIBAWAH 3KG"] || 0) +
                (item["BUAH KECIL DIBAWAH 2KG"] || 0);
              item["BUAH KECIL DIBAWAH 3KG"] = 0;
              item["BUAH KECIL DIBAWAH 2KG"] = 0;
            }
          });
        };
        mergeColsSummary(demografikSemua);
        mergeColsSummary(demografikInti);
        mergeColsSummary(demografikExternal);
        mergeColsSummary(demografikPlasma);
      }

      demografikSemua["total_accepted_percent"] = countPercentage(
        demografikSemua["total_accepted"],
        demografikSemua["total_tandan"],
      );
      demografikSemua["total_rejected_percent"] = countPercentage(
        demografikSemua["total_rejected"],
        demografikSemua["total_tandan"],
      );
      demografikSemua["total_fined_percent"] = countPercentage(
        demografikSemua["total_fined"],
        demografikSemua["total_accepted"],
      );
      demografikSemua["total_percent"] = countPercentage(
        demografikSemua["total_accepted"] + demografikSemua["total_rejected"],
        demografikSemua["total_tandan"],
      );
      demografikSemua["classification_summary"] =
        generateClassificationResultArray(
          demografikSemua["classification_summary"],
        );

      demografikInti["total_accepted_percent"] = countPercentage(
        demografikInti["total_accepted"],
        demografikInti["total_tandan"],
      );
      demografikInti["total_rejected_percent"] = countPercentage(
        demografikInti["total_rejected"],
        demografikInti["total_tandan"],
      );
      demografikInti["total_fined_percent"] = countPercentage(
        demografikInti["total_fined"],
        demografikInti["total_accepted"],
      );
      demografikInti["total_percent"] = countPercentage(
        demografikInti["total_accepted"] + demografikInti["total_rejected"],
        demografikInti["total_tandan"],
      );
      demografikInti["classification_summary"] =
        generateClassificationResultArray(
          demografikInti["classification_summary"],
        );

      demografikExternal["total_accepted_percent"] = countPercentage(
        demografikExternal["total_accepted"],
        demografikExternal["total_tandan"],
      );
      demografikExternal["total_rejected_percent"] = countPercentage(
        demografikExternal["total_rejected"],
        demografikExternal["total_tandan"],
      );
      demografikExternal["total_fined_percent"] = countPercentage(
        demografikExternal["total_fined"],
        demografikExternal["total_accepted"],
      );
      demografikExternal["total_percent"] = countPercentage(
        demografikExternal["total_accepted"] +
          demografikExternal["total_rejected"],
        demografikExternal["total_tandan"],
      );
      demografikExternal["classification_summary"] =
        generateClassificationResultArray(
          demografikExternal["classification_summary"],
        );

      demografikPlasma["total_accepted_percent"] = countPercentage(
        demografikPlasma["total_accepted"],
        demografikPlasma["total_tandan"],
      );
      demografikPlasma["total_rejected_percent"] = countPercentage(
        demografikPlasma["total_rejected"],
        demografikPlasma["total_tandan"],
      );
      demografikPlasma["total_fined_percent"] = countPercentage(
        demografikPlasma["total_fined"],
        demografikPlasma["total_accepted"],
      );
      demografikPlasma["total_percent"] = countPercentage(
        demografikPlasma["total_accepted"] + demografikPlasma["total_rejected"],
        demografikPlasma["total_tandan"],
      );
      demografikPlasma["classification_summary"] =
        generateClassificationResultArray(
          demografikPlasma["classification_summary"],
        );

      demografikVendorInti = Object.keys(demografikVendorInti).map((key) => {
        const data = demografikVendorInti[key];
        return {
          label: data["vendor"],
          total_tandan: data["total_tandan"],
          percent_accepted: countPercentage(
            data["total_accepted"],
            data["total_tandan"],
          ),
          percent_rejected: countPercentage(
            data["total_rejected"],
            data["total_tandan"],
          ),
          percent_fined: countPercentage(
            data["total_fined"],
            data["total_accepted"],
          ),
        };
      });
      demografikVendorExternal = Object.keys(demografikVendorExternal).map(
        (key) => {
          const data = demografikVendorExternal[key];
          return {
            label: data["vendor"],
            total_tandan: data["total_tandan"],
            percent_accepted: countPercentage(
              data["total_accepted"],
              data["total_tandan"],
            ),
            percent_rejected: countPercentage(
              data["total_rejected"],
              data["total_tandan"],
            ),
            percent_fined: countPercentage(
              data["total_fined"],
              data["total_accepted"],
            ),
          };
        },
      );
      demografikVendorPlasma = Object.keys(demografikVendorPlasma).map(
        (key) => {
          const data = demografikVendorPlasma[key];
          return {
            label: data["vendor"],
            total_tandan: data["total_tandan"],
            percent_accepted: countPercentage(
              data["total_accepted"],
              data["total_tandan"],
            ),
            percent_rejected: countPercentage(
              data["total_rejected"],
              data["total_tandan"],
            ),
            percent_fined: countPercentage(
              data["total_fined"],
              data["total_accepted"],
            ),
          };
        },
      );

      const convertDataValue = (data) => {
        return Object.keys(data).reduce((obj, key) => {
          if (key === "classification_summary") {
            obj[key] = data[key].map((e) => changeValueToLocalestring(e));

            return obj;
          }

          obj[key] =
            typeof data[key] === "number"
              ? data[key].toLocaleString()
              : data[key];

          return obj;
        }, {});
      };

      const companyData = await CompanyModel.findById(factory.company).lean();

      let data = {
        is_lngm: isLngm,
        is_utjm_kjgm: isUtjmKjgm,
        start_date: date_from
          ? dayjs(date_from).format("DD/MM/YYYY HH:mm")
          : dayjs(inspections[0]["date"]).format("DD/MM/YYYY HH:mm:ss"),
        end_date: date_to
          ? dayjs(date_to).format("DD/MM/YYYY HH:mm")
          : dayjs(inspections[inspections.length - 1]["date"]).format(
              "DD/MM/YYYY HH:mm:ss",
            ),
        sinarmas_logo_img: getImageFile(
          companyData?.image_name ? companyData.image_name : "",
        ),
        agate_logo_img: getImageFile("agate-logo.png"),
        location: factory ? factory.location : "-",
        factory: factory.name,
        summary: convertDataValue(demografikSemua),
        summary_inti: convertDataValue(demografikInti),
        summary_external: convertDataValue(demografikExternal),
        summary_plasma: convertDataValue(demografikPlasma),
        vendor_inti: demografikVendorInti.length
          ? demografikVendorInti.map((e) => changeValueToLocalestring(e))
          : null,
        vendor_external: demografikVendorExternal.length
          ? demografikVendorExternal.map((e) => changeValueToLocalestring(e))
          : null,
        vendor_plasma: demografikVendorPlasma.length
          ? demografikVendorPlasma.map((e) => changeValueToLocalestring(e))
          : null,
      };

      let template = `lib/pdf/templates/grading-summary.html`;

      return generatePdf(data, template, res);

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            "Success",
            "Success get detail inspections",
            data,
            {},
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  static async downloadPdfSummaryDaily(req, res, next) {
    const baseObjectSemua = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "KURANG MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectInti = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "KURANG MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectExternal = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectExternalVendor = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectPlasma = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectPlasmaVendor = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };

    const baseObjectIntiVendor = {
      total_tandan: 0,
      total_accepted: 0,
      total_rejected: 0,
      total_fined: 0,
      classification_summary: {
        MENTAH: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "KURANG MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        MATANG: {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "LEWAT MATANG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
        "JANJANG KOSONG": {
          TOTAL: 0,
          NORMAL: 0,
          "RUSAK DIMAKAN TIKUS": 0,
          "TANGKAI PANJANG": 0,
          "BUAH KECIL DIBAWAH 3KG": 0,
          "BUAH KECIL DIBAWAH 2KG": 0,
          "BUAH KECIL DIBAWAH 5KG": 0,
        },
      },
    };
    try {
      const { factoryId } = req.params;

      let q = {};

      let yesterday = dayjs().add(-1, "day");

      if (factoryId) {
        q["factory"] = factoryId;
      }

      q["date"] = {
        $gte: yesterday.startOf("day"),
        $lte: yesterday.endOf("day"),
      };

      const inspections = await InspectionDataModel.find(q).lean();

      if (!inspections.length) {
        throw {
          code: 404,
          title: "Not Found",
          message: "Pemeriksaan tidak ditemukan.",
        };
      }

      const factory = await FactoryModel.findById(factoryId).lean();

      const limit = await getCompanyLimitTandan(user);

      inspections = inspections.filter(
        (e) =>
          e.grading_result?.total_tandan > limit &&
          e.vehicle_number !== "BH 1240 ALB" &&
          e.vendor_name !== "Vendor 2 Plasma" &&
          e.vendor_name !== "Vendor B" &&
          e.vehicle_number !== "BH 4321 ALB",
      );

      let demografikSemua = {
        ...baseObjectSemua,
      };

      let demografikInti = {
        ...baseObjectInti,
      };

      let demografikExternal = {
        ...baseObjectExternal,
      };

      let demografikPlasma = {
        ...baseObjectPlasma,
      };

      let demografikVendorInti = {};
      let demografikVendorExternal = {};
      let demografikVendorPlasma = {};

      inspections.forEach((inspection) => {
        const totalTandan = inspection["grading_result"]["total_tandan"];
        const totalAccepted = inspection["grading_result"]["total_accepted"];
        const totalRejected = inspection["grading_result"]["total_rejected"];
        const totalFined = inspection["grading_result"]["total_fined"];

        const classificationSummary =
          inspection["grading_result"]["classification_summary"];
        const acceptedSummary =
          inspection["grading_result"]["accepted_summary"];
        const rejectedSummary =
          inspection["grading_result"]["rejected_summary"];
        const finedSummary = inspection["grading_result"]["fined_summary"];

        const vendorName = inspection["vendor_name"]?.trim() || "Unknown";

        demografikSemua["total_tandan"] += totalTandan;
        demografikSemua["total_accepted"] += totalAccepted;
        demografikSemua["total_fined"] += totalFined;
        demografikSemua["total_rejected"] += totalRejected;

        if (Number(inspection["vendor_type"]) === 1) {
          demografikInti["total_tandan"] += totalTandan;
          demografikInti["total_accepted"] += totalAccepted;
          demografikInti["total_fined"] += totalFined;
          demografikInti["total_rejected"] += totalRejected;

          if (!demografikVendorInti[vendorName]) {
            demografikVendorInti[vendorName] = { ...baseObjectIntiVendor };
            demografikVendorInti[vendorName]["vendor"] = vendorName;
          }

          demografikVendorInti[vendorName]["total_tandan"] += totalTandan;
          demografikVendorInti[vendorName]["total_accepted"] += totalAccepted;
          demografikVendorInti[vendorName]["total_fined"] += totalFined;
          demografikVendorInti[vendorName]["total_rejected"] += totalRejected;
        } else if (Number(inspection["vendor_type"]) === 2) {
          demografikExternal["total_tandan"] += totalTandan;
          demografikExternal["total_accepted"] += totalAccepted;
          demografikExternal["total_fined"] += totalFined;
          demografikExternal["total_rejected"] += totalRejected;

          if (!demografikVendorExternal[vendorName]) {
            demografikVendorExternal[vendorName] = {
              ...baseObjectExternalVendor,
            };
            demografikVendorExternal[vendorName]["vendor"] = vendorName;
          }

          demografikVendorExternal[vendorName]["total_tandan"] += totalTandan;
          demografikVendorExternal[vendorName]["total_accepted"] +=
            totalAccepted;
          demografikVendorExternal[vendorName]["total_fined"] += totalFined;
          demografikVendorExternal[vendorName]["total_rejected"] +=
            totalRejected;
        } else if (Number(inspection["vendor_type"]) === 3) {
          demografikPlasma["total_tandan"] += totalTandan;
          demografikPlasma["total_accepted"] += totalAccepted;
          demografikPlasma["total_fined"] += totalFined;
          demografikPlasma["total_rejected"] += totalRejected;

          if (!demografikVendorPlasma[vendorName]) {
            demografikVendorPlasma[vendorName] = { ...baseObjectPlasmaVendor };
            demografikVendorPlasma[vendorName]["vendor"] = vendorName;
          }

          demografikVendorPlasma[vendorName]["total_tandan"] += totalTandan;
          demografikVendorPlasma[vendorName]["total_accepted"] += totalAccepted;
          demografikVendorPlasma[vendorName]["total_fined"] += totalFined;
          demografikVendorPlasma[vendorName]["total_rejected"] += totalRejected;
        }

        Object.keys(classificationSummary).forEach((k) => {
          const item = classificationSummary[k];
          if (!demografikSemua["classification_summary"][k]) {
            demografikSemua["classification_summary"][k] = {};
          }
          Object.keys(item).forEach((ks) => {
            const value = Number(item[ks] || 0);

            const addToTarget = (targetObj) => {
              if (!targetObj["classification_summary"][k]) {
                targetObj["classification_summary"][k] = {};
              }
              targetObj["classification_summary"][k][ks] =
                (targetObj["classification_summary"][k][ks] || 0) + value;
            };

            addToTarget(demografikSemua);

            if (Number(inspection["vendor_type"]) === 1) {
              addToTarget(demografikInti);
              if (demografikVendorInti[vendorName]) {
                addToTarget(demografikVendorInti[vendorName]);
              }
            } else if (Number(inspection["vendor_type"]) === 2) {
              addToTarget(demografikExternal);
              if (demografikVendorExternal[vendorName]) {
                addToTarget(demografikVendorExternal[vendorName]);
              }
            } else if (Number(inspection["vendor_type"]) === 3) {
              addToTarget(demografikPlasma);
              if (demografikVendorPlasma[vendorName]) {
                addToTarget(demografikVendorPlasma[vendorName]);
              }
            }
          });
        });
      });

      const isUtjmKjgm =
        factory && ["UTJM", "KJGM"].some((loc) => factory.name.includes(loc));

      const isLngm =
        factory && ["LNGM"].some((loc) => factory.name.includes(loc));

      if (isUtjmKjgm) {
        const mergeClassification = (summaryObj) => {
          const summary = summaryObj.classification_summary;
          if (!summary) return;
          Object.keys(summary).forEach((key) => {
            const item = summary[key];
            if (item) {
              item["BUAH KECIL DIBAWAH 5KG"] =
                (item["BUAH KECIL DIBAWAH 5KG"] || 0) +
                (item["BUAH KECIL DIBAWAH 3KG"] || 0) +
                (item["BUAH KECIL DIBAWAH 2KG"] || 0);
              item["BUAH KECIL DIBAWAH 3KG"] = 0;
              item["BUAH KECIL DIBAWAH 2KG"] = 0;
            }
          });
        };

        mergeClassification(demografikSemua);
        mergeClassification(demografikInti);
        mergeClassification(demografikExternal);
        mergeClassification(demografikPlasma);
      }

      demografikSemua["total_accepted_percent"] = countPercentage(
        demografikSemua["total_accepted"],
        demografikSemua["total_tandan"],
      );
      demografikSemua["total_rejected_percent"] = countPercentage(
        demografikSemua["total_rejected"],
        demografikSemua["total_tandan"],
      );
      demografikSemua["total_fined_percent"] = countPercentage(
        demografikSemua["total_fined"],
        demografikSemua["total_accepted"],
      );
      demografikSemua["total_percent"] = countPercentage(
        demografikSemua["total_accepted"] + demografikSemua["total_rejected"],
        demografikSemua["total_tandan"],
      );
      demografikSemua["classification_summary"] =
        generateClassificationResultArray(
          demografikSemua["classification_summary"],
        );

      demografikInti["total_accepted_percent"] = countPercentage(
        demografikInti["total_accepted"],
        demografikInti["total_tandan"],
      );
      demografikInti["total_rejected_percent"] = countPercentage(
        demografikInti["total_rejected"],
        demografikInti["total_tandan"],
      );
      demografikInti["total_fined_percent"] = countPercentage(
        demografikInti["total_fined"],
        demografikInti["total_accepted"],
      );
      demografikInti["total_percent"] = countPercentage(
        demografikInti["total_accepted"] + demografikInti["total_rejected"],
        demografikInti["total_tandan"],
      );
      demografikInti["classification_summary"] =
        generateClassificationResultArray(
          demografikInti["classification_summary"],
        );

      demografikExternal["total_accepted_percent"] = countPercentage(
        demografikExternal["total_accepted"],
        demografikExternal["total_tandan"],
      );
      demografikExternal["total_rejected_percent"] = countPercentage(
        demografikExternal["total_rejected"],
        demografikExternal["total_tandan"],
      );
      demografikExternal["total_fined_percent"] = countPercentage(
        demografikExternal["total_fined"],
        demografikExternal["total_accepted"],
      );
      demografikExternal["total_percent"] = countPercentage(
        demografikExternal["total_accepted"] +
          demografikExternal["total_rejected"],
        demografikExternal["total_tandan"],
      );
      demografikExternal["classification_summary"] =
        generateClassificationResultArray(
          demografikExternal["classification_summary"],
        );

      demografikPlasma["total_accepted_percent"] = countPercentage(
        demografikPlasma["total_accepted"],
        demografikPlasma["total_tandan"],
      );
      demografikPlasma["total_rejected_percent"] = countPercentage(
        demografikPlasma["total_rejected"],
        demografikPlasma["total_tandan"],
      );
      demografikPlasma["total_fined_percent"] = countPercentage(
        demografikPlasma["total_fined"],
        demografikPlasma["total_accepted"],
      );
      demografikPlasma["total_percent"] = countPercentage(
        demografikPlasma["total_accepted"] + demografikPlasma["total_rejected"],
        demografikPlasma["total_tandan"],
      );
      demografikPlasma["classification_summary"] =
        generateClassificationResultArray(
          demografikPlasma["classification_summary"],
        );

      demografikVendorInti = Object.keys(demografikVendorInti).map((key) => {
        const data = demografikVendorInti[key];
        return {
          label: data["vendor"],
          total_tandan: data["total_tandan"],
          percent_accepted: countPercentage(
            data["total_accepted"],
            data["total_tandan"],
          ),
          percent_rejected: countPercentage(
            data["total_rejected"],
            data["total_tandan"],
          ),
          percent_fined: countPercentage(
            data["total_fined"],
            data["total_accepted"],
          ),
        };
      });
      demografikVendorExternal = Object.keys(demografikVendorExternal).map(
        (key) => {
          const data = demografikVendorExternal[key];
          return {
            label: data["vendor"],
            total_tandan: data["total_tandan"],
            percent_accepted: countPercentage(
              data["total_accepted"],
              data["total_tandan"],
            ),
            percent_rejected: countPercentage(
              data["total_rejected"],
              data["total_tandan"],
            ),
            percent_fined: countPercentage(
              data["total_fined"],
              data["total_accepted"],
            ),
          };
        },
      );
      demografikVendorPlasma = Object.keys(demografikVendorPlasma).map(
        (key) => {
          const data = demografikVendorPlasma[key];
          return {
            label: data["vendor"],
            total_tandan: data["total_tandan"],
            percent_accepted: countPercentage(
              data["total_accepted"],
              data["total_tandan"],
            ),
            percent_rejected: countPercentage(
              data["total_rejected"],
              data["total_tandan"],
            ),
            percent_fined: countPercentage(
              data["total_fined"],
              data["total_accepted"],
            ),
          };
        },
      );

      const convertDataValue = (data) => {
        return Object.keys(data).reduce((obj, key) => {
          if (key === "classification_summary") {
            obj[key] = data[key].map((e) => changeValueToLocalestring(e));

            return obj;
          }

          obj[key] =
            typeof data[key] === "number"
              ? data[key].toLocaleString()
              : data[key];

          return obj;
        }, {});
      };

      const user = req.user;
      const companyData = await CompanyModel.findById(user.company).lean();

      let data = {
        start_date: dayjs(yesterday.startOf("day")).format(
          "DD/MM/YYYY HH:mm:ss",
        ),
        end_date: dayjs(yesterday.endOf("day")).format("DD/MM/YYYY HH:mm:ss"),
        sinarmas_logo_img: getImageFile(
          companyData?.image_name ? companyData.image_name : "",
        ),
        agate_logo_img: getImageFile("agate-logo.png"),
        location: factory ? factory.location : "-",
        factory: factory.name,
        summary: convertDataValue(demografikSemua),
        summary_inti: convertDataValue(demografikInti),
        summary_external: convertDataValue(demografikExternal),
        summary_plasma: convertDataValue(demografikPlasma),
        vendor_inti: demografikVendorInti.length
          ? demografikVendorInti.map((e) => changeValueToLocalestring(e))
          : null,
        vendor_external: demografikVendorExternal.length
          ? demografikVendorExternal.map((e) => changeValueToLocalestring(e))
          : null,
        vendor_plasma: demografikVendorPlasma.length
          ? demografikVendorPlasma.map((e) => changeValueToLocalestring(e))
          : null,
      };

      let template = `lib/pdf/templates/grading-summary.html`;

      return generatePdf(data, template, res);

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            "Success",
            "Success get detail inspections",
            data,
            {},
          ),
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InspectionDataController;
