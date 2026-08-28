const dayjs = require('dayjs');
const InspectionDataModel = require('../../models/inspection-data');
const { createResponseSuccess } = require('../../utils/helpers');

function formatInspectionItemSummary(doc) {
  const gr = { ...doc, ...(doc.grading_result || {}) };
  const header = gr.header || {};
  const timbangan = gr.timbangan || {};
  const janjang = gr.janjang || {};
  const formPerhitungan = gr.form_perhitungan || {};
  const mInput = gr.manual_input || doc.manual_input || {};
  const storedCalc = mInput.calc || gr.calc || doc.calc || {};
  const vendorCalc = storedCalc.vendorCalc || {};

  return {
    _id: doc._id,
    ticket_id: doc.ticket_number || gr.ticket_id || doc.id,
    spb_no: doc.delivery_number || gr.spb_no || null,
    status: gr.status || (doc.is_finished ? 'final' : 'in_progress'),
    grading_mode: gr.grading_mode || 'agate',
    model_ai_version: gr.model_ai_version || null,

    header: {
      kode_vendor: doc.vendor_code || header.kode_vendor || gr.vendor_code || null,
      nama_vendor: doc.vendor_name || header.nama_vendor || gr.vendor_name || null,
      mill_code: header.mill_code || gr.mill_code || null,
      kelompok_pemasok: header.kelompok_pemasok || storedCalc.kelompokName || null,
      kode_pemasok: header.kode_pemasok || storedCalc.kelompok || null,
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
      bruto_sistem_kg: timbangan.bruto_sistem_kg ?? mInput.bruto ?? doc.wbin ?? null,
      tare_estimasi_kg: timbangan.tare_estimasi_kg ?? mInput.tare ?? doc.tarra ?? null,
      berat_brondolan_kg: timbangan.berat_brondolan_kg ?? mInput.brondolan_weight ?? null,
      netto_estimasi_kg: timbangan.netto_estimasi_kg ?? storedCalc.NETTO ?? null,
      grade_truck: timbangan.grade_truck ?? (storedCalc.gradeTruck || {}).code ?? null,
    },

    janjang: {
      diterima: janjang.diterima ?? gr.total_accepted ?? doc.total_accepted ?? null,
      dikembalikan: janjang.dikembalikan ?? storedCalc.totalDikembalikan ?? gr.total_rejected ?? doc.total_rejected ?? null,
      dikembalikan_gross: janjang.dikembalikan_gross ?? storedCalc.totalDikembalikanGross ?? null,
      bjr_kg: janjang.bjr_kg ?? (storedCalc.BJR ? safeFloat(storedCalc.BJR) : null),
      bjr_flag: janjang.bjr_flag ?? (storedCalc.grade || {}).code ?? null,
    },

    form_perhitungan: {
      potongan_final_pct: formPerhitungan.potongan_final_pct ?? vendorCalc.potonganFinal ?? mInput.potonganFinalManual ?? null,
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
  const gr = { ...doc, ...(doc.grading_result || {}) };
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

function formatGradingAi(doc) {
  const gr = { ...doc, ...(doc.grading_result || {}) };

  if (Array.isArray(gr.grading_ai) && gr.grading_ai.length > 0) {
    return gr.grading_ai.map((item) => ({
      kode_kriteria: item.kode_kriteria || item.kriteria_code || item.code || '',
      nama_kriteria: item.nama_kriteria || item.kriteria || item.name || '',
      jumlah_janjang: Number(item.jumlah_janjang ?? item.count ?? 0),
      tindakan: item.tindakan || 'Terima',
      jjg_diterima: Number(item.jjg_diterima ?? 0),
      jjg_ditolak: Number(item.jjg_ditolak ?? 0),
      kg_denda: item.kg_denda !== null && item.kg_denda !== undefined ? safeFloat(item.kg_denda) : null,
      parent: item.parent ?? null,
    }));
  }

  const classSummary = gr.classification_summary || {};
  const acceptedSummary = gr.accepted_summary || {};
  const rejectedSummary = gr.rejected_summary || {};
  const finedSummary = gr.fined_summary || {};
  const rejectedList = Array.isArray(gr.classification_rejected)
    ? gr.classification_rejected.map((s) => String(s).toUpperCase())
    : ['MENTAH', 'JANJANG KOSONG'];

  const mInput = gr.manual_input || doc.manual_input || {};
  const storedCalc = mInput.calc || gr.calc || doc.calc || {};
  const buahHitamVal = Number(gr.buah_hitam_diterima ?? mInput.buahHitamDiterima ?? 0);

  const getCorrectedSummary = () => {
    const mainClasses = ['MENTAH', 'LEWAT MATANG', 'JANJANG KOSONG', 'MATANG'];
    const res = {};

    for (const cat of mainClasses) {
      const classObj = classSummary[cat] || acceptedSummary[cat] || rejectedSummary[cat] || {};
      const normalTotal = Number(classObj['NORMAL'] ?? 0);
      const pestTotal = Number(classObj['RUSAK DIMAKAN TIKUS'] ?? classObj['DIMAKAN TIKUS'] ?? classObj['PEST'] ?? 0);
      const overlap = Math.min(normalTotal, pestTotal);

      res[cat] = {
        NORMAL: Math.max(0, normalTotal - overlap),
        'RUSAK DIMAKAN TIKUS': overlap > 0 ? overlap : pestTotal,
        'TANGKAI PANJANG': Number(classObj['TANGKAI PANJANG'] ?? classObj['TP'] ?? 0),
        'BUAH KECIL DIBAWAH 5KG': Number(classObj['BUAH KECIL DIBAWAH 5KG'] ?? classObj['BUAH KECIL'] ?? classObj['K'] ?? 0),
        'BUAH KECIL DIBAWAH 3KG': Number(classObj['BUAH KECIL DIBAWAH 3KG'] ?? classObj['EXTRA KECIL'] ?? classObj['XS'] ?? 0),
      };
    }

    if (buahHitamVal > 0 && res['MENTAH']) {
      const mentahNormal = res['MENTAH'].NORMAL || 0;
      const shift = Math.min(buahHitamVal, mentahNormal);
      res['MENTAH'].NORMAL = Math.max(0, mentahNormal - shift);
      if (res['MATANG']) {
        res['MATANG'].NORMAL = (res['MATANG'].NORMAL || 0) + shift;
      }
    }

    return res;
  };

  const correctedMap = getCorrectedSummary();

  const getMainClassTotal = (mainKey) => {
    if (classSummary[mainKey] && classSummary[mainKey].TOTAL !== undefined) {
      return Number(classSummary[mainKey].TOTAL);
    }
    if (acceptedSummary[mainKey] && acceptedSummary[mainKey].TOTAL !== undefined) {
      return Number(acceptedSummary[mainKey].TOTAL);
    }
    if (rejectedSummary[mainKey] && rejectedSummary[mainKey].TOTAL !== undefined) {
      return Number(rejectedSummary[mainKey].TOTAL);
    }
    return 0;
  };

  const getSubclassCount = (mainKey, subclassAliases) => {
    const classObj = correctedMap[mainKey] || classSummary[mainKey] || acceptedSummary[mainKey] || rejectedSummary[mainKey] || {};
    for (const alias of subclassAliases) {
      if (classObj[alias] !== undefined) {
        return Number(classObj[alias]);
      }
    }
    return 0;
  };

  const getSubclassKgDenda = (subclassAliases, docFallbackKey) => {
    for (const alias of subclassAliases) {
      if (finedSummary[alias]) {
        const val = finedSummary[alias].DENDA ?? finedSummary[alias].TOTAL;
        if (val !== undefined && val !== null) return safeFloat(val);
      }
    }
    if (docFallbackKey && doc[docFallbackKey] !== undefined && doc[docFallbackKey] !== null) {
      return safeFloat(doc[docFallbackKey]);
    }
    if (docFallbackKey && gr[docFallbackKey] !== undefined && gr[docFallbackKey] !== null) {
      return safeFloat(gr[docFallbackKey]);
    }
    return 0.0;
  };

  const getMatangKgDenda = () => {
    if (gr.total_fined !== undefined && gr.total_fined !== null && Number(gr.total_fined) > 0) {
      return safeFloat(gr.total_fined);
    }
    if (storedCalc.kgDendaTabel !== undefined && storedCalc.kgDendaTabel !== null) {
      return safeFloat(storedCalc.kgDendaTabel);
    }
    let totalDenda = 0;
    for (const k of Object.keys(finedSummary)) {
      const val = finedSummary[k].DENDA ?? finedSummary[k].TOTAL ?? 0;
      totalDenda += safeFloat(val);
    }
    return safeFloat(totalDenda);
  };

  const gradingAiResult = [];

  // Main classes (parent: null)
  const mentahTotal = getMainClassTotal('MENTAH');
  const mentahRejected = rejectedList.includes('MENTAH') || true;
  gradingAiResult.push({
    kode_kriteria: 'A',
    nama_kriteria: 'Buah Mentah',
    jumlah_janjang: mentahTotal,
    tindakan: mentahRejected ? 'Tolak' : 'Terima',
    jjg_diterima: mentahRejected ? 0 : mentahTotal,
    jjg_ditolak: mentahRejected ? mentahTotal : 0,
    kg_denda: mentahRejected ? null : 0.0,
    parent: null,
  });

  const lewatTotal = getMainClassTotal('LEWAT MATANG');
  const lewatRejected = rejectedList.includes('LEWAT MATANG');
  gradingAiResult.push({
    kode_kriteria: 'O',
    nama_kriteria: 'Lewat Matang',
    jumlah_janjang: lewatTotal,
    tindakan: lewatRejected ? 'Tolak' : 'Terima',
    jjg_diterima: lewatRejected ? 0 : lewatTotal,
    jjg_ditolak: lewatRejected ? lewatTotal : 0,
    kg_denda: lewatRejected ? null : 0.0,
    parent: null,
  });

  const tkosongTotal = getMainClassTotal('JANJANG KOSONG');
  const tkosongRejected = rejectedList.includes('JANJANG KOSONG') || true;
  gradingAiResult.push({
    kode_kriteria: 'E',
    nama_kriteria: 'Janjang Kosong',
    jumlah_janjang: tkosongTotal,
    tindakan: tkosongRejected ? 'Tolak' : 'Terima',
    jjg_diterima: tkosongRejected ? 0 : tkosongTotal,
    jjg_ditolak: tkosongRejected ? tkosongTotal : 0,
    kg_denda: tkosongRejected ? null : 0.0,
    parent: null,
  });

  const matangTotal = getMainClassTotal('MATANG');
  const matangRejected = rejectedList.includes('MATANG');
  gradingAiResult.push({
    kode_kriteria: 'N',
    nama_kriteria: 'Buah Matang',
    jumlah_janjang: matangTotal,
    tindakan: matangRejected ? 'Tolak' : 'Terima',
    jjg_diterima: matangRejected ? 0 : matangTotal,
    jjg_ditolak: matangRejected ? matangTotal : 0,
    kg_denda: matangRejected ? null : getMatangKgDenda(),
    parent: null,
  });

  // Subclasses with parents (N, A, O, E)
  const parentConfigs = [
    { parentCode: 'N', mainKey: 'MATANG', defaultTindakan: 'Terima', isRejected: matangRejected },
    { parentCode: 'A', mainKey: 'MENTAH', defaultTindakan: 'Tolak', isRejected: true },
    { parentCode: 'O', mainKey: 'LEWAT MATANG', defaultTindakan: 'Terima', isRejected: lewatRejected },
    { parentCode: 'E', mainKey: 'JANJANG KOSONG', defaultTindakan: 'Tolak', isRejected: true },
  ];

  const subclassDefinitions = [
    {
      code: 'K',
      name: 'Buah Kecil',
      aliases: ['BUAH KECIL DIBAWAH 5KG', 'BUAH KECIL DIBAWAH 2KG', 'BUAH KECIL', 'KECIL'],
      docFallbackKey: 'small_fruit_fined_in_kg',
    },
    {
      code: 'XS',
      name: 'Buah Extra Kecil',
      aliases: ['BUAH KECIL DIBAWAH 3KG', 'EXTRA KECIL', 'EXTRA_KECIL', 'EXTRAKECIL', 'BUAH EXTRA KECIL'],
      docFallbackKey: 'small_fruit_3_fined_in_kg',
    },
    {
      code: 'PEST',
      name: 'Dimakan Tikus',
      aliases: ['RUSAK DIMAKAN TIKUS', 'DIMAKAN TIKUS', 'EATENBYRAT', 'PEST'],
      docFallbackKey: 'pest_fined_in_kg',
    },
    {
      code: 'TP',
      name: 'Tangkai Panjang',
      aliases: ['TANGKAI PANJANG', 'TANGKAI_PANJANG', 'TPANJANG', 'TP'],
      docFallbackKey: 'long_stash_fined_in_kg',
    },
  ];

  for (const subDef of subclassDefinitions) {
    for (const pConf of parentConfigs) {
      const count = getSubclassCount(pConf.mainKey, subDef.aliases);
      const isParentRejected = pConf.isRejected;
      const tindakan = isParentRejected ? 'Tolak' : 'Terima';
      const jjg_diterima = isParentRejected ? 0 : count;
      const jjg_ditolak = isParentRejected ? count : 0;
      let kg_denda = null;

      if (!isParentRejected) {
        kg_denda = getSubclassKgDenda(subDef.aliases, subDef.docFallbackKey);
      }

      gradingAiResult.push({
        kode_kriteria: subDef.code,
        nama_kriteria: subDef.name,
        jumlah_janjang: count,
        tindakan,
        jjg_diterima,
        jjg_ditolak,
        kg_denda,
        parent: pConf.parentCode,
      });
    }
  }

  return gradingAiResult;
}

function formatPotonganTambahan(doc) {
  const gr = doc.grading_result || {};
  if (gr.potongan_tambahan && typeof gr.potongan_tambahan === 'object') {
    const pt = gr.potongan_tambahan;
    return {
      buah_busuk_pct: pt.buah_busuk_pct !== undefined && pt.buah_busuk_pct !== null ? safeFloat(pt.buah_busuk_pct) : null,
      pasir_pct: pt.pasir_pct !== undefined && pt.pasir_pct !== null ? safeFloat(pt.pasir_pct) : null,
      air_pct: pt.air_pct !== undefined && pt.air_pct !== null ? safeFloat(pt.air_pct) : null,
      sampah_pct: pt.sampah_pct !== undefined && pt.sampah_pct !== null ? safeFloat(pt.sampah_pct) : null,
      partenokarpi_pct: pt.partenokarpi_pct !== undefined && pt.partenokarpi_pct !== null ? safeFloat(pt.partenokarpi_pct) : null,
      restan_pct: pt.restan_pct !== undefined && pt.restan_pct !== null ? safeFloat(pt.restan_pct) : null,
      abnormal_pct: pt.abnormal_pct !== undefined && pt.abnormal_pct !== null ? safeFloat(pt.abnormal_pct) : null,
      dura_pct: pt.dura_pct !== undefined && pt.dura_pct !== null ? safeFloat(pt.dura_pct) : null,
      pesifera_pct: pt.pesifera_pct !== undefined && pt.pesifera_pct !== null ? safeFloat(pt.pesifera_pct) : null,
      lainnya_pct: pt.lainnya_pct !== undefined && pt.lainnya_pct !== null ? safeFloat(pt.lainnya_pct) : null,
      total_potongan_tambahan_pct: pt.total_potongan_tambahan_pct !== undefined && pt.total_potongan_tambahan_pct !== null ? safeFloat(pt.total_potongan_tambahan_pct) : null,
      total_potongan_ai_pct: pt.total_potongan_ai_pct !== undefined && pt.total_potongan_ai_pct !== null ? safeFloat(pt.total_potongan_ai_pct) : null,
    };
  }

  const mInput = gr.manual_input || doc.manual_input || {};
  const potongan = mInput.potongan || {};
  const storedCalc = mInput.calc || gr.calc || doc.calc || {};

  const parseNullFloat = (key, altKey) => {
    const val = potongan[key] ?? potongan[altKey] ?? gr[key] ?? doc[key];
    if (val === undefined || val === null || val === '') return null;
    return safeFloat(val);
  };

  const buah_busuk_pct = parseNullFloat('potongan_buah_busuk', 'buah_busuk');
  const pasir_pct = parseNullFloat('potongan_pasir', 'pasir');
  const air_pct = parseNullFloat('potongan_air', 'air');
  const sampah_pct = parseNullFloat('potongan_sampah', 'sampah');
  const partenokarpi_pct = parseNullFloat('potongan_partenokarpi', 'partenokarpi');
  const restan_pct = parseNullFloat('potongan_restan', 'restan');
  const abnormal_pct = parseNullFloat('potongan_abnormal', 'abnormal');
  const dura_pct = parseNullFloat('potongan_dura', 'dura');
  const pesifera_pct = parseNullFloat('potongan_pesifera', 'pesifera');
  const lainnya_pct = parseNullFloat('potongan_lainnya', 'lainnya');

  const valuesList = [
    buah_busuk_pct, pasir_pct, air_pct, sampah_pct,
    partenokarpi_pct, restan_pct, abnormal_pct, dura_pct,
    pesifera_pct, lainnya_pct
  ].filter((v) => v !== null);

  const total_potongan_tambahan_pct = valuesList.length > 0
    ? safeFloat(valuesList.reduce((a, b) => a + b, 0))
    : null;

  const total_potongan_ai_pct = storedCalc.kgDendaTabelPct !== undefined
    ? safeFloat(storedCalc.kgDendaTabelPct)
    : (gr.potongan_ai !== undefined ? safeFloat(gr.potongan_ai) : null);

  return {
    buah_busuk_pct,
    pasir_pct,
    air_pct,
    sampah_pct,
    partenokarpi_pct,
    restan_pct,
    abnormal_pct,
    dura_pct,
    pesifera_pct,
    lainnya_pct,
    total_potongan_tambahan_pct,
    total_potongan_ai_pct,
  };
}

function formatFormPerhitungan(doc) {
  const gr = doc.grading_result || {};
  if (gr.form_perhitungan && typeof gr.form_perhitungan === 'object') {
    const fp = gr.form_perhitungan;
    return {
      form_a_pct: fp.form_a_pct !== undefined && fp.form_a_pct !== null ? safeFloat(fp.form_a_pct) : null,
      form_b_pct: fp.form_b_pct !== undefined && fp.form_b_pct !== null ? safeFloat(fp.form_b_pct) : null,
      potongan_pct: fp.potongan_pct !== undefined && fp.potongan_pct !== null ? safeFloat(fp.potongan_pct) : null,
      adjusted_form_b_pct: fp.adjusted_form_b_pct !== undefined && fp.adjusted_form_b_pct !== null ? safeFloat(fp.adjusted_form_b_pct) : null,
      potongan_final_pct: fp.potongan_final_pct !== undefined && fp.potongan_final_pct !== null ? safeFloat(fp.potongan_final_pct) : null,
    };
  }

  const mInput = gr.manual_input || doc.manual_input || {};
  const storedCalc = mInput.calc || gr.calc || doc.calc || {};
  const vendorCalc = storedCalc.vendorCalc || {};
  const plasmaCalc = storedCalc.plasmaCalc || {};

  const activeCalc = storedCalc.isPlasmaCalc ? plasmaCalc : vendorCalc;

  const form_a_pct = activeCalc.formA !== undefined ? safeFloat(activeCalc.formA) : (gr.form_a !== undefined ? safeFloat(gr.form_a) : null);
  const form_b_pct = activeCalc.formBBG !== undefined ? safeFloat(activeCalc.formBBG) : (mInput.formBVisual !== undefined ? safeFloat(mInput.formBVisual) : null);
  const potongan_pct = activeCalc.potonganFinal !== undefined ? safeFloat(activeCalc.potonganFinal) : null;
  const adjusted_form_b_pct = activeCalc.formBAG !== undefined ? safeFloat(activeCalc.formBAG) : (gr.form_b_ag !== undefined ? safeFloat(gr.form_b_ag) : null);
  const potongan_final_pct = activeCalc.potonganFinal !== undefined ? safeFloat(activeCalc.potonganFinal) : (gr.potongan_final !== undefined ? safeFloat(gr.potongan_final) : null);

  return {
    form_a_pct,
    form_b_pct,
    potongan_pct,
    adjusted_form_b_pct,
    potongan_final_pct,
  };
}

function formatInspectionItemDetail(doc) {
  const summary = formatInspectionItemSummary(doc);
  const gr = doc.grading_result || {};

  return {
    ...summary,
    grading_ai: formatGradingAi(doc),
    buah_hitam_diterima: gr.buah_hitam_diterima ?? mInput.buahHitamDiterima ?? null,
    redistribusi_potongan: formatRedistribusiPotongan(doc),
    potongan_tambahan: formatPotonganTambahan(doc),
    form_perhitungan: formatFormPerhitungan(doc),
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
