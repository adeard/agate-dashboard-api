const { Schema, model } = require('mongoose');

const NAME = 'GradingHQ_USER';

const FACTORYSCHEMA = {
  type: Schema.Types.ObjectId,
  ref: 'GradingHQ_FACTORY',
};

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
      type: [FACTORYSCHEMA],
      required: true,
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
