import mysql from 'mysql2/promise';

let pool = null;

/**
 * TINYINT(1) columns are MySQL's boolean convention; every other type
 * is left to mysql2's default casting (DATE/DATETIME already come back
 * as JS Date objects, DECIMAL as strings unless decimalNumbers is set).
 */
const typeCast = (field, next) => {
  if (field.type === 'TINY' && field.length === 1) {
    const value = field.string();
    return value === null ? null : value === '1';
  }
  return next();
};

/**
 * Lazily creates the MySQL pool on first use so the app doesn't require
 * a MySQL connection at boot — it's otherwise a pure MongoDB app, and
 * this pool only exists to feed the one-off migration tool.
 */
export const getMysqlPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      decimalNumbers: true,
      typeCast
    });
  }
  return pool;
};

export default getMysqlPool;
