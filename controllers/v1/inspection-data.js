const dayjs = require('dayjs');
const FactoryModel = require('../../models/factory');
const InspectionDataModel = require('../../models/inspection-data');
const {
  createResponseSuccess,
  capitalizeString,
} = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');
const generatePdf = require('../../lib/pdf');
const getImageFile = require('../../utils/get-image-file');

const countPercentage = (number = 0, divider = 1) => {
  let percent =
    divider > 0 && number > 0 ? (Number(number) / Number(divider)) * 100 : 0;
  return percent < 100 && percent > 0 ? percent.toFixed(2) : percent;
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
      'RUSAK DIMAKAN TIKUS': 0,
      'TANGKAI PANJANG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
    },
    'KURANG MATANG': {
      TOTAL: 0,
      NORMAL: 0,
      'RUSAK DIMAKAN TIKUS': 0,
      'TANGKAI PANJANG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
    },
    MATANG: {
      TOTAL: 0,
      NORMAL: 0,
      'RUSAK DIMAKAN TIKUS': 0,
      'TANGKAI PANJANG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
    },
    'LEWAT MATANG': {
      TOTAL: 0,
      NORMAL: 0,
      'RUSAK DIMAKAN TIKUS': 0,
      'TANGKAI PANJANG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
    },
    'JANJANG KOSONG': {
      TOTAL: 0,
      NORMAL: 0,
      'RUSAK DIMAKAN TIKUS': 0,
      'TANGKAI PANJANG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
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
      'RUSAK DIMAKAN TIKUS': 0,
      'TANGKAI PANJANG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
    },
    MATANG: {
      TOTAL: 0,
      NORMAL: 0,
      'RUSAK DIMAKAN TIKUS': 0,
      'TANGKAI PANJANG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
    },
    'LEWAT MATANG': {
      TOTAL: 0,
      NORMAL: 0,
      'RUSAK DIMAKAN TIKUS': 0,
      'TANGKAI PANJANG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
    },
    'JANJANG KOSONG': {
      TOTAL: 0,
      NORMAL: 0,
      'RUSAK DIMAKAN TIKUS': 0,
      'TANGKAI PANJANG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
    },
  },
};

function calculateAndAppendTotals(data, isFined = false) {
  const totalCounts = { label: 'Total' };

  // Initialize the keys with 0
  Object.keys(data[0]).forEach((key) => {
    if (key !== 'label' || key !== "DENDA") {
      totalCounts[key] = 0;
    }
  });

  // Sum up the values for each key
  data.forEach((entry) => {
    Object.keys(entry).forEach((key) => {
      if (key !== 'label' && isFined === false) {
        totalCounts[key] += entry[key];
      }
    });
  });

  // Append the totals to the data array
  data.push(totalCounts);

  return data;
}

function generateClassificationResultArray(summary, isFined = false) {
  const result = [];

  for (const [key, value] of Object.entries(summary)) {
    // console.log({ key, value });
    result.push({ label: capitalizeString(key), ...value });
  }

  return calculateAndAppendTotals(result, isFined);
}

