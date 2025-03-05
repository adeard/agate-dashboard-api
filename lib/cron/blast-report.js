const dayjs = require('dayjs');
const CronJob = require('cron').CronJob;

require('dayjs/locale/id');
dayjs.locale('id');

const UserModel = require('../../models/user');
const WABroadcastModel = require('../../models/wa-broadcast');
const { default: axios } = require('axios');
const InspectionDataModel = require('../../models/inspection-data');
const { sleep, countPercentage } = require('../../utils/helpers');

const blastReportToUser = async () => {
  try {
    console.log('BLAST REPORT TO USER IS RUNNING');

    const users = await UserModel.find({
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

    await users.reduce(async (p, user) => {
      try {
        await p;
        if (user.subscribe_notification === 1) {
          const bc = await WABroadcastModel.create({
            user: user._id,
            variable_qiscus: {},
            status: 'pending',
            subject: `Daily Report - ${dayjs(startOfYesterday).format(
              'DD/MM/YYYY'
            )}`,
            template: 'agate_daily_report_6',
          });

          let inspections = await InspectionDataModel.find({
            date: {
              $gte: startOfYesterday,
              $lte: endOfYesterday,
            },
          }).lean();

          inspections = inspections.filter(
            (i) => i.grading_result?.total_tandan > 100
          );

          const acceptedObject = inspections.reduce(
            (obj, ins) => {
              obj['MATANG'] += ins['grading_result']['accepted_summary']?.[
                'MATANG'
              ]
                ? ins['grading_result']['accepted_summary']['MATANG']['TOTAL']
                : 0;
              obj['LEWAT MATANG'] += ins['grading_result'][
                'accepted_summary'
              ]?.['LEWAT MATANG']
                ? ins['grading_result']['accepted_summary']['LEWAT MATANG'][
                    'TOTAL'
                  ]
                : 0;

              for (const key of Object.keys(
                ins['grading_result']['accepted_summary']
              )) {
                obj['TANGKAI PANJANG'] +=
                  ins['grading_result']['accepted_summary'][key][
                    'TANGKAI PANJANG'
                  ];
              }

              return obj;
            },
            {
              MATANG: 0,
              'LEWAT MATANG': 0,
              'TANGKAI PANJANG': 0,
            }
          );

          const rejectedObject = inspections.reduce(
            (obj, ins) => {
              obj['MENTAH'] += ins['grading_result']['rejected_summary']?.[
                'MENTAH'
              ]
                ? ins['grading_result']['rejected_summary']['MENTAH']['TOTAL']
                : 0;
              obj['JANJANG KOSONG'] += ins['grading_result'][
                'rejected_summary'
              ]?.['JANJANG KOSONG']
                ? ins['grading_result']['rejected_summary']['JANJANG KOSONG'][
                    'TOTAL'
                  ]
                : 0;

              for (const key of Object.keys(
                ins['grading_result']['rejected_summary']
              )) {
                obj['BUAH KECIL DIBAWAH 3KG'] +=
                  ins['grading_result']['rejected_summary'][key][
                    'BUAH KECIL DIBAWAH 3KG'
                  ];
                obj['BUAH KECIL DIBAWAH 5KG'] +=
                  ins['grading_result']['rejected_summary'][key][
                    'BUAH KECIL DIBAWAH 5KG'
                  ];
              }

              return obj;
            },
            {
              MENTAH: 0,
              'JANJANG KOSONG': 0,
              'BUAH KECIL DIBAWAH 3KG': 0,
              'BUAH KECIL DIBAWAH 5KG': 0,
            }
          );

          const { totalAllTandan, totalAccepted, totalRejected } =
            inspections.reduce(
              (curr, acc) => {
                curr['totalAllTandan'] += Number(
                  acc.grading_result.total_tandan || 0
                );
                curr['totalAccepted'] += Number(
                  acc.grading_result.total_accepted || 0
                );
                curr['totalRejected'] += Number(
                  acc.grading_result.total_rejected || 0
                );

                return curr;
              },
              { totalAllTandan: 0, totalAccepted: 0, totalRejected: 0 }
            );

          acceptedObject['MATANG'] = countPercentage(
            acceptedObject['MATANG'],
            totalAccepted
          );
          acceptedObject['LEWAT MATANG'] = countPercentage(
            acceptedObject['LEWAT MATANG'],
            totalAccepted
          );
          acceptedObject['TANGKAI PANJANG'] = countPercentage(
            acceptedObject['TANGKAI PANJANG'],
            totalAccepted
          );

          rejectedObject['MENTAH'] = countPercentage(
            rejectedObject['MENTAH'],
            totalRejected
          );
          rejectedObject['JANJANG KOSONG'] = countPercentage(
            rejectedObject['JANJANG KOSONG'],
            totalRejected
          );
          rejectedObject['BUAH KECIL DIBAWAH 3KG'] = countPercentage(
            rejectedObject['BUAH KECIL DIBAWAH 3KG'],
            totalRejected
          );
          rejectedObject['BUAH KECIL DIBAWAH 5KG'] = countPercentage(
            rejectedObject['BUAH KECIL DIBAWAH 5KG'],
            totalRejected
          );

          const totalInspection = inspections.length;

          const factoryId = user.access_factory.length
            ? user.access_factory[0]
            : '66c3114ba342ddbf9eae83c1';

          const payload = {
            sendWhatsAppId: bc._id,
            template: 'agate_daily_report_6',
            variable_qiscus: {
              1: dayjs(startOfYesterday).format('DD MMMM YYYY'),
              2: 'KDA Langling Mill',
              3: totalInspection,
              4: `${Number(acceptedObject['MATANG'] || 0).toFixed(2)}%`,
              5: `${Number(acceptedObject['LEWAT MATANG'] || 0).toFixed(2)}%`,
              6: `${Number(acceptedObject['TANGKAI PANJANG'] || 0).toFixed(
                2
              )}%`,
              7: `${Number(rejectedObject['MENTAH'] || 0).toFixed(2)}%`,
              8: `${Number(
                rejectedObject['BUAH KECIL DIBAWAH 3KG'] || 0
              ).toFixed(2)}%`,
              9: `${Number(
                rejectedObject['BUAH KECIL DIBAWAH 5KG'] || 0
              ).toFixed(2)}%`,
              10: `${Number(rejectedObject['JANJANG KOSONG'] || 0).toFixed(
                2
              )}%`,
              // 3: `${percentAccepted.toFixed(2)}%`,
              // 4: `${percentRejected.toFixed(2)}%`,
              // 5: `${percentFined.toFixed(2)}%`,
              // 6: `https://api-grading-hq.accelego.id/api/v1/inspection-data/download-pdf/${factoryId}/summary?date_from=${startOfYesterday}&date_to=${endOfYesterday}`,
            },
            // redirect_url: `api/v1/inspection-data/download-pdf/${factoryId}/summary?date_from=${startOfYesterday}&date_to=${endOfYesterday}`,
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
