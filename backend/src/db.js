import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isProd = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Schema namespace
//
// The Bubu Lagos backend shares the WodiFair Supabase project. All Bubu
// tables live in the `bubu` schema (created by the WodiFair migration
// `add_bubu_schema.sql`). By setting `search_path` on every connection
// we can keep the existing controllers writing plain `SELECT * FROM
// products` etc. — they transparently resolve to `bubu.products`,
// `bubu.orders`, etc.
//
// Putting `public` second keeps the door open for ad-hoc admin tools
// that create temp tables in `public`.
// ---------------------------------------------------------------------------
const BUBU_SEARCH_PATH = 'bubu,public';

// Pool sizing:
//   * Render's "Starter" plan caps a single instance at ~0.5 CPU. Keep
//     max low enough that we don't trip Supabase's connection cap.
//   * Supabase free tier caps at 60 direct connections, Pro at ~200.
//   * 10 connections is enough for a single-instance Starter deploy
//     handling ~100 req/min with all blocking IO. Bump via env if you
//     scale up.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,   // Supabase uses self-signed certs
  max: parseInt(process.env.PG_POOL_MAX, 10) || 10,
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS, 10) || 30_000,
  connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT_MS, 10) || 5_000,
  // If a connection is older than 1h, recycle it. Avoids the "stale
  // connection that Supabase killed" error on long-running containers.
  maxLifetimeSeconds: 60 * 60,
  application_name: 'bubu-lagos-backend',
  // `search_path` is connection-level; setting it as a libpq option
  // means the backend's *own* queries (used by getClient / query) also
  // run inside the bubu namespace.
  options: `-c search_path=${BUBU_SEARCH_PATH}`,
});

pool.on('error', (err) => {
  // pg surfaces idle-client errors here. Don't crash the process; just log.
  console.error('[bubu] unexpected pg pool error on idle client:', err.message);
});

export const query = (text, params) => pool.query(text, params);

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Lightweight stats for /api/health. Uses pg's internal counter query
 * which is cheap and doesn't lock anything.
 */
export const getPoolStats = async () => {
  return pool.query(`
    SELECT
      (SELECT count(*) FROM pg_stat_activity WHERE application_name = 'bubu-lagos-backend') AS totalCount,
      (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'   AND application_name = 'bubu-lagos-backend') AS idleCount,
      (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND application_name = 'bubu-lagos-backend') AS activeCount,
      (SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL AND application_name = 'bubu-lagos-backend') AS waitingCount
  `);
};

/** Set the search_path on a client acquired via getClient() — defensive. */
export const setBubuSearchPath = async (client) => {
  await client.query(`SET search_path TO ${BUBU_SEARCH_PATH}`);
};

export default pool;
