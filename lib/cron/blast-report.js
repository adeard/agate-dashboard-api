const dayjs = require('dayjs');
const CronJob = require('cron').CronJob;

const UserModel = require('../../models/user');
const WABroadcastModel = require('../../models/wa-broadcast');
const { default: axios } = require('axios');
const InspectionDataModel = require('../../models/inspection-data');
const { sleep } = require('../../utils/helpers');

const blastReportToUser = async () => {
  try {
    console.log('BLAST REPORT TO USER IS RUNNING');

    const users = await UserModel.find({
      whatsapp_number: { $exists: true },
      subscribe_notification: 1,
    }).lean();

    const startOfYesterday = dayjs().subtract(1, 'day').startOf('day').toDate();
    const endOfYesterday = dayjs().subtract(1, 'day').endOf('day').toDate();

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
            template: 'agate_daily_report_2',
          });

          const inspections = await InspectionDataModel.find({
            date: {
              $gte: startOfYesterday,
              $lte: endOfYesterday,
            },
          }).lean();

          const totalAllTandon = inspections.reduce(
            (curr, acc) => Number(acc.grading_result.total_tandan || 0) + curr,
            0
          );
          const totalRejected = inspections.reduce(
            (curr, acc) =>
              Number(acc.grading_result.total_rejected || 0) + curr,
            0
          );
          const totalPassed = inspections.reduce(
            (curr, acc) =>
              Number(acc.grading_result.total_accepted || 0) + curr,
            0
          );
          const totalFined = inspections.reduce(
            (curr, acc) => Number(acc.grading_result.total_fined || 0) + curr,
            0
          );
          const totalInspection = inspections.length;

          const percentRejected =
            totalAllTandon > 0
              ? ((totalRejected || 0) / (totalAllTandon || 1)) * 100
              : 0;
          const percentAccepted =
            totalAllTandon > 0
              ? ((totalPassed || 0) / (totalAllTandon || 1)) * 100
              : 0;
          const percentFined =
            totalPassed > 0 && totalFined > 0
              ? ((totalFined || 0) / (totalPassed || 1)) * 100
              : 0;

          const factoryId = user.access_factory.length
            ? user.access_factory[0]
            : '66c3114ba342ddbf9eae83c1';

          const payload = {
            sendWhatsAppId: bc._id,
            template: 'agate_daily_report_3',
            variable_qiscus: {
              1: dayjs(startOfYesterday).format('DD MMMM YYYY'),
              2: totalInspection,
              3: `${percentAccepted.toFixed(2)}%`,
              4: `${percentRejected.toFixed(2)}%`,
              5: `${percentFined.toFixed(2)}%`,
            },
            redirect_url: `api/v1/inspection-data/download-pdf/${factoryId}/summary`,
            phone: user.whatsapp_number,
            origin: 'https://api-grading-hq.accelego.id/api/v2/sync/wa-status',
            source: 'agate',
          };

          const response = await axios.post(
            `${process.env.WA_URI}/api/v2/broadcast`,
            payload
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
