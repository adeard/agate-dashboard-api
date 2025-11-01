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
    image_name: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const CompanyModel = model(NAME, SCHEMA);

module.exports = CompanyModel;
