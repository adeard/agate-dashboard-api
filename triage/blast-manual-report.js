require('dotenv').config();

const { blastReportToUser } = require('../lib/cron/blast-report');
const connectToDatabase = require('../lib/db-connect');
const CompanyModel = require('../models/company');

connectToDatabase().then(async (res) => {
  console.log(res);

  const companies = (await CompanyModel.find({}).lean()).filter(
    (e) => e.initial !== 'DMO'
  );

  companies.forEach(async (comp) => {
    await blastReportToUser(comp._id);
  });

  console.log('Done');
});
