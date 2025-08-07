const CompanyModel = require('../models/company');

async function getCompanyLimitTandan(user) {
  if (user && user.company) {
    const company = await CompanyModel.findById(user.company).lean();
    if (company && company.name === 'Kencana') {
      return 10;
    } else {
      return 200;
    }
  }
  return 200; // Default value if limit_tandan is not set
}

module.exports = {
  getCompanyLimitTandan,
};
