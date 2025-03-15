const dayjs = require('dayjs');
const CronJob = require('cron').CronJob;

require('dayjs/locale/id');
dayjs.locale('id');

const UserModel = require('../../models/user');
const WABroadcastModel = require('../../models/wa-broadcast');
const { default: axios } = require('axios');
const InspectionDataModel = require('../../models/inspection-data');
const {
  sleep,
  countPercentage,
  analyzeVendors,
} = require('../../utils/helpers');
const { scoringMultiplier } = require('../../utils/enum');

const groupGetScore = (group, key, inspection) => {};

const blastReportToUser = async () => {
  try {
    console.log('BLAST REPORT TO USER IS RUNNING');

    const users = await UserModel.find({
      // email: 'hi@accelego.id',
      whatsapp_number: { $exists: true },
      subscribe_notification: 1,
    }).lean();

    let startOfYesterday = dayjs()
      .subtract(1, 'day')
      .set('hour', 5)
      .set('minute', 0)
      .set('second', 0)
      .toISOString();

    let endOfYesterday = dayjs()
      .set('hour', 3)
      .set('minute', 0)
      .set('second', 0)
      .toISOString();

    let inspections = await InspectionDataModel.find({
      date: {
        $gte: startOfYesterday,
        $lte: endOfYesterday,
      },
    }).lean();

    inspections = inspections.filter(
      (i) => i.grading_result?.total_tandan > 200
    );

    const acceptedObject = {
      MATANG: 0,
      'LEWAT MATANG': 0,
      'TANGKAI PANJANG': 0,
      MENTAH: 0,
      'MATANG DITERIMA': 0,
      'LEWAT MATANG DITERIMA': 0,
      'TANGKAI PANJANG DITERIMA': 0,
      'MENTAH DITERIMA': 0,
    };

    const rejectedObject = {
      MENTAH: 0,
      'JANJANG KOSONG': 0,
      'BUAH KECIL DIBAWAH 3KG': 0,
      'BUAH KECIL DIBAWAH 5KG': 0,
    };

    const coutingObject = {
      totalAllTandan: 0,
      totalAccepted: 0,
      totalRejected: 0,
    };

    let vendorGroup = {};
    let truckGroup = {};

    inspections.forEach((ins) => {
      // VENDOR
      if (!vendorGroup[ins.vendor_name]) {
        vendorGroup[ins.vendor_name] = {
          total_accepted: 0,
          total_tandan: 0,
          jumlah_truk: 0,
          matang: 0,
          lewat_matang: 0,
          tangkai_panjang: 0,
          buah_kecil: 0,
          mentah: 0,
          janjang_kosong: 0,
        };
      }

      if (!truckGroup[ins.vehicle_number]) {
        truckGroup[ins.vehicle_number] = {
          vendor_name: '',
          total_accepted: 0,
          total_tandan: 0,
          total: 0,
          matang: 0,
          lewat_matang: 0,
          tangkai_panjang: 0,
          buah_kecil: 0,
          mentah: 0,
          janjang_kosong: 0,
          buah_kecil_3: 0,
          buah_kecil_5: 0,
        };
      }

      truckGroup[ins.vehicle_number]['vendor_name'] = ins.vendor_name;
      truckGroup[ins.vehicle_number]['total_tandan'] =
        ins.grading_result.total_tandan;

      truckGroup[ins.vehicle_number]['total_accepted'] =
        ins.grading_result.total_accepted;

      let totalMatangAccepted = ins['grading_result']['accepted_summary']?.[
        'MATANG'
      ]
        ? Number(ins['grading_result']['accepted_summary']['MATANG']['TOTAL']) -
          Number(
            ins['grading_result']['accepted_summary']['MATANG'][
              'BUAH KECIL DIBAWAH 3KG'
            ]
          ) -
          Number(
            ins['grading_result']['accepted_summary']['MATANG'][
              'BUAH KECIL DIBAWAH 5KG'
            ]
          )
        : 0;
      let totalLewatMatangAccepted = ins['grading_result'][
        'accepted_summary'
      ]?.['LEWAT MATANG']
        ? Number(
            ins['grading_result']['accepted_summary']['LEWAT MATANG']['TOTAL']
          ) -
          Number(
            ins['grading_result']['accepted_summary']['LEWAT MATANG'][
              'BUAH KECIL DIBAWAH 3KG'
            ]
          ) -
          Number(
            ins['grading_result']['accepted_summary']['LEWAT MATANG'][
              'BUAH KECIL DIBAWAH 5KG'
            ]
          )
        : 0;

      let totalMentahAccepted = ins['grading_result']['accepted_summary']?.[
        'MENTAH'
      ]
        ? Number(ins['grading_result']['accepted_summary']['MENTAH']['TOTAL']) -
          Number(
            ins['grading_result']['accepted_summary']['MENTAH'][
              'BUAH KECIL DIBAWAH 3KG'
            ]
          ) -
          Number(
            ins['grading_result']['accepted_summary']['MENTAH'][
              'BUAH KECIL DIBAWAH 5KG'
            ]
          )
        : 0;

      vendorGroup[ins.vendor_name]['jumlah_truk'] += 1;
      vendorGroup[ins.vendor_name]['total_accepted'] +=
        ins['grading_result']['total_accepted'];
      vendorGroup[ins.vendor_name]['total_tandan'] +=
        ins['grading_result']['total_tandan'];
      vendorGroup[ins.vendor_name]['matang'] += totalMatangAccepted;
      vendorGroup[ins.vendor_name]['lewat_matang'] += totalLewatMatangAccepted;

      acceptedObject['MATANG'] += totalMatangAccepted;
      acceptedObject['LEWAT MATANG'] += totalLewatMatangAccepted;
      acceptedObject['MENTAH'] += totalMentahAccepted;

      truckGroup[ins.vehicle_number]['matang'] += ins['grading_result'][
        'classification_summary'
      ]?.['MATANG']
        ? Number(
            ins['grading_result']['classification_summary']['MATANG']['TOTAL']
          ) -
          Number(
            ins['grading_result']['classification_summary']['MATANG'][
              'BUAH KECIL DIBAWAH 3KG'
            ]
          ) -
          Number(
            ins['grading_result']['classification_summary']['MATANG'][
              'BUAH KECIL DIBAWAH 5KG'
            ]
          )
        : 0;
      truckGroup[ins.vehicle_number]['lewat_matang'] += ins['grading_result'][
        'classification_summary'
      ]?.['LEWAT MATANG']
        ? Number(
            ins['grading_result']['classification_summary']['LEWAT MATANG'][
              'TOTAL'
            ]
          ) -
          Number(
            ins['grading_result']['classification_summary']['LEWAT MATANG'][
              'BUAH KECIL DIBAWAH 3KG'
            ]
          ) -
          Number(
            ins['grading_result']['classification_summary']['LEWAT MATANG'][
              'BUAH KECIL DIBAWAH 5KG'
            ]
          )
        : 0;
      truckGroup[ins.vehicle_number]['mentah'] += ins['grading_result'][
        'classification_summary'
      ]?.['MENTAH']
        ? Number(
            ins['grading_result']['classification_summary']['MENTAH']['TOTAL']
          ) -
          Number(
            ins['grading_result']['classification_summary']['MENTAH'][
              'BUAH KECIL DIBAWAH 3KG'
            ]
          ) -
          Number(
            ins['grading_result']['classification_summary']['MENTAH'][
              'BUAH KECIL DIBAWAH 5KG'
            ]
          )
        : 0;
      truckGroup[ins.vehicle_number]['janjang_kosong'] += ins['grading_result'][
        'classification_summary'
      ]?.['MATANG']
        ? Number(
            ins['grading_result']['classification_summary']['JANJANG KOSONG'][
              'TOTAL'
            ]
          ) -
          Number(
            ins['grading_result']['classification_summary']['JANJANG KOSONG'][
              'BUAH KECIL DIBAWAH 3KG'
            ]
          ) -
          Number(
            ins['grading_result']['classification_summary']['JANJANG KOSONG'][
              'BUAH KECIL DIBAWAH 5KG'
            ]
          )
        : 0;

      for (const key of Object.keys(
        ins['grading_result']['classification_summary']
      )) {
        truckGroup[ins.vehicle_number]['tangkai_panjang'] +=
          ins['grading_result']['classification_summary'][key][
            'TANGKAI PANJANG'
          ];
        truckGroup[ins.vehicle_number]['buah_kecil'] +=
          ins['grading_result']['classification_summary'][key][
            'BUAH KECIL DIBAWAH 3KG'
          ] +
          ins['grading_result']['classification_summary'][key][
            'BUAH KECIL DIBAWAH 5KG'
          ];

        truckGroup[ins.vehicle_number]['buah_kecil_3'] +=
          ins['grading_result']['classification_summary'][key][
            'BUAH KECIL DIBAWAH 3KG'
          ];

        truckGroup[ins.vehicle_number]['buah_kecil_5'] +=
          ins['grading_result']['classification_summary'][key][
            'BUAH KECIL DIBAWAH 5KG'
          ];
      }

      for (const key of Object.keys(
        ins['grading_result']['accepted_summary']
      )) {
        acceptedObject['TANGKAI PANJANG'] +=
          ins['grading_result']['accepted_summary'][key]['TANGKAI PANJANG'];
        vendorGroup[ins.vendor_name]['tangkai_panjang'] +=
          ins['grading_result']['accepted_summary'][key]['TANGKAI PANJANG'];
      }

      //Rejected

      rejectedObject['MENTAH'] += ins['grading_result']['rejected_summary']?.[
        'MENTAH'
      ]
        ? ins['grading_result']['rejected_summary']['MENTAH']['TOTAL']
        : 0;
      rejectedObject['JANJANG KOSONG'] += ins['grading_result'][
        'rejected_summary'
      ]?.['JANJANG KOSONG']
        ? ins['grading_result']['rejected_summary']['JANJANG KOSONG']['TOTAL']
        : 0;

      for (const key of Object.keys(
        ins['grading_result']['rejected_summary']
      )) {
        rejectedObject['BUAH KECIL DIBAWAH 3KG'] +=
          ins['grading_result']['rejected_summary'][key][
            'BUAH KECIL DIBAWAH 3KG'
          ];
        rejectedObject['BUAH KECIL DIBAWAH 5KG'] +=
          ins['grading_result']['rejected_summary'][key][
            'BUAH KECIL DIBAWAH 5KG'
          ];
      }

      // Counting

      coutingObject['totalAllTandan'] += Number(
        ins.grading_result.total_tandan || 0
      );
      coutingObject['totalAccepted'] += Number(
        ins.grading_result.total_accepted || 0
      );
      coutingObject['totalRejected'] += Number(
        ins.grading_result.total_rejected || 0
      );
    });

    // DITERIMA

    acceptedObject['MATANG DITERIMA'] = countPercentage(
      acceptedObject['MATANG'],
      coutingObject.totalAccepted
    );
    acceptedObject['LEWAT MATANG DITERIMA'] = countPercentage(
      acceptedObject['LEWAT MATANG'],
      coutingObject.totalAccepted
    );
    acceptedObject['TANGKAI PANJANG DITERIMA'] = countPercentage(
      acceptedObject['TANGKAI PANJANG'],
      coutingObject.totalAccepted
    );
    acceptedObject['MENTAH DITERIMA'] = countPercentage(
      acceptedObject['MENTAH'],
      coutingObject.totalAccepted
    );

    acceptedObject['MATANG'] = countPercentage(
      acceptedObject['MATANG'],
      coutingObject.totalAllTandan
    );
    acceptedObject['LEWAT MATANG'] = countPercentage(
      acceptedObject['LEWAT MATANG'],
      coutingObject.totalAllTandan
    );
    acceptedObject['TANGKAI PANJANG'] = countPercentage(
      acceptedObject['TANGKAI PANJANG'],
      coutingObject.totalAllTandan
    );
    acceptedObject['MENTAH'] = countPercentage(
      acceptedObject['MENTAH'],
      coutingObject.totalAllTandan
    );

    rejectedObject['MENTAH'] = countPercentage(
      rejectedObject['MENTAH'],
      coutingObject.totalAllTandan
    );
    rejectedObject['JANJANG KOSONG'] = countPercentage(
      rejectedObject['JANJANG KOSONG'],
      coutingObject.totalAllTandan
    );
    rejectedObject['BUAH KECIL DIBAWAH 3KG'] = countPercentage(
      rejectedObject['BUAH KECIL DIBAWAH 3KG'],
      coutingObject.totalAllTandan
    );
    rejectedObject['BUAH KECIL DIBAWAH 5KG'] = countPercentage(
      rejectedObject['BUAH KECIL DIBAWAH 5KG'],
      coutingObject.totalAllTandan
    );

    truckGroup = Object.keys(truckGroup).reduce((obj, key) => {
      let item = truckGroup[key];

      // console.log({item})

      let scoreMatang = item['matang'] * scoringMultiplier['matang'];
      let scoreLewatMatang =
        item['lewat_matang'] * scoringMultiplier['lewat_matang'];
      let scoreJanjangKosong =
        item['janjang_kosong'] * scoringMultiplier['janjang_kosong'];
      let scoreMentah = item['mentah'] * scoringMultiplier['mentah'];
      let scoreTp =
        item['tangkai_panjang'] * scoringMultiplier['tangkai_panjang'];
      let scoreBuahKecil = item['buah_kecil'] * scoringMultiplier['buah_kecil'];

      item['matang'] = countPercentage(
        item['matang'],
        item['total_tandan']
      ).toFixed(2);
      item['lewat_matang'] = countPercentage(
        item['lewat_matang'],
        item['total_tandan']
      ).toFixed(2);
      item['mentah'] = countPercentage(
        item['mentah'],
        item['total_tandan']
      ).toFixed(2);
      item['janjang_kosong'] = countPercentage(
        item['janjang_kosong'],
        item['total_tandan']
      ).toFixed(2);
      item['tangkai_panjang'] = countPercentage(
        item['tangkai_panjang'],
        item['total_tandan']
      ).toFixed(2);
      item['buah_kecil_3'] = countPercentage(
        item['buah_kecil_3'],
        item['total_tandan']
      ).toFixed(2);
      item['buah_kecil_5'] = countPercentage(
        item['buah_kecil_5'],
        item['total_tandan']
      ).toFixed(2);

      obj.push({
        vehicle_number: key,
        vendor_name: item.vendor_name,
        percent_accepted:
          countPercentage(item.total_accepted, item.total_tandan).toFixed(2) +
          '%',
        final_score:
          scoreMatang +
          scoreLewatMatang +
          scoreJanjangKosong +
          scoreMentah +
          scoreTp +
          scoreBuahKecil,
        item,
      });

      return obj;
    }, []);

    truckGroup = truckGroup.sort((a, b) => a.final_score - b.final_score);
    truckGroup = truckGroup.slice(0, 3);

    vendorGroup = Object.keys(vendorGroup).reduce((obj, key) => {
      let item = vendorGroup[key];

      item['matang'] = countPercentage(item['matang'], item['total_tandan']);
      item['lewat_matang'] = countPercentage(
        item['lewat_matang'],
        item['total_tandan']
      );
      item['tangkai_panjang'] = countPercentage(
        item['tangkai_panjang'],
        item['total_accepted']
      );

      if (!item['matang_score']) {
        item['matang_score'] = item['matang'] * scoringMultiplier['matang'];
      }
      if (!item['lewat_matang_score']) {
        item['lewat_matang_score'] =
          item['lewat_matang'] * scoringMultiplier['lewat_matang'];
      }
      if (!item['tangkai_panjang_score']) {
        item['tangkai_panjang_score'] =
          item['tangkai_panjang'] * scoringMultiplier['tangkai_panjang'];
      }

      if (!item['final_score']) {
        item['final_score'] =
          item['matang_score'] +
          item['lewat_matang_score'] -
          Math.abs(item['tangkai_panjang_score']);
      }

      return obj;
    }, vendorGroup);

    const { bestVendor, mostProductiveVendor } = analyzeVendors(vendorGroup);

    // console.log({ bestVendor, mostProductiveVendor });

    const totalInspection = inspections.length;

    await users.reduce(async (p, user) => {
      try {
        await p;
        if (user.subscribe_notification === 1) {
          const factoryId = user.access_factory.length
            ? user.access_factory[0]
            : '66c3114ba342ddbf9eae83c1';

          const bcVendor = await WABroadcastModel.create({
            user: user._id,
            variable_qiscus: {},
            status: 'pending',
            subject: `Daily Report Vendor - ${dayjs(startOfYesterday).format(
              'DD/MM/YYYY'
            )}`,
            template: 'agate_daily_vendor_report_070325_1228',
          });
          const payloadVendor = {
            sendWhatsAppId: bcVendor._id,
            template: 'agate_daily_vendor_report_070325_1228',
            variable_qiscus: {
              1: dayjs(startOfYesterday).format('DD MMMM YYYY'),
              2: 'KDA Langling Mill',
              3: totalInspection,
              4: mostProductiveVendor.code,
              5:
                mostProductiveVendor.data.jumlah_truk +
                ` (${countPercentage(
                  mostProductiveVendor.data.jumlah_truk,
                  totalInspection
                ).toFixed(2)}%)`,
              6: Number(mostProductiveVendor.data.matang).toFixed(2) + '%',
              7:
                Number(mostProductiveVendor.data.lewat_matang).toFixed(2) + '%',
              8:
                Number(mostProductiveVendor.data.tangkai_panjang).toFixed(2) +
                '%',
              9: bestVendor.code,
              10:
                bestVendor.data.jumlah_truk +
                ` (${countPercentage(
                  bestVendor.data.jumlah_truk,
                  totalInspection
                ).toFixed(2)}%)`,
              11: Number(bestVendor.data.matang).toFixed(2) + '%',
              12: Number(bestVendor.data.lewat_matang).toFixed(2) + '%',
              13: Number(bestVendor.data.tangkai_panjang).toFixed(2) + '%',
              // 3: `${percentAccepted.toFixed(2)}%`,
              // 4: `${percentRejected.toFixed(2)}%`,
              // 5: `${percentFined.toFixed(2)}%`,
              // 6: `https://api-grading-hq.accelego.id/api/v1/inspection-data/download-pdf/${factoryId}/summary?date_from=${startOfYesterday}&date_to=${endOfYesterday}`,
            },
            redirect_url: `api/v1/inspection-data/download-pdf/${factoryId}/summary?date_from=${startOfYesterday}&date_to=${endOfYesterday}`,
            phone: user.whatsapp_number,
            origin: 'https://api-grading-hq.accelego.id/api/v2/sync/wa-status',
            source: 'agate',
          };
          const responseVendor = await axios.post(
            `${process.env.WA_URI}/api/v2/broadcast`,
            payloadVendor,
            {
              params: {
                direct: 1,
              },
            }
          );
          if (responseVendor) {
            // console.log({ response });
            await WABroadcastModel.findByIdAndUpdate(bcVendor._id, {
              $set: { status: responseVendor.data.status },
            });
          }

          const bc = await WABroadcastModel.create({
            user: user._id,
            variable_qiscus: {},
            status: 'pending',
            subject: `Daily Report - ${dayjs(startOfYesterday).format(
              'DD/MM/YYYY'
            )}`,
            template: 'agate_daily_report_070325_1220',
          });
          const payload = {
            sendWhatsAppId: bc._id,
            template: 'agate_daily_report_070325_1220',
            variable_qiscus: {
              1: dayjs(startOfYesterday).format('DD MMMM YYYY'),
              2: 'KDA Langling Mill',
              3: totalInspection,
              4: `${Number(acceptedObject['MATANG'] || 0).toFixed(
                2
              )}% (${Number(acceptedObject['MATANG DITERIMA'] || 0).toFixed(
                2
              )}%)`,
              5: `${Number(acceptedObject['LEWAT MATANG'] || 0).toFixed(
                2
              )}% (${Number(
                acceptedObject['LEWAT MATANG DITERIMA'] || 0
              ).toFixed(2)}%)`,
              6: `${Number(acceptedObject['TANGKAI PANJANG'] || 0).toFixed(
                2
              )}% (${Number(
                acceptedObject['TANGKAI PANJANG DITERIMA'] || 0
              ).toFixed(2)}%)`,
              7: `${Number(acceptedObject['MENTAH'] || 0).toFixed(
                2
              )}% (${Number(acceptedObject['MENTAH DITERIMA'] || 0).toFixed(
                2
              )}%)`,
              8: `${Number(rejectedObject['MENTAH'] || 0).toFixed(2)}%`,
              9: `${Number(
                rejectedObject['BUAH KECIL DIBAWAH 3KG'] || 0
              ).toFixed(2)}%`,
              10: `${Number(
                rejectedObject['BUAH KECIL DIBAWAH 5KG'] || 0
              ).toFixed(2)}%`,
              11: `${Number(rejectedObject['JANJANG KOSONG'] || 0).toFixed(
                2
              )}%`,
              // 3: `${percentAccepted.toFixed(2)}%`,
              // 4: `${percentRejected.toFixed(2)}%`,
              // 5: `${percentFined.toFixed(2)}%`,
              // 6: `https://api-grading-hq.accelego.id/api/v1/inspection-data/download-pdf/${factoryId}/summary?date_from=${startOfYesterday}&date_to=${endOfYesterday}`,
            },
            redirect_url: `api/v1/inspection-data/download-pdf/${factoryId}/summary?date_from=${startOfYesterday}&date_to=${endOfYesterday}`,
            phone: user.whatsapp_number,
            origin: 'https://api-grading-hq.accelego.id/api/v2/sync/wa-status',
            source: 'agate',
          };

          const response = await axios.post(
            `${process.env.WA_URI}/api/v2/broadcast`,
            payload,
            {
              params: {
                direct: 1,
              },
            }
          );
          if (response) {
            // console.log({ response });
            await WABroadcastModel.findByIdAndUpdate(bc._id, {
              $set: { status: response.data.status },
            });
          }

          if (truckGroup.length) {
            const bcTruck = await WABroadcastModel.create({
              user: user._id,
              variable_qiscus: {},
              status: 'pending',
              subject: `Daily Report Vendor - ${dayjs(startOfYesterday).format(
                'DD/MM/YYYY'
              )}`,
              template: 'agate_daily_vendor_report_070325_1228',
            });
            const payloadTruck = {
              sendWhatsAppId: bcTruck._id,
              template: 'agate_top_3_vendor_terburuk_10032025_1100',
              variable_qiscus: {
                1: dayjs(startOfYesterday).format('DD MMMM YYYY'),
                2: 'KDA Langling Mill',
                3: `${truckGroup[0].vehicle_number} (${truckGroup[0].vendor_name})`,
                4: truckGroup[0].item['matang'] + '%',
                5: truckGroup[0].item['lewat_matang'] + '%',
                6: truckGroup[0].item['tangkai_panjang'] + '%',
                7: truckGroup[0].item['mentah'] + '%',
                8: truckGroup[0].item['janjang_kosong'] + '%',
                9: truckGroup[0].item['buah_kecil_3'] + '%',
                10: truckGroup[0].item['buah_kecil_5'] + '%',
                11:
                  truckGroup?.length > 1
                    ? `${truckGroup?.[1].vehicle_number || '-'} (${
                        truckGroup?.[1].vendor_name || '-'
                      }) - Diterima ${truckGroup[1].percent_accepted}`
                    : '-',
                12:
                  truckGroup?.length > 2
                    ? `${truckGroup?.[2].vehicle_number || '-'} (${
                        truckGroup?.[2].vendor_name || '-'
                      }) - Diterima ${truckGroup[2].percent_accepted}`
                    : '-',

                // 3: `${percentAccepted.toFixed(2)}%`,
                // 4: `${percentRejected.toFixed(2)}%`,
                // 5: `${percentFined.toFixed(2)}%`,
                // 6: `https://api-grading-hq.accelego.id/api/v1/inspection-data/download-pdf/${factoryId}/summary?date_from=${startOfYesterday}&date_to=${endOfYesterday}`,
              },
              // redirect_url: `api/v1/inspection-data/download-pdf/${factoryId}/summary?date_from=${startOfYesterday}&date_to=${endOfYesterday}`,
              phone: user.whatsapp_number,
              origin:
                'https://api-grading-hq.accelego.id/api/v2/sync/wa-status',
              source: 'agate',
            };
            const responseTruck = await axios.post(
              `${process.env.WA_URI}/api/v2/broadcast`,
              payloadTruck,
              {
                params: {
                  direct: 1,
                },
              }
            );
            if (responseTruck) {
              // console.log({ response });
              await WABroadcastModel.findByIdAndUpdate(bcVendor._id, {
                $set: { status: responseTruck.data.status },
              });
            }
          }

          await sleep(3000);
        } else {
          return;
        }
      } catch (err) {
        throw err;
      }
    }, Promise.resolve());

    console.log('BLAST REPORT DONE!');
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  blastReportToUser,
  runBlasReportCron: () =>
    new CronJob(
      '0 7 * * *', // This cron expression means "At 07:00 AM every day"
      async function () {
        console.log('Cron Report Started');
        await blastReportToUser();
      },
      null,
      true,
      'Asia/Jakarta'
    ),
};
