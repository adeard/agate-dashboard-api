const sql = require('mssql');

const config = {
  server: process.env.MSSQL_SERVER || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  database: process.env.MSSQL_DATABASE || 'grading_db',
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || '',
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 30000,
  },
  pool: {
    min: parseInt(process.env.MSSQL_POOL_MIN || '2', 10),
    max: parseInt(process.env.MSSQL_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

/**
 * Connect to Microsoft SQL Server and return the connection pool.
 */
async function connectToSqlServer() {
  if (pool) {
    return pool;
  }

  try {
    pool = await new sql.ConnectionPool(config).connect();

    pool.on('error', (err) => {
      console.error('[SQL Server Pool Error]:', err);
      pool = null;
    });

    console.log(`[SQL Server Connected]: Database "${config.database}" at ${config.server}:${config.port}`);
    return pool;
  } catch (err) {
    console.error('[SQL Server Connection Failed]:', err.message);
    throw err;
  }
}

/**
 * Get active connection pool. Automatically connects if not yet initialized.
 */
async function getPool() {
  if (!pool) {
    return await connectToSqlServer();
  }
  return pool;
}

/**
 * Close SQL Server connection pool.
 */
async function closePool() {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.log('[SQL Server Pool Closed]');
    } catch (err) {
      console.error('[SQL Server Close Error]:', err.message);
    }
  }
}

module.exports = {
  sql,
  config,
  connectToSqlServer,
  getPool,
  closePool,
};
