const dayjs = require('dayjs');
const InspectionDataModel = require('../../models/inspection-data');
const { createResponseSuccess } = require('../../utils/helpers');

function formatInspectionItemSummary(doc) {
  const gr = doc.grading_result || {};
  const header = gr.header || {};
  const timbangan = gr.timbangan || {};
  const janjang = gr.janjang || {};
  const formPerhitungan = gr.form_perhitungan || {};

  return {
    _id: doc._id,
    ticket_id: doc.ticket_number || gr.ticket_id || doc.id,
    spb_no: doc.delivery_number || gr.spb_no || null,
    status: gr.status || (doc.is_finished ? 'final' : 'in_progress'),
    grading_mode: gr.grading_mode || 'agate',
    model_ai_version: gr.model_ai_version || null,

    header: {
      kode_vendor: doc.vendor_code || header.kode_vendor || null,
      nama_vendor: doc.vendor_name || header.nama_vendor || null,
      mill_code: header.mill_code || null,
      kelompok_pemasok: header.kelompok_pemasok || null,
      kode_pemasok: header.kode_pemasok || null,
      no_plat: doc.vehicle_number || header.no_plat || null,
      product: header.product || 'Fruit Fresh Bunch',
      waktu_mulai_timbang: doc.date
        ? dayjs(doc.date).format('YYYY-MM-DD HH:mm:ss')
        : header.waktu_mulai_timbang || null,
      waktu_selesai_timbang: doc.finish_date
        ? dayjs(doc.finish_date).format('YYYY-MM-DD HH:mm:ss')
        : header.waktu_selesai_timbang || null,
      tanggal_generate_report: header.tanggal_generate_report || null,
    },

    timbangan: {
      bruto_sistem_kg: timbangan.bruto_sistem_kg ?? null,
      tare_estimasi_kg: timbangan.tare_estimasi_kg ?? doc.tarra ?? null,
      berat_brondolan_kg: timbangan.berat_brondolan_kg ?? null,
      netto_estimasi_kg: timbangan.netto_estimasi_kg ?? null,
      grade_truck: timbangan.grade_truck ?? null,
    },

    janjang: {
      diterima: janjang.diterima ?? gr.total_accepted ?? null,
      dikembalikan: janjang.dikembalikan ?? gr.total_rejected ?? null,
      dikembalikan_gross: janjang.dikembalikan_gross ?? null,
      bjr_kg: janjang.bjr_kg ?? null,
      bjr_flag: janjang.bjr_flag ?? null,
    },

    form_perhitungan: {
      potongan_final_pct: formPerhitungan.potongan_final_pct ?? null,
    },

    date: doc.date,
  };
}

function safeFloat(val, defaultVal = 0) {
  if (val === null || val === undefined || val === '') return defaultVal;
  const num = parseFloat(val);
  return isNaN(num) ? defaultVal : Math.round(num * 100) / 100;
}

