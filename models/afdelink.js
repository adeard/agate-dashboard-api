const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_AFDELINK';

const SCHEMA = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    factory: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_FACTORY',
    },
  },
  { timestamps: true }
);

const AfdelinkModel = model(NAME, SCHEMA);

module.exports = AfdelinkModel;
