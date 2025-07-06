const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_COMPANY';

const SCHEMA = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    initial: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const CompanyModel = model(NAME, SCHEMA);

module.exports = CompanyModel;
