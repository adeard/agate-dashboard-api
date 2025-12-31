const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_gMachineCheck';

const SCHEMA = new Schema(
  {
    machine_check_id: {
      type: String,
    },
    questions: {
      type: Schema.Types.Mixed, // Allows {1: true, 2: false, ...}
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['daily_before', 'daily_after', 'weekly', 'monthly'],
    },
    date: {
      type: String,
    },
    notes: {
      type: String,
      default: null,
    },
    factory: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_FACTORY',
    },
    machine: {
      type: String,
    },
  },
  { timestamps: true }
);

const MachineCheckModel = model(NAME, SCHEMA);

module.exports = MachineCheckModel;
