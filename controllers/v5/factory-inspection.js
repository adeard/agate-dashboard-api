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

function formatInspectionItemDetail(doc) {
  const summary = formatInspectionItemSummary(doc);
  const gr = doc.grading_result || {};

  return {
    ...summary,
    grading_ai: gr.grading_ai || [],
    buah_hitam_diterima: gr.buah_hitam_diterima ?? null,
    redistribusi_potongan: gr.redistribusi_potongan || [],
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
