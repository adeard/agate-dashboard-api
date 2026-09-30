const { getPool, sql } = require('../lib/db/sqlserver');
const dayjs = require('dayjs');

class WbGradingService {
  /**
   * Upsert inspection data across the 8 SQL Server tables transactionally.
   * Parameterized to prevent SQL Injection and batched to optimize throughput.
   */
  static async upsertInspection(body) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

    try {
      const ticketNumber = (body['ticket_number'] || body['id'] || '').toString().trim();
      const deliveryNumber = (body['delivery_number'] || body['spb_number'] || '').toString().trim();
      const vehicleNumber = (body['vehicle_number'] || '').toString().trim();
      const vendorName = (body['vendor_name'] || '').toString().trim();
      const vendorId = (body['vendor_id'] || body['vendor_code'] || '').toString().trim();
      const vendorType = parseInt(body['vendor_type'] || '3', 10) || 3;
      const dateVal = body['date'] ? new Date(body['date']) : new Date();
      const finishDateVal = body['finish_date'] ? new Date(body['finish_date']) : dateVal;

      const gradingResult = body['grading_result'] || {};
      const totalTandan = parseInt(gradingResult['total_tandan'] || 0, 10) || 0;
      const totalAccepted = parseInt(gradingResult['total_accepted'] || 0, 10) || 0;
      const totalRejected = parseInt(gradingResult['total_rejected'] || 0, 10) || 0;
      const totalFined = parseInt(gradingResult['total_fined'] || 0, 10) || 0;
      const totalMultiple = parseInt(body['total_multiple'] || gradingResult['total_multiple'] || 0, 10) || 0;

      // Extract ticket summary counts
      const acceptedSummary = gradingResult['accepted_summary'] || {};
      const rejectedSummary = gradingResult['rejected_summary'] || {};
      const classificationSummary = gradingResult['classification_summary'] || {};
      const finedSummary = gradingResult['fined_summary'] || {};
      const manualInput = body['manual_input'] || gradingResult['manual_input'] || {};
      const manualParameter = body['manual_parameter'] || gradingResult['manual_parameter'] || {};

      const unripe = parseInt(rejectedSummary['MENTAH']?.['TOTAL'] || classificationSummary['MENTAH']?.['TOTAL'] || 0, 10);
      const ripe = parseInt(acceptedSummary['MATANG']?.['TOTAL'] || classificationSummary['MATANG']?.['TOTAL'] || 0, 10);
      const overRipe = parseInt(acceptedSummary['LEWAT MATANG']?.['TOTAL'] || classificationSummary['LEWAT MATANG']?.['TOTAL'] || 0, 10);
      const emptyBunch = parseInt(rejectedSummary['JANJANG KOSONG']?.['TOTAL'] || classificationSummary['JANJANG KOSONG']?.['TOTAL'] || 0, 10);
      const abnormal = parseInt(rejectedSummary['ABNORMAL']?.['TOTAL'] || classificationSummary['ABNORMAL']?.['TOTAL'] || 0, 10);
      const rotten = parseInt(rejectedSummary['BUSUK']?.['TOTAL'] || classificationSummary['BUSUK']?.['TOTAL'] || 0, 10);

      // Tangkai panjang sum across summaries
      let longStalk = 0;
      Object.values(classificationSummary).forEach((cat) => {
        if (cat && typeof cat === 'object') {
          longStalk += parseInt(cat['TANGKAI PANJANG'] || 0, 10);
        }
      });

      // Rat damage sum
      let ratDamage = 0;
      Object.values(classificationSummary).forEach((cat) => {
        if (cat && typeof cat === 'object') {
          ratDamage += parseInt(cat['RUSAK DIMAKAN TIKUS'] || 0, 10);
        }
      });

      // Loss fruit
      const lossFruit = parseInt(manualInput['BRONDOLAN'] || manualInput['BERONDOLAN'] || manualParameter['BRONDOLAN'] || 0, 10);

      // --- 1. Header Upsert ---
      const headerCheckReq = new sql.Request(transaction);
      headerCheckReq.input('ticketNumber', sql.VarChar(50), ticketNumber);
      const existingHeader = await headerCheckReq.query(
        `SELECT id FROM WbGradingHeader WHERE ticket_number = @ticketNumber`
      );

      if (existingHeader.recordset.length > 0) {
        const updateHeaderReq = new sql.Request(transaction);
        updateHeaderReq.input('ticketNumber', sql.VarChar(50), ticketNumber);
        updateHeaderReq.input('deliveryNumber', sql.VarChar(50), deliveryNumber);
        updateHeaderReq.input('vehicleNumber', sql.VarChar(20), vehicleNumber);
        updateHeaderReq.input('vendorName', sql.VarChar(100), vendorName);
        updateHeaderReq.input('vendorId', sql.VarChar(50), vendorId);
        updateHeaderReq.input('vendorType', sql.Int, vendorType);
        updateHeaderReq.input('date', sql.DateTime2(7), dateVal);
        updateHeaderReq.input('finishDate', sql.DateTime2(7), finishDateVal);
        updateHeaderReq.input('totalTandan', sql.Int, totalTandan);
        updateHeaderReq.input('totalAccepted', sql.Int, totalAccepted);
        updateHeaderReq.input('totalRejected', sql.Int, totalRejected);
        updateHeaderReq.input('totalFined', sql.Int, totalFined);
        updateHeaderReq.input('totalMultiple', sql.Int, totalMultiple);

        await updateHeaderReq.query(`
          UPDATE WbGradingHeader
          SET delivery_number = @deliveryNumber,
              vehicle_number = @vehicleNumber,
              vendor_name = @vendorName,
              vendor_id = @vendorId,
              vendor_type = @vendorType,
              [date] = @date,
              finish_date = @finishDate,
              total_tandan = @totalTandan,
              total_accepted = @totalAccepted,
              total_rejected = @totalRejected,
              total_fined = @totalFined,
              total_multiple = @totalMultiple
          WHERE ticket_number = @ticketNumber
        `);
      } else {
        const insertHeaderReq = new sql.Request(transaction);
        insertHeaderReq.input('ticketNumber', sql.VarChar(50), ticketNumber);
        insertHeaderReq.input('deliveryNumber', sql.VarChar(50), deliveryNumber);
        insertHeaderReq.input('vehicleNumber', sql.VarChar(20), vehicleNumber);
        insertHeaderReq.input('vendorName', sql.VarChar(100), vendorName);
        insertHeaderReq.input('vendorId', sql.VarChar(50), vendorId);
        insertHeaderReq.input('vendorType', sql.Int, vendorType);
        insertHeaderReq.input('date', sql.DateTime2(7), dateVal);
        insertHeaderReq.input('finishDate', sql.DateTime2(7), finishDateVal);
        insertHeaderReq.input('totalTandan', sql.Int, totalTandan);
        insertHeaderReq.input('totalAccepted', sql.Int, totalAccepted);
        insertHeaderReq.input('totalRejected', sql.Int, totalRejected);
        insertHeaderReq.input('totalFined', sql.Int, totalFined);
        insertHeaderReq.input('totalMultiple', sql.Int, totalMultiple);

        await insertHeaderReq.query(`
          INSERT INTO WbGradingHeader (
            ticket_number, delivery_number, vehicle_number, vendor_name, vendor_id,
            vendor_type, [date], finish_date, total_tandan, total_accepted,
            total_rejected, total_fined, total_multiple
          ) VALUES (
            @ticketNumber, @deliveryNumber, @vehicleNumber, @vendorName, @vendorId,
            @vendorType, @date, @finishDate, @totalTandan, @totalAccepted,
            @totalRejected, @totalFined, @totalMultiple
          )
        `);
      }

      // --- 2. Ticket Summary Upsert ---
      const summaryCheckReq = new sql.Request(transaction);
      summaryCheckReq.input('ticketNumber', sql.VarChar(50), ticketNumber);
      const existingSummary = await summaryCheckReq.query(
        `SELECT id FROM WbGradingTicketSummary WHERE ticket_number = @ticketNumber`
      );

      const summaryReq = new sql.Request(transaction);
      summaryReq.input('ticketNumber', sql.VarChar(50), ticketNumber);
      summaryReq.input('deliveryNumber', sql.VarChar(50), deliveryNumber);
      summaryReq.input('vehicleNumber', sql.VarChar(20), vehicleNumber);
      summaryReq.input('date', sql.DateTime2(7), dateVal);
      summaryReq.input('unripe', sql.Int, unripe);
      summaryReq.input('ripe', sql.Int, ripe);
      summaryReq.input('overRipe', sql.Int, overRipe);
      summaryReq.input('emptyBunch', sql.Int, emptyBunch);
      summaryReq.input('abnormal', sql.Int, abnormal);
      summaryReq.input('rotten', sql.Int, rotten);
      summaryReq.input('longStalk', sql.Int, longStalk);
      summaryReq.input('ratDamage', sql.Int, ratDamage);
      summaryReq.input('lossFruit', sql.Int, lossFruit);

      if (existingSummary.recordset.length > 0) {
        await summaryReq.query(`
          UPDATE WbGradingTicketSummary
          SET delivery_number = @deliveryNumber,
              vehicle_number = @vehicleNumber,
              [date] = @date,
              unripe = @unripe,
              ripe = @ripe,
              over_ripe = @overRipe,
              empty_bunch = @emptyBunch,
              abnormal = @abnormal,
              rotten = @rotten,
              long_stalk = @longStalk,
              rat_damage = @ratDamage,
              loss_fruit = @lossFruit
          WHERE ticket_number = @ticketNumber
        `);
      } else {
        await summaryReq.query(`
          INSERT INTO WbGradingTicketSummary (
            ticket_number, delivery_number, vehicle_number, [date],
            unripe, ripe, over_ripe, empty_bunch, abnormal, rotten,
            long_stalk, rat_damage, loss_fruit
          ) VALUES (
            @ticketNumber, @deliveryNumber, @vehicleNumber, @date,
            @unripe, @ripe, @overRipe, @emptyBunch, @abnormal, @rotten,
            @longStalk, @ratDamage, @lossFruit
          )
        `);
      }

      // --- 3. Clean up existing child details for idempotency ---
      const deleteDetailsReq = new sql.Request(transaction);
      deleteDetailsReq.input('ticketNumber', sql.VarChar(50), ticketNumber);
      await deleteDetailsReq.query(`
        DELETE FROM WbGradingAcceptedClassification WHERE ticket_number = @ticketNumber;
        DELETE FROM WbGradingAcceptedDetail WHERE ticket_number = @ticketNumber;
        DELETE FROM WbGradingClassificationDetail WHERE ticket_number = @ticketNumber;
        DELETE FROM WbGradingRejectedDetail WHERE ticket_number = @ticketNumber;
        DELETE FROM WbGradingFinedDetail WHERE ticket_number = @ticketNumber;
        DELETE FROM WbGradingManualParameter WHERE ticket_number = @ticketNumber;
      `);

      // --- 4. Insert Accepted Classifications ---
      const acceptedClassifications = Array.isArray(body['main_classification_accepted']) && body['main_classification_accepted'].length
        ? body['main_classification_accepted']
        : Object.keys(gradingResult['accepted'] || {});

      for (const classification of acceptedClassifications) {
        const req = new sql.Request(transaction);
        req.input('ticketNumber', sql.VarChar(50), ticketNumber);
        req.input('classification', sql.VarChar(100), classification.toString());
        await req.query(`
          INSERT INTO WbGradingAcceptedClassification (ticket_number, classification)
          VALUES (@ticketNumber, @classification)
        `);
      }

      // --- 5. Insert Accepted Details ---
      await this._insertCategoryDetails(transaction, 'WbGradingAcceptedDetail', ticketNumber, acceptedSummary);

      // --- 6. Insert Classification Details ---
      await this._insertCategoryDetails(transaction, 'WbGradingClassificationDetail', ticketNumber, classificationSummary);

      // --- 7. Insert Rejected Details ---
      await this._insertCategoryDetails(transaction, 'WbGradingRejectedDetail', ticketNumber, rejectedSummary);

      // --- 8. Insert Fined Details ---
      for (const [kategori, fineInfo] of Object.entries(finedSummary)) {
        if (fineInfo && typeof fineInfo === 'object') {
          const req = new sql.Request(transaction);
          req.input('ticketNumber', sql.VarChar(50), ticketNumber);
          req.input('kategori', sql.VarChar(100), kategori);
          req.input('total', sql.Int, parseInt(fineInfo['TOTAL'] || 0, 10));
          req.input('denda', sql.Int, parseInt(fineInfo['DENDA'] || 0, 10));
          await req.query(`
            INSERT INTO WbGradingFinedDetail (ticket_number, kategori, total, denda)
            VALUES (@ticketNumber, @kategori, @total, @denda)
          `);
        }
      }

      // --- 9. Insert Manual Parameters ---
      const manualParamsMap = { ...manualParameter, ...manualInput };
      for (const [param, val] of Object.entries(manualParamsMap)) {
        if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
          const req = new sql.Request(transaction);
          req.input('ticketNumber', sql.VarChar(50), ticketNumber);
          req.input('parameter', sql.VarChar(100), param);
          req.input('qty', sql.Int, parseInt(val, 10));
          await req.query(`
            INSERT INTO WbGradingManualParameter (ticket_number, parameter, qty)
            VALUES (@ticketNumber, @parameter, @qty)
          `);
        }
      }

