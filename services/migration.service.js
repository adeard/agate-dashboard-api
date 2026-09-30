const fs = require('fs');
const path = require('path');
const { getPool } = require('../lib/db/sqlserver');

/**
 * Execute all SQL migration files in migrationfile/ directory in sorted numerical order.
 */
async function runMigrations() {
  const pool = await getPool();
  const migrationsDir = path.join(__dirname, '..', 'migrationfile');

  if (!fs.existsSync(migrationsDir)) {
    console.log('[Migration] No migrationfile directory found.');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`[Migration] Found ${files.length} migration script(s). Running migrations...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    try {
      // Split on GO if any batch separators exist in SQL Server scripts
      const batches = sqlContent
        .split(/^\s*GO\s*$/gim)
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

      for (const batch of batches) {
        await pool.request().query(batch);
      }

      console.log(`[Migration] ✓ Applied: ${file}`);
    } catch (err) {
      console.error(`[Migration] ✗ Failed executing ${file}:`, err.message);
      throw err;
    }
  }

  // Ensure optimized indexes for dashboard / history query performance
  await ensurePerformanceIndexes(pool);

  console.log('[Migration] All migrations completed successfully.');
}

/**
 * Ensure performance indexes exist on WbGradingHeader for fast filtering and range queries.
 */
async function ensurePerformanceIndexes(pool) {
  const indexQueries = [
    `
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WbGradingHeader_Date_Vehicle' AND object_id = OBJECT_ID('WbGradingHeader'))
    BEGIN
        CREATE INDEX IX_WbGradingHeader_Date_Vehicle ON WbGradingHeader ([date] DESC, vehicle_number);
    END
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WbGradingHeader_Vendor' AND object_id = OBJECT_ID('WbGradingHeader'))
    BEGIN
        CREATE INDEX IX_WbGradingHeader_Vendor ON WbGradingHeader (vendor_id, [date] DESC);
    END
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WbGradingHeader_DeliveryNumber' AND object_id = OBJECT_ID('WbGradingHeader'))
    BEGIN
        CREATE INDEX IX_WbGradingHeader_DeliveryNumber ON WbGradingHeader (delivery_number);
    END
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WbGradingTicketSummary_Date' AND object_id = OBJECT_ID('WbGradingTicketSummary'))
    BEGIN
        CREATE INDEX IX_WbGradingTicketSummary_Date ON WbGradingTicketSummary ([date] DESC);
    END
    `,
  ];

  for (const q of indexQueries) {
    try {
      await pool.request().query(q);
    } catch (err) {
      console.warn('[Migration] Note on index creation:', err.message);
    }
  }
}

module.exports = {
  runMigrations,
};
