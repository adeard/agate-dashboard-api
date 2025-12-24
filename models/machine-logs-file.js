const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_gMachineLogsFile';

const SCHEMA = new Schema(
  {
    date: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    filepath: {
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

const MachineLogsFileModel = model(NAME, SCHEMA);

module.exports = MachineLogsFileModel;