      await transaction.commit();
      return { success: true, ticket_number: ticketNumber };
    } catch (err) {
      await transaction.rollback();
      console.error('[WbGradingService.upsertInspection Failed]:', err);
      throw err;
    }
  }

  /**
   * Helper to insert nested category summaries into detail tables.
   */
  static async _insertCategoryDetails(transaction, tableName, ticketNumber, summaryObj) {
    for (const [kategori, subObj] of Object.entries(summaryObj)) {
      if (subObj && typeof subObj === 'object') {
        for (const [subKategori, qty] of Object.entries(subObj)) {
          if (typeof qty === 'number' || (typeof qty === 'string' && !isNaN(Number(qty)))) {
            const req = new sql.Request(transaction);
            req.input('ticketNumber', sql.VarChar(50), ticketNumber);
            req.input('kategori', sql.VarChar(50), kategori);
            req.input('subKategori', sql.VarChar(100), subKategori);
            req.input('qty', sql.Int, parseInt(qty, 10));
            await req.query(`
              INSERT INTO ${tableName} (ticket_number, kategori, sub_kategori, qty)
              VALUES (@ticketNumber, @kategori, @subKategori, @qty)
            `);
          }
        }
      }
    }
  }

  /**
   * Fetch paginated inspection list with filters and server-side aggregation totals.
   * Completely parameterized to prevent SQL Injection.
   */
  static async getInspections(filter = {}, pagination = {}) {
    const pool = await getPool();
    const req = pool.request();

    const page = Math.max(1, parseInt(pagination.page || 1, 10));
    const limit = Math.max(1, parseInt(pagination.limit || 20, 10));
    const offset = (page - 1) * limit;

    req.input('offset', sql.Int, offset);
    req.input('limit', sql.Int, limit);

    const conditions = [];

    if (filter.delivery_number) {
      conditions.push('delivery_number LIKE @deliveryNumber');
      req.input('deliveryNumber', sql.VarChar(50), `%${filter.delivery_number}%`);
    }

    if (filter.vehicle_number) {
      conditions.push('vehicle_number LIKE @vehicleNumber');
      req.input('vehicleNumber', sql.VarChar(20), `%${filter.vehicle_number}%`);
    }

    if (filter.vendor_id) {
      conditions.push('vendor_id = @vendorId');
      req.input('vendorId', sql.VarChar(50), filter.vendor_id);
    }

    if (filter.vendor_name) {
      conditions.push('vendor_name LIKE @vendorName');
      req.input('vendorName', sql.VarChar(100), `%${filter.vendor_name}%`);
    }

    if (filter.limit_minimum) {
      conditions.push('total_tandan >= @limitMinimum');
      req.input('limitMinimum', sql.Int, parseInt(filter.limit_minimum, 10));
    }

    if (filter.date_from && filter.date_to) {
      const fromDate = dayjs(filter.date_from).hour(6).minute(0).second(0).toDate();
      const toDate = dayjs(filter.date_to).add(1, 'day').hour(5).minute(59).second(59).toDate();
      conditions.push('[date] >= @dateFrom AND [date] <= @dateTo');
      req.input('dateFrom', sql.DateTime2(7), fromDate);
      req.input('dateTo', sql.DateTime2(7), toDate);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      WITH FilteredData AS (
        SELECT
          id, ticket_number, delivery_number, vehicle_number,
          vendor_name, vendor_id, vendor_type, [date], finish_date,
          total_tandan, total_accepted, total_rejected, total_fined,
          total_multiple, created_at,
          COUNT(*) OVER() AS total_count,
          SUM(CAST(total_tandan AS BIGINT)) OVER() AS sum_tandan,
          SUM(CAST(total_accepted AS BIGINT)) OVER() AS sum_accepted,
          SUM(CAST(total_rejected AS BIGINT)) OVER() AS sum_rejected,
          SUM(CAST(total_fined AS BIGINT)) OVER() AS sum_fined
        FROM WbGradingHeader
        ${whereClause}
      )
      SELECT * FROM FilteredData
      ORDER BY [date] DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const result = await req.query(query);
    const rows = result.recordset;

    const totalData = rows.length > 0 ? rows[0].total_count : 0;
    const totalTandan = rows.length > 0 ? rows[0].sum_tandan || 0 : 0;
    const totalAccepted = rows.length > 0 ? rows[0].sum_accepted || 0 : 0;
    const totalRejected = rows.length > 0 ? rows[0].sum_rejected || 0 : 0;
    const totalFined = rows.length > 0 ? rows[0].sum_fined || 0 : 0;

    return {
      data: rows.map((r) => ({
        id: r.id,
        ticket_number: r.ticket_number,
        delivery_number: r.delivery_number,
        vehicle_number: r.vehicle_number,
        vendor_name: r.vendor_name,
        vendor_id: r.vendor_id,
        vendor_type: r.vendor_type,
        date: r.date,
        finish_date: r.finish_date,
        grading_result: {
          total_tandan: r.total_tandan,
          total_accepted: r.total_accepted,
          total_rejected: r.total_rejected,
          total_fined: r.total_fined,
          total_multiple: r.total_multiple,
        },
        created_at: r.created_at,
      })),
      meta: {
        total_data: totalData,
        total_tandan: totalTandan,
        total_accepted: totalAccepted,
        total_rejected: totalRejected,
        total_fined: totalFined,
        page,
        limit,
      },
    };
  }

  /**
   * Fetch full inspection detail for a ticket by ticket_number or header ID.
   */
  static async getInspectionDetail(identifier) {
    const pool = await getPool();
    const req = pool.request();

    const isNumeric = !isNaN(Number(identifier));
    if (isNumeric) {
      req.input('id', sql.Int, parseInt(identifier, 10));
    }
    req.input('ticketNumber', sql.VarChar(50), identifier.toString());

    const headerQuery = isNumeric
      ? `SELECT TOP 1 * FROM WbGradingHeader WHERE id = @id OR ticket_number = @ticketNumber`
      : `SELECT TOP 1 * FROM WbGradingHeader WHERE ticket_number = @ticketNumber`;

    const headerRes = await req.query(headerQuery);
    if (!headerRes.recordset.length) {
      return null;
    }

    const header = headerRes.recordset[0];
    const ticketNo = header.ticket_number;

    const detailReq = pool.request();
    detailReq.input('ticketNumber', sql.VarChar(50), ticketNo);

    const [summaryRes, acceptedClassRes, acceptedDetailRes, rejectedDetailRes, finedDetailRes, manualParamRes] =
      await Promise.all([
        detailReq.query(`SELECT TOP 1 * FROM WbGradingTicketSummary WHERE ticket_number = @ticketNumber`),
        detailReq.query(`SELECT classification FROM WbGradingAcceptedClassification WHERE ticket_number = @ticketNumber`),
        detailReq.query(`SELECT kategori, sub_kategori, qty FROM WbGradingAcceptedDetail WHERE ticket_number = @ticketNumber`),
        detailReq.query(`SELECT kategori, sub_kategori, qty FROM WbGradingRejectedDetail WHERE ticket_number = @ticketNumber`),
        detailReq.query(`SELECT kategori, total, denda FROM WbGradingFinedDetail WHERE ticket_number = @ticketNumber`),
        detailReq.query(`SELECT parameter, qty FROM WbGradingManualParameter WHERE ticket_number = @ticketNumber`),
      ]);

    // Format nested summary objects
    const acceptedSummary = {};
    acceptedDetailRes.recordset.forEach((row) => {
      if (!acceptedSummary[row.kategori]) acceptedSummary[row.kategori] = {};
      acceptedSummary[row.kategori][row.sub_kategori] = row.qty;
    });

    const rejectedSummary = {};
    rejectedDetailRes.recordset.forEach((row) => {
      if (!rejectedSummary[row.kategori]) rejectedSummary[row.kategori] = {};
      rejectedSummary[row.kategori][row.sub_kategori] = row.qty;
    });

    const finedSummary = {};
    finedDetailRes.recordset.forEach((row) => {
      finedSummary[row.kategori] = { TOTAL: row.total, DENDA: row.denda };
    });

    const manualParams = {};
    manualParamRes.recordset.forEach((row) => {
      manualParams[row.parameter] = row.qty;
    });

    return {
      _id: header.id,
      id: header.id,
      ticket_number: header.ticket_number,
      delivery_number: header.delivery_number,
      vehicle_number: header.vehicle_number,
      vendor_name: header.vendor_name,
      vendor_id: header.vendor_id,
      vendor_type: header.vendor_type,
      date: header.date,
      finish_date: header.finish_date,
      grading_result: {
        total_tandan: header.total_tandan,
        total_accepted: header.total_accepted,
        total_rejected: header.total_rejected,
        total_fined: header.total_fined,
        total_multiple: header.total_multiple,
        accepted_summary: acceptedSummary,
        rejected_summary: rejectedSummary,
        fined_summary: finedSummary,
        manual_input: manualParams,
        manual_parameter: manualParams,
      },
      ticket_summary: summaryRes.recordset[0] || null,
      main_classification_accepted: acceptedClassRes.recordset.map((r) => r.classification),
      created_at: header.created_at,
    };
  }

  /**
   * Fetch inspection history with pagination and vehicle/delivery filters.
   */
  static async getInspectionHistory(filter = {}, pagination = {}) {
    const pool = await getPool();
    const req = pool.request();

    const page = Math.max(1, parseInt(pagination.page || 1, 10));
    const limit = Math.max(1, parseInt(pagination.limit || 20, 10));
    const offset = (page - 1) * limit;

    req.input('offset', sql.Int, offset);
    req.input('limit', sql.Int, limit);

    const conditions = [];

    if (filter.delivery_number) {
      conditions.push('h.delivery_number LIKE @deliveryNumber');
      req.input('deliveryNumber', sql.VarChar(50), `%${filter.delivery_number}%`);
    }

    if (filter.vehicle_number) {
      conditions.push('h.vehicle_number LIKE @vehicleNumber');
      req.input('vehicleNumber', sql.VarChar(20), `%${filter.vehicle_number}%`);
    }

    if (filter.vendor_id) {
      conditions.push('h.vendor_id = @vendorId');
      req.input('vendorId', sql.VarChar(50), filter.vendor_id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        h.id,
        h.ticket_number,
        h.delivery_number,
        h.vehicle_number,
        h.vendor_name,
        h.vendor_id,
        h.date AS start_date,
        h.finish_date,
        h.total_tandan,
        h.total_rejected,
        h.total_accepted,
        s.unripe,
        s.ripe,
        s.over_ripe,
        s.empty_bunch,
        s.abnormal,
        s.rotten,
        s.long_stalk,
        s.rat_damage,
        s.loss_fruit,
        COUNT(*) OVER() AS total_count
      FROM WbGradingHeader h
      LEFT JOIN WbGradingTicketSummary s ON h.ticket_number = s.ticket_number
      ${whereClause}
      ORDER BY h.[date] DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const result = await req.query(query);
    const rows = result.recordset;
    const totalData = rows.length > 0 ? rows[0].total_count : 0;

    return {
      data: rows.map((r) => ({
        id: r.id,
        ticket_number: r.ticket_number,
        delivery_number: r.delivery_number,
        vehicle_number: r.vehicle_number,
        vendor: {
          id: r.vendor_id,
          name: r.vendor_name,
        },
        start_date: r.start_date,
        finish_date: r.finish_date,
        total_tandan: r.total_tandan,
        total_rejected: r.total_rejected,
        total_accepted: r.total_accepted,
        unripe: r.unripe,
        ripe: r.ripe,
        over_ripe: r.over_ripe,
        empty_bunch: r.empty_bunch,
        rotten: r.rotten,
        long_stalk: r.long_stalk,
        rat_damage: r.rat_damage,
      })),
      totalData,
      page,
      limit,
    };
  }
}

module.exports = WbGradingService;
