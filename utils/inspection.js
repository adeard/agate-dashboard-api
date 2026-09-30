const CompanyModel = require('../models/company');

async function getCompanyLimitTandan(user) {
  if (user && user.company) {
    const company = await CompanyModel.findById(user.company).lean();
    if (company && company.limit_tandan) {
      return company.limit_tandan;
    }
    return 30;
  }
  return 200; // Default value if limit_tandan is not set
}

module.exports = {
  getCompanyLimitTandan,
};
