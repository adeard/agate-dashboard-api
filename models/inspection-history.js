const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_INSPECTION_HISTORY';

const SCHEMA = new Schema(
  {
    factory: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_FACTORY',
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_VENDOR',
    },
    start_date: {
      type: Date,
      required: true,
    },
    finish_date: {
      type: Date,
      required: true,
    },
    waybill_number: {
      type: String,
      required: true,
    },
    vehicle_number: {
      type: String,
      required: true,
    },
    total_in_kg: {
      type: Number,
      required: true,
    },
    total_tandon: {
      type: Number,
      required: true,
    },
    total_received_tandon: {
      type: Number,
      required: true,
    },
    rejected: {
      type: Number,
      required: true,
    },
    passed: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      required: true,
    },

    ripe_accepted: {
      type: String,
      required: true,
    },
    semi_ripe_accepted: {
      type: String,
      required: true,
    },

    // Grading Status
    unripe: {
      type: Number,
    },
    half_ripe: {
      type: Number,
    },
    ripe: {
      type: Number,
    },
    over_ripe: {
      type: Number,
    },
    rotten: {
      type: Number,
    },
    pest_infection: {
      type: Number,
    },
    long_stash: {
      type: Number,
    },
    not_detected: {
      type: Number,
    },
    detected_more_than_one: {
      type: Number,
    },
  },
  { timestamps: true }
);

const InspectionHistoryModel = model(NAME, SCHEMA);

module.exports = InspectionHistoryModel;
