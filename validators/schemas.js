const Joi = require('joi');

const schemas = {
  user: Joi.object({
    email: Joi.string().email().required(),
    full_name: Joi.string().required(),
    status: Joi.number().default(1).required(),
    access_factory: Joi.array().items(Joi.string()).required(),
    whatsapp_number: Joi.string().optional().allow('').allow(null),
    subscribe_notification: Joi.number().valid(1, 2).optional().allow(null),
    company: Joi.string(),
  }),
  'change-password': Joi.object({
    old_password: Joi.string().required(),
    new_password: Joi.string().required(),
  }),
  'setup-password': Joi.object({
    new_password: Joi.string().required(),
    confirm_new_password: Joi.ref('new_password'),
  }),
  company: Joi.object({
    name: Joi.string().required(),
    initial: Joi.string(),
  }),

  factory: Joi.object({
    name: Joi.string().required(),
    company: Joi.string(),
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
      unripe_accepted: Joi.alternatives()
        .try(Joi.number(), Joi.string().valid('all'))
        .optional(),
      over_ripe_accepted: Joi.alternatives()
        .try(Joi.number(), Joi.string().valid('all'))
        .optional(),
      ripe_accepted: Joi.alternatives()
        .try(Joi.number(), Joi.string().valid('all'))
        .optional(),
      semi_ripe_accepted: Joi.alternatives()
        .try(Joi.number(), Joi.string().valid('all'))
        .optional(),
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
    notes: Joi.string().allow('').allow(null).optional(),
  }),

  'inspection-data': Joi.object({
    vendor_id: Joi.string().allow(null), // Optional field,
    vendor_name: Joi.string().allow(null),
    main_classification_accepted: Joi.array()
      .items(
        Joi.string().valid(
          'MENTAH',
          'KURANG MATANG',
          'LEWAT MATANG',
          'MATANG',
          'JANJANG KOSONG'
        )
      )
      .required(),
    sub_classification_accepted: Joi.array()
      .items(
        Joi.string().valid(
          'TANGKAI PANJANG',
          'RUSAK DIMAKAN TIKUS',
          'BUAH KECIL DIBAWAH 3KG',
          'BUAH KECIL DIBAWAH 5KG'
        )
      )
      .required(),
    classification_rejected: Joi.array().items(Joi.string()).required(),
    unripe_fined_in_kg: Joi.number().integer().allow(null), // Optional field
    half_ripe_fined_in_kg: Joi.number().integer().allow(null), // Optional field
    long_stash_fined_in_kg: Joi.number().integer().allow(null), // Optional field
    small_fruit_fined_in_kg: Joi.number().integer().allow(null), // Optional field
    small_fruit_5_fined_in_kg: Joi.number().integer().allow(null), // Optional field
    delivery_number: Joi.string().allow(null), // Optional field
    vehicle_number: Joi.string().allow(null), // Optional field
    verification_code: Joi.number().integer().allow(null), // Optional field
    is_active: Joi.boolean().allow(null), // Optional field
    is_started: Joi.boolean().allow(null), // Optional field
    is_finished: Joi.boolean().allow(null), // Optional field
    is_confirmed: Joi.boolean().allow(null), // Optional field
    vendor_type: Joi.string().valid('1', '2').required(), // Enum with numeric values
    inspection_code: Joi.string().allow(null), // Optional field
    date: Joi.date().allow(null), // Optional field
    finish_date: Joi.date().allow(null), // Optional field,
    id: Joi.string().required(),
    grading_result: Joi.object().allow(null),
    year: Joi.number().required(),
    factory: Joi.string(),
    engine_type: Joi.string().allow(null),
    machine: Joi.number().allow(null).optional(),
    notes: Joi.string().allow(null).optional(),
    images: Joi.string().allow(null).optional(),
    company: Joi.string(),
    manual_parameter: Joi.any().optional(), // Optional field
    total_multiple: Joi.number().optional(), // Optional field,
    ticket_number: Joi.any().optional(), // Optional field
    is_integrated_wb: Joi.boolean().default(false), // Optional field
    demo_mode: Joi.boolean().default(false), // Optional field
  }),

  'vendor-2': Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    type: Joi.number().required(),
    factory: Joi.string().required(),
  }),
};

module.exports = {
  schemas,
};
