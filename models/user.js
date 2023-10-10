const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_USER';

const SCHEMA = new Schema(
  {
    full_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    access_factory: {
      type: Number,
      required: true,
      enum: [0, 1],
      default: 0,
    },
    status: {
      type: Number,
      required: true,
      enum: [0, 1],
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const UserModel = model(NAME, SCHEMA);

module.exports = UserModel;
