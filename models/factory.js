const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_FACTORY';

const SCHEMA = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const FactoryModel = model(NAME, SCHEMA);

module.exports = FactoryModel;
