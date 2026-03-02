require('dotenv').config();

const { blastReportToUser } = require('../lib/cron/blast-report');
const connectToDatabase = require('../lib/db-connect');
const CompanyModel = require('../models/company');

connectToDatabase().then(async (res) => {
  console.log(res);

  const companies = (await CompanyModel.find({}).lean()).filter(
    (e) => e.initial !== 'DMO',
  );

  await companies.reduce(async (acc, comp) => {
    await acc;
    console.log('BLAST REPORT TO USER IS RUNNING');
    await blastReportToUser(comp._id);
  }, Promise.resolve());

  console.log('Done');
});