function formatRedistribusiPotongan(doc) {
  const gr = doc.grading_result || {};
  const mInput = gr.manual_input || doc.manual_input || {};
  const storedCalc = mInput.calc || gr.calc || doc.calc || {};

  const vendorCalc = storedCalc.vendorCalc || {};
  const plasmaCalc = storedCalc.plasmaCalc || {};
  const panenCalc = storedCalc.panenCalc || {};

  let activeCalc = vendorCalc;
  if (storedCalc.isPlasmaCalc) {
    activeCalc = plasmaCalc;
  } else if (storedCalc.isNilaiPanen) {
    activeCalc = panenCalc;
  }

  const redistribusiObj = activeCalc.redistribusi || storedCalc.redistribusi || gr.redistribusi || {};
  const redistribusiCalcRows = redistribusiObj.rows || mInput.redistribusi_rows || gr.redistribusi_rows || [];

  const standardCriteria = [
    {
      code: 'A',
      name: 'Buah Mentah',
      aliases: ['A', 'MENTAH', 'BUAH MENTAH', 'BUAH MENTAH A'],
      flatKeys: { ai_pct: 'mentah_ai_pct', redis_pct: 'mentah_redis_pct', redis_kg: 'mentah_redis_kg' },
    },
    {
      code: 'O',
      name: 'Lewat Matang',
      aliases: ['O', 'LEWAT MATANG', 'LEWAT_MATANG', 'LEWAT MASAK', 'LEWAT MATANG O'],
      flatKeys: { ai_pct: 'lewatmasak_ai_pct', redis_pct: 'lewatmasak_redis_pct', redis_kg: 'lewatmasak_redis_kg' },
    },
    {
      code: 'E',
      name: 'Janjang Kosong',
      aliases: ['E', 'JANJANG KOSONG', 'JANJANG_KOSONG', 'TKOSONG', 'JANJANG KOSONG E'],
      flatKeys: { ai_pct: 'tkosong_ai_pct', redis_pct: 'tkosong_redis_pct', redis_kg: 'tkosong_redis_kg' },
    },
    {
      code: 'K',
      name: 'Buah Kecil',
      aliases: ['K', 'KECIL', 'BUAH KECIL', 'BUAH KECIL DIBAWAH 5KG', 'BUAH KECIL DIBAWAH 2KG'],
      flatKeys: { ai_pct: 'kecil_ai_pct', redis_pct: 'kecil_redis_pct', redis_kg: 'kecil_redis_kg' },
    },
    {
      code: 'XS',
      name: 'Buah Extra Kecil',
      aliases: ['XS', 'EXTRAKECIL', 'EXTRA_KECIL', 'EXTRA KECIL', 'BUAH EXTRA KECIL', 'BUAH KECIL DIBAWAH 3KG'],
      flatKeys: { ai_pct: 'extrakecil_ai_pct', redis_pct: 'extrakecil_redis_pct', redis_kg: 'extrakecil_redis_kg' },
    },
    {
      code: 'PEST',
      name: 'Dimakan Tikus',
      aliases: ['PEST', 'EATENBYRAT', 'DIMAKAN TIKUS', 'RUSAK DIMAKAN TIKUS'],
      flatKeys: { ai_pct: 'eatenbyrat_ai_pct', redis_pct: 'eatenbyrat_redis_pct', redis_kg: 'eatenbyrat_redis_kg' },
    },
    {
      code: 'TP',
      name: 'Tangkai Panjang',
      aliases: ['TP', 'TPANJANG', 'TANGKAI_PANJANG', 'TANGKAI PANJANG'],
      flatKeys: { ai_pct: 'tpanjang_ai_pct', redis_pct: 'tpanjang_redis_pct', redis_kg: 'tpanjang_redis_kg' },
    },
  ];

  const getKriteriaName = (code) => {
    const std = standardCriteria.find((c) => c.code === code);
    return std ? std.name : code;
  };

  const findStdByAlias = (str) => {
    if (!str) return null;
    const upper = String(str).trim().toUpperCase();
    return standardCriteria.find((c) => c.aliases.includes(upper)) || null;
  };

  const existingMap = new Map();

  if (Array.isArray(gr.redistribusi_potongan)) {
    for (const item of gr.redistribusi_potongan) {
      if (!item || typeof item !== 'object') continue;
      const rawKey = item.kode_kriteria || item.kriteria_code || item.code || item.name || item.kriteria || '';
      const std = findStdByAlias(rawKey);
      const code = std ? std.code : (item.kode_kriteria || item.kriteria_code || item.code || rawKey);
      const kriteriaName = item.kriteria || item.nama_kriteria || item.kriteria_name || item.name || (std ? std.name : code);

      if (code) {
        existingMap.set(code, {
          kode_kriteria: code,
          kriteria: kriteriaName,
          ai_pct: safeFloat(item.ai_pct ?? item.aiPct ?? 0),
          redistribusi_pct: safeFloat(item.redistribusi_pct ?? item.redisPct ?? 0),
          redistribusi_kg: safeFloat(item.redistribusi_kg ?? item.redisKg ?? 0),
        });
      }
    }
  }

  const findRedisRow = (std) => {
    if (!Array.isArray(redistribusiCalcRows)) return null;
    return redistribusiCalcRows.find((r) => {
      if (!r || typeof r !== 'object') return false;
      const keysToTest = [r.kriteria_code, r.code, r.kode_kriteria, r.name, r.kriteria, r.kriteria_name];
      return keysToTest.some((k) => k && std.aliases.includes(String(k).trim().toUpperCase()));
    });
  };

  const resultList = [];
  for (const std of standardCriteria) {
    if (existingMap.has(std.code)) {
      resultList.push(existingMap.get(std.code));
    } else {
      const row = findRedisRow(std);
      let ai_pct = 0;
      let redis_pct = 0;
      let redis_kg = 0;
      let kriteriaName = std.name;

      if (row) {
        ai_pct = safeFloat(row.aiPct ?? row.ai_pct ?? 0);
        redis_pct = safeFloat(row.redisPct ?? row.redistribusi_pct ?? 0);
        redis_kg = safeFloat(row.redisKg ?? row.redistribusi_kg ?? 0);
        if (row.kriteria || row.name || row.kriteria_name) {
          kriteriaName = row.kriteria || row.name || row.kriteria_name;
        }
      } else {
        const aiKey = std.flatKeys.ai_pct;
        const redisPctKey = std.flatKeys.redis_pct;
        const redisKgKey = std.flatKeys.redis_kg;

        ai_pct = safeFloat(gr[aiKey] ?? doc[aiKey] ?? mInput[aiKey] ?? 0);
        redis_pct = safeFloat(gr[redisPctKey] ?? doc[redisPctKey] ?? mInput[redisPctKey] ?? 0);
        redis_kg = safeFloat(gr[redisKgKey] ?? doc[redisKgKey] ?? mInput[redisKgKey] ?? 0);
      }

      resultList.push({
        kode_kriteria: std.code,
        kriteria: kriteriaName,
        ai_pct,
        redistribusi_pct: redis_pct,
        redistribusi_kg: redis_kg,
      });
    }
  }

  const addedCodes = new Set(resultList.map((item) => item.kode_kriteria));

  if (Array.isArray(gr.redistribusi_potongan)) {
    for (const [code, item] of existingMap.entries()) {
      if (!addedCodes.has(code)) {
        resultList.push(item);
        addedCodes.add(code);
      }
    }
  }

  if (Array.isArray(redistribusiCalcRows)) {
    for (const row of redistribusiCalcRows) {
      if (!row || typeof row !== 'object') continue;
      const rawKey = row.kriteria_code || row.code || row.kode_kriteria || row.name || row.kriteria || '';
      const std = findStdByAlias(rawKey);
      const code = std ? std.code : (row.kriteria_code || row.code || rawKey);
      if (code && !addedCodes.has(code)) {
        resultList.push({
          kode_kriteria: code,
          kriteria: row.kriteria || row.name || row.kriteria_name || (std ? std.name : code),
          ai_pct: safeFloat(row.aiPct ?? row.ai_pct ?? 0),
          redistribusi_pct: safeFloat(row.redisPct ?? row.redistribusi_pct ?? 0),
          redistribusi_kg: safeFloat(row.redisKg ?? row.redistribusi_kg ?? 0),
        });
        addedCodes.add(code);
      }
    }
  }

  return resultList;
}