const changeValueToLocalestring = (obj) => {
  return Object.keys(obj).reduce((o, k) => {
    o[k] = typeof obj[k] === 'number' ? obj[k].toLocaleString() : obj[k];

    return o;
  }, {});
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
        return {
          label: capitalizeString(k),
          ...finedSummary[k],
          'TOTAL DENDA': finedSummary[k]['TOTAL'] * finedSummary[k]['DENDA'],
        };
      });
      let classificationData = Object.keys(classificationSummary).map((k) => {
        return {
          label: capitalizeString(k),
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
      let total_percent =
        Number(total_rejected_percent) + Number(total_accepted_percent);

      let data = {
        sinarmas_logo_img: getImageFile('sinarmas-logo.png'),
        agate_logo_img: getImageFile('agate-logo.png'),
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
          total_tandan:
            inspections['grading_result']['total_tandan'].toLocaleString(),
          total_accepted:
            inspections['grading_result']['total_accepted'].toLocaleString(),
          total_rejected:
            inspections['grading_result']['total_rejected'].toLocaleString(),
          total_fined:
            inspections['grading_result']['total_fined'].toLocaleString(),
          total_accepted_percent: total_accepted_percent,
          total_rejected_percent: total_rejected_percent,
          total_fined_percent: total_fined_percent,
          total_percent: total_percent,
        },
        classification_result: generateClassificationResultArray(
          classificationData
        ).map((e) => changeValueToLocalestring(e)),
        accepted_result: acceptedData.length
          ? generateClassificationResultArray(acceptedData).map((e) =>
              changeValueToLocalestring(e)
            )
          : null,
        rejected_result: rejectedData.length
          ? generateClassificationResultArray(rejectedData).map((e) =>
              changeValueToLocalestring(e)
            )
          : null,
        fined_result: finedData.length
          ? generateClassificationResultArray(finedData).map((e) =>
              changeValueToLocalestring(e)
            )
          : null,
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

  static async downloadPdfSummary(req, res, next) {
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

      const inspections = await InspectionDataModel.find(q).lean();

      if (!inspections.length) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'Pemeriksaan tidak ditemukan.',
        };
      }

      let demografikSemua = {
        ...baseObjectInti,
      };

      let demografikInti = {
        ...baseObjectInti,
      };

      let demografikPlasma = {
        ...baseObjectPlasma,
      };

      let demografikVendorInti = {};
      let demografikVendorPlasma = {};

      inspections.forEach((inspection) => {
        const totalTandan = inspection['grading_result']['total_tandan'];
        const totalAccepted = inspection['grading_result']['total_accepted'];
        const totalRejected = inspection['grading_result']['total_rejected'];
        const totalFined = inspection['grading_result']['total_fined'];

        const classificationSummary =
          inspection['grading_result']['classification_summary'];
        const acceptedSummary =
          inspection['grading_result']['accepted_summary'];
        const rejectedSummary =
          inspection['grading_result']['rejected_summary'];
        const finedSummary = inspection['grading_result']['fined_summary'];

        const vendorId = inspection['vendor_id'];

        demografikSemua['total_tandan'] += totalTandan;
        demografikSemua['total_accepted'] += totalAccepted;
        demografikSemua['total_fined'] += totalFined;
        demografikSemua['total_rejected'] += totalRejected;

        if (Number(inspection['vendor_type']) === 1) {
          demografikInti['total_tandan'] += totalTandan;
          demografikInti['total_accepted'] += totalAccepted;
          demografikInti['total_fined'] += totalFined;
          demografikInti['total_rejected'] += totalRejected;

          if (!demografikVendorInti[vendorId]) {
            demografikVendorInti[vendorId] = { ...baseObjectInti };
            demografikVendorInti[vendorId]['vendor'] =
              inspection['vendor_name'];
          }

          demografikVendorInti[vendorId]['total_tandan'] += totalTandan;
          demografikVendorInti[vendorId]['total_accepted'] += totalAccepted;
          demografikVendorInti[vendorId]['total_fined'] += totalFined;
          demografikVendorInti[vendorId]['total_rejected'] += totalRejected;
        } else {
          demografikPlasma['total_tandan'] += totalTandan;
          demografikPlasma['total_accepted'] += totalAccepted;
          demografikPlasma['total_fined'] += totalFined;
          demografikPlasma['total_rejected'] += totalRejected;

          if (!demografikVendorPlasma[vendorId]) {
            demografikVendorPlasma[vendorId] = { ...baseObjectInti };
            demografikVendorPlasma[vendorId]['vendor'] =
              inspection['vendor_name'];
          }

          demografikVendorPlasma[vendorId]['total_tandan'] += totalTandan;
          demografikVendorPlasma[vendorId]['total_accepted'] += totalAccepted;
          demografikVendorPlasma[vendorId]['total_fined'] += totalFined;
          demografikVendorPlasma[vendorId]['total_rejected'] += totalRejected;
        }

        Object.keys(classificationSummary).forEach((k) => {
          const item = classificationSummary[k];
          Object.keys(item).forEach((ks) => {
            const value = item[ks];
            demografikSemua['classification_summary'][k][ks] += value;

            if (Number(inspection['vendor_type']) === 1) {
              demografikInti['classification_summary'][k][ks] += value;
              demografikVendorInti[vendorId]['classification_summary'][k][ks] +=
                value;
            } else {
              demografikPlasma['classification_summary'][k][ks] += value;
              demografikVendorPlasma[vendorId]['classification_summary'][k][
                ks
              ] += value;
            }
          });
        });
      });

      demografikSemua['total_accepted_percent'] = countPercentage(
        demografikSemua['total_accepted'],
        demografikSemua['total_tandan']
      );
      demografikSemua['total_rejected_percent'] = countPercentage(
        demografikSemua['total_rejected'],
        demografikSemua['total_tandan']
      );
      demografikSemua['total_fined_percent'] = countPercentage(
        demografikSemua['total_fined'],
        demografikSemua['total_accepted']
      );
      demografikSemua['total_percent'] = countPercentage(
        demografikSemua['total_accepted'] + demografikSemua['total_rejected'],
        demografikSemua['total_tandan']
      );
      demografikSemua['classification_summary'] =
        generateClassificationResultArray(
          demografikSemua['classification_summary']
        );

      demografikInti['total_accepted_percent'] = countPercentage(
        demografikInti['total_accepted'],
        demografikInti['total_tandan']
      );
      demografikInti['total_rejected_percent'] = countPercentage(
        demografikInti['total_rejected'],
        demografikInti['total_tandan']
      );
      demografikInti['total_fined_percent'] = countPercentage(
        demografikInti['total_fined'],
        demografikInti['total_accepted']
      );
      demografikInti['total_percent'] = countPercentage(
        demografikInti['total_accepted'] + demografikInti['total_rejected'],
        demografikInti['total_tandan']
      );
      demografikInti['classification_summary'] =
        generateClassificationResultArray(
          demografikInti['classification_summary']
        );

      demografikPlasma['total_accepted_percent'] = countPercentage(
        demografikPlasma['total_accepted'],
        demografikPlasma['total_tandan']
      );
      demografikPlasma['total_rejected_percent'] = countPercentage(
        demografikPlasma['total_rejected'],
        demografikPlasma['total_tandan']
      );
      demografikPlasma['total_fined_percent'] = countPercentage(
        demografikPlasma['total_fined'],
        demografikPlasma['total_accepted']
      );
      demografikPlasma['total_percent'] = countPercentage(
        demografikPlasma['total_accepted'] + demografikPlasma['total_rejected'],
        demografikPlasma['total_tandan']
      );
      demografikPlasma['classification_summary'] =
        generateClassificationResultArray(
          demografikPlasma['classification_summary']
        );

      demografikVendorInti = Object.keys(demografikVendorInti).map((key) => {
        const data = demografikVendorInti[key];
        return {
          label: data['vendor'],
          total_tandan: data['total_tandan'],
          percent_accepted: countPercentage(
            data['total_accepted'],
            data['total_tandan']
          ),
          percent_rejected: countPercentage(
            data['total_rejected'],
            data['total_tandan']
          ),
          percent_fined: countPercentage(
            data['total_fined'],
            data['total_accepted']
          ),
        };
      });
      demografikVendorPlasma = Object.keys(demografikVendorPlasma).map(
        (key) => {
          const data = demografikVendorPlasma[key];
          return {
            label: data['vendor'],
            total_tandan: data['total_tandan'],
            percent_accepted: countPercentage(
              data['total_accepted'],
              data['total_tandan']
            ),
            percent_rejected: countPercentage(
              data['total_rejected'],
              data['total_tandan']
            ),
            percent_fined: countPercentage(
              data['total_fined'],
              data['total_accepted']
            ),
          };
        }
      );

      const convertDataValue = (data) => {
        return Object.keys(data).reduce((obj, key) => {
          if (key === 'classification_summary') {
            obj[key] = data[key].map((e) => changeValueToLocalestring(e));

            return obj;
          }

          obj[key] =
            typeof data[key] === 'number'
              ? data[key].toLocaleString()
              : data[key];

          return obj;
        }, {});
      };

      let data = {
        start_date: date_from
          ? dayjs(date_from).format('DD/MM/YYYY HH:mm')
          : dayjs(inspections[0]['date']).format('DD/MM/YYYY HH:mm:ss'),
        end_date: date_to
          ? dayjs(date_to).format('DD/MM/YYYY HH:mm')
          : dayjs(inspections[inspections.length - 1]['date']).format(
              'DD/MM/YYYY HH:mm:ss'
            ),
        sinarmas_logo_img: getImageFile('sinarmas-logo.png'),
        agate_logo_img: getImageFile('agate-logo.png'),
        location: 'Langling, Jambi',
        summary: convertDataValue(demografikSemua),
        summary_inti: convertDataValue(demografikInti),
        summary_plasma: convertDataValue(demografikPlasma),
        vendor_inti: demografikVendorInti.length
          ? demografikVendorInti.map((e) => changeValueToLocalestring(e))
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
