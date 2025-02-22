require('dotenv').config();

const { hashPassword } = require('../lib/bcrypt');
const { blastReportToUser } = require('../lib/cron/blast-report');
const connectToDatabase = require('../lib/db-connect');
const FactoryModel = require('../models/factory');
const InspectionHistoryModel = require('../models/inspection-history');
const UserModel = require('../models/user');
const VendorModel = require('../models/vendor');
const dayjs = require('dayjs');
const { generateRandomPassword } = require('../utils/helpers');
const InspectionDataModel = require('../models/inspection-data');

// console.log(generateRandomPassword(6));

connectToDatabase().then(async (res) => {
  // console.log(res);

  // function generateRandomNumber(min, max) {
  //   return Math.floor(Math.random() * (max - min + 1)) + min;
  // }

  // function generateRandomPercentage(min = 1, max = 100) {
  //   return generateRandomNumber(min, max) / 100;
  // }

  // function generateRandomDate() {
  //   const start = dayjs('2023-12-01');
  //   const end = dayjs('2024-01-10');

  //   const randomDays = generateRandomNumber(0, end.diff(start, 'days'));
  //   return start.add(randomDays, 'day');
  // }

  // function generateRandomVehicleNumber() {
  //   const numberPart = generateRandomNumber(1000, 9999);
  //   const alphabetPart = String.fromCharCode(65 + generateRandomNumber(0, 25));
  //   return `B ${numberPart} ${alphabetPart}DE`;
  // }

  // function generateRandomWaybillNumber(sequence) {
  //   return `SJ/${sequence.toString().padStart(3, '0')}`;
  // }

  // function generateRandomNotes() {
  //   return 'Lorem ipsum dolor sit amet';
  // }

  // function generateRandomFactoryVendorPair() {
  //   const pairs = [
  //     {
  //       vendor: '652621640f8ad0bbc6244645',
  //       factory: '652619a37ddae59c46b7fedd',
  //     },
  //     {
  //       vendor: '652d758ac9aac62b143f6417',
  //       factory: '652619987ddae59c46b7fed9',
  //     },
  //   ];
  //   return pairs[Math.floor(Math.random() * pairs.length)];
  // }

  // function generateRandomSummary() {
  //   const { factory, vendor } = generateRandomFactoryVendorPair();
  //   const waybillNumber = generateRandomWaybillNumber(1);
  //   const vehicleNumber = generateRandomVehicleNumber();
  //   const startDate = generateRandomDate();
  //   const finishDate = dayjs(startDate).add(3, 'day').format('YYYY-MM-DD');

  //   const totalTandon = generateRandomNumber(100, 500);
  //   const totalRejected = generateRandomNumber(
  //     1,
  //     Math.min(totalTandon, 0.15 * totalTandon)
  //   );
  //   const totalReceived = totalTandon - totalRejected;

  //   const totalInKg = totalReceived * 10;

  //   const acceptedTypes = [
  //     'unripe_accepted',
  //     'over_ripe_accepted',
  //     'ripe_accepted',
  //     'semi_ripe_accepted',
  //   ];
  //   const selectedAcceptedTypes = acceptedTypes.slice(
  //     0,
  //     generateRandomNumber(1, 3)
  //   );

  //   const standard = {};
  //   selectedAcceptedTypes.forEach((type) => {
  //     standard[type] = ['all', generateRandomNumber(1, 5)][
  //       generateRandomNumber(0, 1)
  //     ];
  //   });

  //   const unripeMin = 0.1 * totalTandon;
  //   const unripeMax = 0.2 * totalTandon;
  //   const unripePercentage = generateRandomPercentage(unripeMin, unripeMax);

  //   const halfRipeMin = 0.1 * totalTandon;
  //   const halfRipeMax = 0.3 * totalTandon;
  //   const halfRipePercentage = generateRandomPercentage(
  //     halfRipeMin,
  //     halfRipeMax
  //   );

  //   const ripeMin = 0.4 * totalTandon;
  //   const ripeMax = 0.7 * totalTandon;
  //   const ripePercentage = generateRandomPercentage(ripeMin, ripeMax);

  //   const overRipeMin = 0.05 * totalTandon;
  //   const overRipeMax = 0.1 * totalTandon;
  //   const overRipePercentage = generateRandomPercentage(
  //     overRipeMin,
  //     overRipeMax
  //   );

  //   const rottenMin = 0.01 * totalTandon;
  //   const rottenMax = 0.02 * totalTandon;
  //   const rottenPercentage = generateRandomPercentage(rottenMin, rottenMax);

  //   const pestInfectionMin = 0.01 * totalTandon;
  //   const pestInfectionMax = 0.05 * totalTandon;
  //   const pestInfectionPercentage = generateRandomPercentage(
  //     pestInfectionMin,
  //     pestInfectionMax
  //   );

  //   const longStashMin = 0.05 * totalTandon;
  //   const longStashMax = 0.1 * totalTandon;
  //   const longStashPercentage = generateRandomPercentage(
  //     longStashMin,
  //     longStashMax
  //   );

  //   const notDetectedMin = 0;
  //   const notDetectedMax = 0.001 * totalTandon;
  //   const notDetectedPercentage = generateRandomPercentage(
  //     notDetectedMin,
  //     notDetectedMax
  //   );

  //   const detectedMoreThanOneMin = 0;
  //   const detectedMoreThanOneMax = 0.001 * totalTandon;
  //   const detectedMoreThanOnePercentage = generateRandomPercentage(
  //     detectedMoreThanOneMin,
  //     detectedMoreThanOneMax
  //   );

  //   // Ensure the total does not exceed totalTandon
  //   const totalPercentage =
  //     unripePercentage +
  //     halfRipePercentage +
  //     ripePercentage +
  //     overRipePercentage +
  //     rottenPercentage +
  //     pestInfectionPercentage +
  //     longStashPercentage +
  //     notDetectedPercentage +
  //     detectedMoreThanOnePercentage;

  //   const scale = totalTandon / totalPercentage;

  //   const gradingResults = {
  //     unripe: Math.round(unripePercentage * scale),
  //     half_ripe: Math.round(halfRipePercentage * scale),
  //     ripe: Math.round(ripePercentage * scale),
  //     over_ripe: Math.round(overRipePercentage * scale),
  //     rotten: Math.round(rottenPercentage * scale),
  //     pest_infection: Math.round(pestInfectionPercentage * scale),
  //     long_stash: Math.round(longStashPercentage * scale),
  //     not_detected: Math.round(notDetectedPercentage * scale),
  //     detected_more_than_one: Math.round(detectedMoreThanOnePercentage * scale),
  //   };

  //   const summary = {
  //     factory,
  //     vendor,
  //     waybill_number: waybillNumber,
  //     vehicle_number: vehicleNumber,
  //     start_date: startDate.format('YYYY-MM-DD'),
  //     finish_date: finishDate,
  //     total_in_kg: totalInKg,
  //     total_tandon: totalTandon,
  //     total_received: totalReceived,
  //     total_rejected: totalRejected,
  //     standard: standard,
  //     grading_results: gradingResults,
  //     notes: generateRandomNotes(),
  //   };

  //   return summary;
  // }

  // // Example usage
  // // const generatedSummary = generateRandomSummary();
  // // console.log(generatedSummary);

  // function generateArrayOfSummaries(dataPerDay = 5) {
  //   const summaries = [];
  //   const startDate = dayjs('2023-12-01');
  //   const endDate = dayjs('2024-01-10');

  //   let currentDate = startDate;
  //   let sequence = 1;

  //   while (currentDate.isBefore(endDate)) {
  //     for (let i = 0; i < dataPerDay; i++) {
  //       const summary = generateRandomSummary();
  //       summary.start_date = currentDate.format('YYYY-MM-DD');
  //       summary.finish_date = dayjs(currentDate)
  //         .add(3, 'day')
  //         .format('YYYY-MM-DD');
  //       summary.waybill_number = generateRandomWaybillNumber(sequence);
  //       sequence++;

  //       summaries.push(summary);
  //     }

  //     currentDate = currentDate.add(1, 'day');
  //   }

  //   return summaries;
  // }

  // // Example usage
  // const arrayOfSummaries = generateArrayOfSummaries(75);
  // // console.log(arrayOfSummaries);

  // await InspectionHistoryModel.deleteMany({});

  // await arrayOfSummaries.reduce((promise, data) => {
  //   return promise.then(async () => {
  //     const payload = {
  //       ...data,
  //       ...data.standard,
  //       ...data.grading_results,
  //     };

  //     delete payload['standard'];
  //     delete payload['grading_results'];

  //     await InspectionHistoryModel.create(payload);
  //     console.log(`Done Create Data: ${data.waybill_number}`);
  //   });
  // }, Promise.resolve());

  // await blastReportToUser();

  // const password = generateRandomPassword(6);

  await UserModel.findOneAndUpdate(
    { email: 'tes1@gmail.com' },
    {
      $set: {
        password: hashPassword('iqsyalganteng666'),
      },
    }
  );

  // console.log({ password });

  // const vendor3 = await InspectionDataModel.find({
  //   engine_type: '2',
  // }).lean();

  // console.log({ vendor3 });

  console.log('Done');
  process.exit(1);
});