function formatInspectionItemDetail(doc) {
  const summary = formatInspectionItemSummary(doc);
  const gr = doc.grading_result || {};

  return {
    ...summary,
    grading_ai: gr.grading_ai || [],
    buah_hitam_diterima: gr.buah_hitam_diterima ?? null,
    redistribusi_potongan: formatRedistribusiPotongan(doc),
    potongan_tambahan: gr.potongan_tambahan || {
      buah_busuk_pct: null,
      pasir_pct: null,
      air_pct: null,
      sampah_pct: null,
      partenokarpi_pct: null,
      restan_pct: null,
      abnormal_pct: null,
      dura_pct: null,
      pesifera_pct: null,
      lainnya_pct: null,
      total_potongan_tambahan_pct: null,
      total_potongan_ai_pct: null,
    },
    form_perhitungan: gr.form_perhitungan || {
      form_a_pct: null,
      form_b_pct: null,
      potongan_pct: null,
      adjusted_form_b_pct: null,
      potongan_final_pct: null,
    },
    remark: doc.notes || gr.remark || null,
    audit: gr.audit || {
      created_at: doc.createdAt
        ? dayjs(doc.createdAt).format('YYYY-MM-DDTHH:mm:ssZ')
        : null,
      created_by: doc.created_by || 'system',
      updated_at: doc.updatedAt
        ? dayjs(doc.updatedAt).format('YYYY-MM-DDTHH:mm:ssZ')
        : null,
      updated_by: 'system',
    },
  };
}

