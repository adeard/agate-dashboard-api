require('dotenv').config();
const { runMigrations } = require('../services/migration.service');
const { closePool } = require('../lib/db/sqlserver');

(async () => {
  try {
    console.log('[Script] Starting SQL Server migrations...');
    await runMigrations();
    console.log('[Script] Migrations completed successfully.');
    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('[Script] Migration script failed:', err);
    await closePool();
    process.exit(1);
  }
})();
