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
    whatsapp_number: {
      type: String,
    },
    subscribe_notification: {
      type: Number,
      enum: [0, 1],
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'GradingHQ_COMPANY',
      required: true,
    },
    role: {
      type: Number,
      enum: [1, 2, 3], // 1 = User , 2 = Admin, 3 = Super Admin
    },
  },
  { timestamps: true }
);

const UserModel = model(NAME, SCHEMA);

module.exports = UserModel;
