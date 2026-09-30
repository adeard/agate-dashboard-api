const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_FACTORY';

const SCHEMA = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_COMPANY',
      required: true,
    },
    location: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const FactoryModel = model(NAME, SCHEMA);

module.exports = FactoryModel;
