const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_VENDOR_V2';

const SCHEMA = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: Number,
      required: true,
      enum: [1, 2], // 1 = inti, 2 = plasma
    },
    factory: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_FACTORY',
    },
    vendor_id: {
      type: String,
    },
  },
  { timestamps: true }
);

const VendorV2Model = model(NAME, SCHEMA);

module.exports = VendorV2Model;
