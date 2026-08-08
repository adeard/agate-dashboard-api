const Joi = require("joi");

const schemas = {
  user: Joi.object({
    email: Joi.string().email().required(),
    full_name: Joi.string().required(),
    status: Joi.number().default(1).required(),
    access_factory: Joi.array().items(Joi.string()).required(),
    whatsapp_number: Joi.string().optional().allow("").allow(null),
    subscribe_notification: Joi.number().valid(1, 2).optional().allow(null),
    company: Joi.string(),
  }),
  "change-password": Joi.object({
    old_password: Joi.string().required(),
    new_password: Joi.string().required(),
  }),
  "setup-password": Joi.object({
    new_password: Joi.string().required(),
    confirm_new_password: Joi.ref("new_password"),
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
        .try(Joi.number(), Joi.string().valid("all"))
        .optional(),
      over_ripe_accepted: Joi.alternatives()
        .try(Joi.number(), Joi.string().valid("all"))
        .optional(),
      ripe_accepted: Joi.alternatives()
        .try(Joi.number(), Joi.string().valid("all"))
        .optional(),
      semi_ripe_accepted: Joi.alternatives()
        .try(Joi.number(), Joi.string().valid("all"))
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
    notes: Joi.string().allow("").optional(),
  }),

  "inspection-data": Joi.object({
    vendor_id: Joi.string().allow(null, "").optional(), // Optional field,
    vendor_name: Joi.string().allow(null, "").optional(),
    main_classification_accepted: Joi.array()
      .items(
        Joi.string().valid(
          "MENTAH",
          "KURANG MATANG",
          "LEWAT MATANG",
          "MATANG",
          "JANJANG KOSONG",
        ),
      )
      .optional()
      .default([]),
    sub_classification_accepted: Joi.array()
      .items(
        Joi.string().valid(
          "TANGKAI PANJANG",
          "TANGKAI PANJANG EKSTRIM",
          "TANGKAI PANJANG MAX",
          "RUSAK DIMAKAN TIKUS",
          "RUSAK DIMAKAN TIKUS EKSTRIM",
          "RUSAK DIMAKAN TIKUS MAX",
          "BUAH KECIL DIBAWAH 2KG",
          "BUAH KECIL DIBAWAH 3KG",
          "BUAH KECIL DIBAWAH 5KG",
        ),
      )
      .optional()
      .default([]),
    classification_rejected: Joi.array().items(Joi.string()).optional().default([]),
    unripe_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    half_ripe_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    over_ripe_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    pest_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    pest_e_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    pest_m_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    long_stash_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    long_stash_m_fined_in_kg: Joi.number().allow(null).optional(),
    long_stash_e_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    small_fruit_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    small_fruit_5_fined_in_kg: Joi.number().allow(null).optional(), // Optional field
    delivery_number: Joi.string().allow(null, "").optional(), // Optional field
    vehicle_number: Joi.string().allow(null, "").optional(), // Optional field
    driver_name: Joi.string().allow(null, "").optional(),
    vendor_code: Joi.string().allow(null, "").optional(),
    verification_code: Joi.number().allow(null).optional(), // Optional field
    is_active: Joi.boolean().allow(null).optional(), // Optional field
    is_started: Joi.boolean().allow(null).optional(), // Optional field
    is_finished: Joi.boolean().allow(null).optional(), // Optional field
    is_confirmed: Joi.boolean().allow(null).optional(), // Optional field
    vendor_type: Joi.alternatives()
      .try(Joi.string(), Joi.number())
      .optional()
      .default("3"), // Enum with numeric/string values
    inspection_code: Joi.string().allow(null, "").optional(), // Optional field
    date: Joi.date().allow(null).optional(), // Optional field
    finish_date: Joi.date().allow(null).optional(), // Optional field,
    id: Joi.string().required(),
    grading_result: Joi.object().allow(null).optional(),
    year: Joi.number().optional(),
    factory: Joi.string().optional(),
    engine_type: Joi.string().allow(null, "").optional(),
    machine: Joi.any().allow(null).optional(),
    notes: Joi.string().allow(null, "").optional(),
    images: Joi.string().allow(null, "").optional(),
    company: Joi.string().optional(),
    manual_parameter: Joi.any().optional(), // Optional field
    total_multiple: Joi.number().optional(), // Optional field,
    ticket_number: Joi.any().optional(), // Optional field
    is_integrated_wb: Joi.boolean().allow(null).default(false), // Optional field
    is_integrated: Joi.boolean().allow(null).default(true), // Optional field
    demo_mode: Joi.boolean().allow(null).default(false), // Optional field
    level: Joi.number().allow(null).optional(),
    grading_parameter: Joi.array().items(Joi.any()).allow(null).optional(),
    wbin: Joi.number().allow(null).optional(),
    created_by: Joi.string().allow(null, "").optional(),
  }).unknown(true),

  "vendor-2": Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    type: Joi.number().required(),
    factory: Joi.string().required(),
    bjr: Joi.number().allow(null).optional(),
  }),

  "machine-check": Joi.object({
    machine_check_id: Joi.string().required(),
    questions: Joi.object().required(),
    type: Joi.string().required(),
    date: Joi.string().required(),
    notes: Joi.string().allow("").optional(),
    factory: Joi.string().required(),
    machine: Joi.string().required(),
    group: Joi.string().allow(null).optional(),
  }),

  "machine-logs-file": Joi.object({
    date: Joi.string().required(),
    filename: Joi.string().required(),
    filepath: Joi.string().required(),
    factory: Joi.string().optional(),
    machine: Joi.string().required(),
  }),

  "machine-logs-data": Joi.object({
    date: Joi.string().required(),
    status: Joi.string().required(),
    subject: Joi.string().required(),
    notes: Joi.string().allow("").optional(),
    code: Joi.string().required(),
    message: Joi.string().required(),
    filename: Joi.string().required(),
    factory: Joi.string().optional(),
    machine: Joi.string().required(),
  }),
};

module.exports = {
  schemas,
};
