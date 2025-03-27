const { default: axios } = require('axios');
const FactoryModel = require('../../models/factory');
const InspectionDataModel = require('../../models/inspection-data');
const VendorV2Model = require('../../models/v2/vendor');
const WABroadcastModel = require('../../models/wa-broadcast');
const {
  createResponseSuccess,
  countPercentage,
} = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');
const dayjs = require('dayjs');

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const broadcastReport = async (payload) => {
  await Promise.all([
    axios.post(`${process.env.WA_URI}/api/v2/broadcast`, {
      ...payload,
      phone: '6285266900607',
    }),
    axios.post(`${process.env.WA_URI}/api/v2/broadcast`, {
      ...payload,
      phone: '6285295058857',
    }),
  ]);
  // await axios.post(`${process.env.WA_URI}/api/v2/broadcast`, {
  //   ...payload,
  //   phone: '6281385784854',
  // });
  // await axios.post(`${process.env.WA_URI}/api/v2/broadcast`, {
  //   ...payload,
  //   phone: '6282111161253',
  // });
};

class SyncDataController {
  static async syncVendor(req, res, next) {
    try {
      const body = req.body;

      delete body['is_integrated'];

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

      let vendor = await VendorV2Model.findOne({
        id: body['vendor_id'],
      }).lean();

      if (!vendor) {
        vendor = await VendorV2Model.create({
          id: body['vendor_id'],
          name: body['vendor_name'],
          type: body['vendor_type'],
        });
      }

      // const founded = await InspectionDataModel.findOne({
      //   id: body['id'],
      // }).lean();

      // if (founded) {
      //   return res.status(200).json(
      //     createResponseSuccess(
      //       200,
      //       'Success',
      //       'Inspection already integrated',
      //       {
      //         data: true,
      //       }
      //     )
      //   );
      // }

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

      if (direct && doc.grading_result['total_tandan'] > 100) {
        const finedObject = {};
        const finedSummary = doc.grading_result.fined_summary;
        const fined = Object.keys(finedSummary);

        let totalFined = 0;
        let totalFinedKg = 0;

        if (fined.length) {
          fined.forEach((key) => {
            if (!finedObject[key]) {
              let total = finedSummary[key]['TOTAL']
                ? finedSummary[key]['TOTAL']
                : 0;
              let finedKg = finedSummary[key]['DENDA']
                ? finedSummary[key]['DENDA']
                : 0;
              finedObject[key] = `${Number(
                total
              ).toLocaleString()} Jjg / ${Math.round(
                Number(total || 0) * Number(finedKg || 0)
              ).toLocaleString()}kg`;

              totalFined += total;
              totalFinedKg += total * finedKg;
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

        let totalMatang = doc.grading_result['accepted_summary']?.['MATANG']
          ? Number(
              doc.grading_result['accepted_summary']['MATANG']['TOTAL'] || 0
            ) -
            Number(
              doc.grading_result['accepted_summary']['MATANG'][
                'BUAH KECIL DIBAWAH 3KG'
              ] || 0
            ) -
            Number(
              doc.grading_result['accepted_summary']['MATANG'][
                'BUAH KECIL DIBAWAH 5KG'
              ] || 0
            )
          : 0;
        let totalLewatMatang = doc.grading_result['accepted_summary']?.[
          'LEWAT MATANG'
        ]
          ? Number(
              doc.grading_result['accepted_summary']['LEWAT MATANG']['TOTAL'] ||
                0
            ) -
            Number(
              doc.grading_result['accepted_summary']['LEWAT MATANG'][
                'BUAH KECIL DIBAWAH 3KG'
              ] || 0
            ) -
            Number(
              doc.grading_result['accepted_summary']['LEWAT MATANG'][
                'BUAH KECIL DIBAWAH 5KG'
              ] || 0
            )
          : 0;
        let totalTangkaiPanjang = Number(
          Object.values(doc.grading_result['accepted_summary']).reduce(
            (total, category) => {
              return total + ((category && category?.['TANGKAI PANJANG']) || 0);
            },
            0
          )
        );
        let totalMentah = doc.grading_result['rejected_summary']?.['MENTAH']
          ? Number(
              doc.grading_result['rejected_summary']['MENTAH']['TOTAL'] || 0
            ) -
            Number(
              doc.grading_result['rejected_summary']['MENTAH'][
                'BUAH KECIL DIBAWAH 3KG'
              ] || 0
            ) -
            Number(
              doc.grading_result['rejected_summary']['MENTAH'][
                'BUAH KECIL DIBAWAH 5KG'
              ] || 0
            )
          : 0;
        let totalJanjangKosong = doc.grading_result['rejected_summary']?.[
          'JANJANG KOSONG'
        ]
          ? Number(
              doc.grading_result['rejected_summary']['JANJANG KOSONG'][
                'TOTAL'
              ] || 0
            ) -
            Number(
              doc.grading_result['rejected_summary']['JANJANG KOSONG'][
                'BUAH KECIL DIBAWAH 3KG'
              ] || 0
            ) -
            Number(
              doc.grading_result['rejected_summary']['JANJANG KOSONG'][
                'BUAH KECIL DIBAWAH 5KG'
              ] || 0
            )
          : 0;
        let totalBuahKecil = Number(
          Object.values(doc.grading_result['rejected_summary']).reduce(
            (total, category) => {
              return (
                total +
                ((category && category?.['BUAH KECIL DIBAWAH 3KG']) || 0) +
                ((category && category?.['BUAH KECIL DIBAWAH 5KG']) || 0)
              );
            },
            0
          )
        );

        const payload = {
          sendWhatsAppId: 'direct',
          template: 'agate_truk_110325_2036',
          variable_qiscus: {
            1: `KDA Langling Mill (AGATE Mesin ${String(doc.machine).padStart(
              2,
              '0'
            )})`,
            2: dayjs(doc.date).format('DD MMMM YYYY'),
            3: dayjs(doc.date).format('HH:mm:ss'),
            4: dayjs(doc.finish_date).format('HH:mm:ss'),
            5: `${doc.vehicle_number} (${doc.vendor_name})`,
            6: doc.grading_result.total_tandan,
            7: formatter.format(percentAccepted) + '%',
            8: formatter.format(percentRejected) + '%',
            9: `${totalFined.toLocaleString('en')} Jjg /  ${Math.round(
              totalFinedKg
            ).toLocaleString('en')}kg`,
            10: `${totalMatang} (${formatter.format(
              countPercentage(totalMatang, totalTandan)
            )}%)`,
            11: `${totalLewatMatang} (${formatter.format(
              countPercentage(totalLewatMatang, totalTandan)
            )}%)`,

            12: `${totalTangkaiPanjang} (${formatter.format(
              countPercentage(totalTangkaiPanjang, totalAccepted)
            )}%)`,
            13: `${totalMentah} (${formatter.format(
              countPercentage(totalMentah, totalTandan)
            )}%)`,
            14: `${totalJanjangKosong} (${formatter.format(
              countPercentage(totalJanjangKosong, totalTandan)
            )}%)`,
            15: `${totalBuahKecil} (${formatter.format(
              countPercentage(totalBuahKecil, totalTandan)
            )}%)`,
            // 14: `https://api-grading-hq.accelego.id/api/v1/inspection-data/download-pdf/${doc._id}`,
          },
          redirect_url: `api/v1/inspection-data/download-pdf/${doc._id}`,
          origin: 'https://api-grading-hq.accelego.id/api/v2/sync/wa-status',
          source: 'agate',
        };

        await broadcastReport(payload);

        // let totalMatang = doc.grading_result['accepted_summary']?.['MATANG']
        //   ? (
        //       Number(
        //         doc.grading_result['accepted_summary']['MATANG']['TOTAL'] || 0
        //       ) -
        //       Number(
        //         doc.grading_result['accepted_summary']['MATANG'][
        //           'BUAH KECIL DIBAWAH 3KG'
        //         ] || 0
        //       ) -
        //       Number(
        //         doc.grading_result['accepted_summary']['MATANG'][
        //           'BUAH KECIL DIBAWAH 5KG'
        //         ] || 0
        //       )
        //     ).toLocaleString('en')
        //   : 0;
        // let totalLewatMatang = doc.grading_result['accepted_summary']?.[
        //   'LEWAT MATANG'
        // ]
        //   ? (
        //       Number(
        //         doc.grading_result['accepted_summary']['LEWAT MATANG'][
        //           'TOTAL'
        //         ] || 0
        //       ) -
        //       Number(
        //         doc.grading_result['accepted_summary']['LEWAT MATANG'][
        //           'BUAH KECIL DIBAWAH 3KG'
        //         ] || 0
        //       ) -
        //       Number(
        //         doc.grading_result['accepted_summary']['LEWAT MATANG'][
        //           'BUAH KECIL DIBAWAH 5KG'
        //         ] || 0
        //       )
        //     ).toLocaleString('en')
        //   : 0;
        // const totalTangkaiPanjang = Object.keys(
        //   doc.grading_result.accepted_summary
        // ).reduce(
        //   (curr, key) =>
        //     Number(
        //       doc.grading_result.accepted_summary[key]['TANGKAI PANJANG'] || 0
        //     ) + curr,
        //   0
        // );

        // const percentageLewatMatang = countPercentage(
        //   totalLewatMatang,
        //   totalTandan
        // );
        // const percentageMatang = countPercentage(totalMatang, totalTandan);
        // const percentageTangkaiPanjang = countPercentage(
        //   totalTangkaiPanjang,
        //   totalAccepted
        // );

        // if (percentageLewatMatang > 15) {
        //   const payloadWarning = {
        //     sendWhatsAppId: 'direct-warning-lm',
        //     template: 'agate_warning_lewat_matang_050325_1007',
        //     variable_qiscus: {
        //       1: String(doc.machine).padStart(2, "0"),
        //       2: dayjs(doc.date).format('DD MMMM YYYY'),
        //       3: dayjs(doc.date).format('HH:mm'),
        //       4: doc.vehicle_number,
        //       5: doc.vendor_name,
        //       6: formatter.format(percentageMatang) + '%',
        //       7: formatter.format(percentageLewatMatang) + '%',
        //       8: formatter.format(percentageTangkaiPanjang) + '%',
        //     },
        //     // redirect_url: `inspection-data/download-pdf/${doc._id}`,
        //     origin: 'https://api-grading-hq.accelego.id/api/v2/sync/wa-status',
        //     source: 'agate',
        //   };
        //   await broadcastReport(payloadWarning);
        // }

        // if (percentRejected > 10) {
        //   let totalMentah = doc.grading_result['rejected_summary']?.['MENTAH']
        //     ? (
        //         Number(
        //           doc.grading_result['rejected_summary']['MENTAH']['TOTAL'] || 0
        //         ) -
        //         Number(
        //           doc.grading_result['rejected_summary']['MENTAH'][
        //             'BUAH KECIL DIBAWAH 3KG'
        //           ] || 0
        //         ) -
        //         Number(
        //           doc.grading_result['rejected_summary']['MENTAH'][
        //             'BUAH KECIL DIBAWAH 5KG'
        //           ] || 0
        //         )
        //       ).toLocaleString('en')
        //     : 0;
        //   let totalJanjangKosong = doc.grading_result['rejected_summary']?.[
        //     'JANJANG KOSONG'
        //   ]
        //     ? (
        //         Number(
        //           doc.grading_result['rejected_summary']['JANJANG KOSONG'][
        //             'TOTAL'
        //           ] || 0
        //         ) -
        //         Number(
        //           doc.grading_result['rejected_summary']['JANJANG KOSONG'][
        //             'BUAH KECIL DIBAWAH 3KG'
        //           ] || 0
        //         ) -
        //         Number(
        //           doc.grading_result['rejected_summary']['JANJANG KOSONG'][
        //             'BUAH KECIL DIBAWAH 5KG'
        //           ] || 0
        //         )
        //       ).toLocaleString('en')
        //     : 0;
        //   const totalBuah3kg = Object.keys(
        //     doc.grading_result.rejected_summary
        //   ).reduce(
        //     (curr, key) =>
        //       Number(
        //         doc.grading_result.rejected_summary[key][
        //           'BUAH KECIL DIBAWAH 3KG'
        //         ] || 0
        //       ) + curr,
        //     0
        //   );

        //   const totalBuah5kg = Object.keys(
        //     doc.grading_result.rejected_summary
        //   ).reduce(
        //     (curr, key) =>
        //       Number(
        //         doc.grading_result.rejected_summary[key][
        //           'BUAH KECIL DIBAWAH 5KG'
        //         ] || 0
        //       ) + curr,
        //     0
        //   );

        //   const percentageJanjangKosong = countPercentage(
        //     totalJanjangKosong,
        //     totalTandan
        //   );
        //   const percentageMentah = countPercentage(totalMentah, totalTandan);
        //   const percentageBuah3Kg = countPercentage(totalBuah3kg, totalTandan);
        //   const percentageBuah5Kg = countPercentage(totalBuah5kg, totalTandan);

        //   const payloadRejected = {
        //     sendWhatsAppId: 'direct-warning-lm',
        //     template: 'agate_warning_reject_050325_1012',
        //     variable_qiscus: {
        //       1: String(doc.machine).padStart(2, "0"),
        //       2: dayjs(doc.date).format('DD MMMM YYYY'),
        //       3: dayjs(doc.date).format('HH:mm'),
        //       4: doc.vehicle_number,
        //       5: doc.vendor_name,
        //       6: formatter.format(percentageMentah) + '%',
        //       7: formatter.format(percentageJanjangKosong) + '%',
        //       8: formatter.format(percentageBuah3Kg) + '%',
        //       9: formatter.format(percentageBuah5Kg) + '%',
        //     },
        //     redirect_url: `inspection-data/download-pdf/${doc._id}`,
        //     origin: 'https://api-grading-hq.accelego.id/api/v2/sync/wa-status',
        //     source: 'agate',
        //   };

        //   await broadcastReport(payloadRejected);
        // }
      }

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success create integrate inspection',
            { success: true }
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

  static async syncInspectionImage(req, res, next) {
    // return res.status(200).json({ success: true, url: null });
    try {
      const file = req.file;
      const { id } = req.params;

      console.log({ file, id });

      if (!file.url) {
        return res.status(200).json(
          createResponseSuccess(200, 'Success', 'Success integrate image', {
            url: null,
          })
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
            'Success',
            'Success create integrate inspection',
            { url: file.url }
          )
        );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  }
}

module.exports = SyncDataController;