class FactoryInspectionController {
  static async getList(req, res, next) {
    try {
      const factory = req.factory;
      const {
        ticket_number = '',
        delivery_number = '', // SPB number
        date_from = '',
        date_to = '',
        page = 1,
        limit = 20,
      } = req.query;

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 20);
      const skip = (pageNum - 1) * limitNum;

      const query = {
        factory: factory._id,
      };

      if (ticket_number) {
        const regexPattern = new RegExp(ticket_number.trim(), 'i');
        query['$or'] = [
          { ticket_number: { $regex: regexPattern } },
          { 'grading_result.ticket_id': { $regex: regexPattern } },
          { id: { $regex: regexPattern } },
        ];
      }

      if (delivery_number) {
        const regexPattern = new RegExp(delivery_number.trim(), 'i');
        const spbFilter = [
          { delivery_number: { $regex: regexPattern } },
          { 'grading_result.spb_no': { $regex: regexPattern } },
        ];

        if (query['$or']) {
          query['$and'] = [
            { $or: query['$or'] },
            { $or: spbFilter },
          ];
          delete query['$or'];
        } else {
          query['$or'] = spbFilter;
        }
      }

      if (date_from && date_to) {
        query['date'] = {
          $gte: dayjs(date_from).startOf('day').toDate(),
          $lte: dayjs(date_to).endOf('day').toDate(),
        };
      } else if (date_from) {
        query['date'] = {
          $gte: dayjs(date_from).startOf('day').toDate(),
        };
      } else if (date_to) {
        query['date'] = {
          $lte: dayjs(date_to).endOf('day').toDate(),
        };
      }

      const totalData = await InspectionDataModel.countDocuments(query);
      const docs = await InspectionDataModel.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const formattedList = docs.map(formatInspectionItemSummary);
      const totalPages = Math.ceil(totalData / limitNum);

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Berhasil mendapatkan daftar data inspeksi factory',
          formattedList,
          {
            total_data: totalData,
            page: pageNum,
            limit: limitNum,
            total_pages: totalPages,
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getDetail(req, res, next) {
    try {
      const factory = req.factory;
      const { inspectionId } = req.params;
      const { ticket_number = '', delivery_number = '' } = req.query;

      const query = {
        factory: factory._id,
      };

      if (inspectionId && inspectionId !== 'by-filter') {
        // If inspectionId is a valid Mongo ObjectId or string ID
        query['$or'] = [
          { _id: inspectionId.match(/^[0-9a-fA-F]{24}$/) ? inspectionId : null },
          { id: inspectionId },
          { ticket_number: inspectionId },
          { 'grading_result.ticket_id': inspectionId },
        ].filter((cond) => Object.values(cond)[0] !== null);
      }

      if (ticket_number) {
        const regexPattern = new RegExp(ticket_number.trim(), 'i');
        query['ticket_number'] = { $regex: regexPattern };
      }

      if (delivery_number) {
        const regexPattern = new RegExp(delivery_number.trim(), 'i');
        query['delivery_number'] = { $regex: regexPattern };
      }

      const doc = await InspectionDataModel.findOne(query)
        .populate('vendor', 'bjr')
        .lean();

      if (!doc) {
        throw {
          code: 404,
          message: 'Data inspeksi tidak ditemukan',
          title: 'Not Found',
        };
      }

      const formattedDetail = formatInspectionItemDetail(doc);

      return res.status(200).json(
        createResponseSuccess(
          200,
          'Success',
          'Berhasil mendapatkan detail data inspeksi factory',
          formattedDetail
        )
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FactoryInspectionController;
