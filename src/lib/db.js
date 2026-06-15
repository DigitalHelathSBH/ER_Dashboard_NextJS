import sql from "mssql";

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate:
      process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 30000,
  connectionTimeout: 15000,
};

const globalForSql = globalThis;

export async function getPool() {
  if (!globalForSql.__erDashboardSqlPool) {
    const pool = new sql.ConnectionPool(config);
    globalForSql.__erDashboardSqlPool = pool.connect().catch((error) => {
      globalForSql.__erDashboardSqlPool = null;
      throw error;
    });
  }

  return globalForSql.__erDashboardSqlPool;
}

export { sql };
