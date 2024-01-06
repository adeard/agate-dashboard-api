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

  inspection: Joi.object({
    summary: Joi.object({
      factory: Joi.string().required(),
      vendor: Joi.string().required(),
      waybill_number: Joi.string().required(),
      vehicle_number: Joi.string().required(),
      start_date: Joi.string().required(),
      finish_date: Joi.string().required(),
      total_in_kg: Joi.number().required(),
      total_tandon: Joi.number().required(),
      total_received: Joi.number().required(),
      total_rejected: Joi.number().required(),
    }).required(),
    standard: Joi.object({
      ripe_accepted: Joi.alternatives()
        .try(Joi.number(), Joi.string().valid('all'))
        .required(),
      semi_ripe_accepted: Joi.alternatives()
        .try(Joi.number(), Joi.string().valid('all'))
        .required(),
    }).required(),
    grading_results: Joi.object({
      unripe: Joi.number(),
      half_ripe: Joi.number(),
      ripe: Joi.number(),
      over_ripe: Joi.number(),
      rotten: Joi.number(),
      pest_infection: Joi.number(),
      long_stash: Joi.number(),
      not_detected: Joi.number(),
      detected_more_than_one: Joi.number(),
    }).required(),
    notes: Joi.string().optional(),
  }),
};

module.exports = {
  schemas,
};
