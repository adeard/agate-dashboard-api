const Joi = require('joi');

const schemas = {
  user: Joi.object({
    email: Joi.string().email().required(),
    full_name: Joi.string().required(),
    status: Joi.number().default(1).required(),
    access_factory: Joi.array().items(Joi.string()).required(),
  }),
  'change-password': Joi.object({
    old_password: Joi.string().required(),
    new_password: Joi.string().required(),
  }),
  'setup-password': Joi.object({
    new_password: Joi.string().required(),
    confirm_new_password: Joi.ref('new_password'),
  }),

  factory: Joi.object({
    name: Joi.string().required(),
  }),

  afdelink: Joi.object({
    name: Joi.string().required(),
    factory: Joi.string().required(),
  }),

  vendor: Joi.object({
    name: Joi.string().required(),
    factory: Joi.string().required(),
  }),

  settings: Joi.object({
    good: Joi.object({
      min: Joi.number().required(),
      max: Joi.number().required(),
    }),
    not_good: Joi.object({
      min: Joi.number().required(),
      max: Joi.number().required(),
    }),
    bad: Joi.object({
      min: Joi.number().required(),
      max: Joi.number().required(),
    }),
  }),
};

module.exports = {
  schemas,
};
