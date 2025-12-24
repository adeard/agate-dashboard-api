const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_gMachineLogsData';

const SCHEMA = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    factory: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_FACTORY',
      required: true,
    },
    machine: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const MachineLogsDataModel = model(NAME, SCHEMA);

module.exports = MachineLogsDataModel;
