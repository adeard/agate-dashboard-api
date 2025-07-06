const { Schema, model } = require('mongoose');
const {
  MainClassificationEnum,
  SubClassificationEnum,
} = require('../lib/enum');

const NAME = 'GradingHQ_INSPECTION_DATA';

const SCHEMA = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    vendor_id: {
      type: String,
      required: false,
    },
    vendor_name: {
      type: String,
      required: false,
    },
    main_classification_accepted: {
      type: [String],
      enum: MainClassificationEnum,
      required: true,
    },
    sub_classification_accepted: {
      type: [String],
      enum: SubClassificationEnum,
      required: true,
    },
    classification_rejected: {
      type: [String],
      required: true,
    },
    unripe_fined_in_kg: {
      type: Number,
      required: false,
      default: null,
    },
    half_ripe_fined_in_kg: {
      type: Number,
      required: false,
      default: null,
    },
    long_stash_fined_in_kg: {
      type: Number,
      required: false,
      default: null,
    },
    small_fruit_fined_in_kg: {
      type: Number,
      required: false,
      default: null,
    },
    small_fruit_5_fined_in_kg: {
      type: Number,
      required: false,
      default: null,
    },
    delivery_number: {
      type: String,
      required: false,
      default: null,
    },
    vehicle_number: {
      type: String,
      required: false,
      default: null,
    },
    verification_code: {
      type: Number,
      required: false,
      default: null,
    },
    is_active: {
      type: Boolean,
      required: false,
      default: null,
    },
    is_started: {
      type: Boolean,
      required: false,
      default: null,
    },
    is_finished: {
      type: Boolean,
      required: false,
      default: null,
    },
    is_confirmed: {
      type: Boolean,
      required: false,
      default: null,
    },
    vendor_type: {
      type: String,
      enum: ['1', '2'],
      required: true,
    },
    inspection_code: {
      type: String,
      required: false,
      default: null,
    },
    date: {
      type: Date,
      required: false,
      default: null,
    },
    finish_date: {
      type: Date,
      required: false,
      default: null,
    },
    grading_result: {
      type: Object,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    factory: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_FACTORY',
      required: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_VENDOR',
      // type: String,
      required: true,
    },
    engine_type: {
      type: String,
    },
    machine: {
      type: Number,
    },
    notes: {
      type: String,
    },
    images: {
      type: String,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_COMPANY',
      required: true,
    },
  },
  { timestamps: true }
);

const InspectionDataModel = model(NAME, SCHEMA);

module.exports = InspectionDataModel;
