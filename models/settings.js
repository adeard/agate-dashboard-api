const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_SETTING';

const GRADESCHEMA = {
  min: {
    type: Number,
    required: true,
  },
  max: {
    type: Number,
    required: true,
  },
};

const SCHEMA = new Schema(
  {
    good: {
      type: GRADESCHEMA,
      required: true,
    },
    not_good: {
      type: GRADESCHEMA,
      required: true,
    },
    bad: {
      type: GRADESCHEMA,
      required: true,
    },
  },
  { timestamps: true }
);

const SettingsModel = model(NAME, SCHEMA);

module.exports = SettingsModel;
