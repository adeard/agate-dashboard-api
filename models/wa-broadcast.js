const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_WA_BROADCAST';

const SCHEMA = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_USER',
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    variable_qiscus: {
      type: Object,
      required: true,
    },
    template: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
    },
  },
  { timestamps: true }
);

const WABroadcastModel = model(NAME, SCHEMA);

module.exports = WABroadcastModel;
