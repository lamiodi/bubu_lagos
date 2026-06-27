/**
 * fix-admin.js
 * ------------
 * Run once to ensure the admin user exists with the correct password.
 * Usage:  node src/fix-admin.js
 *
 * It is safe to run multiple times — uses ON CONFLICT DO UPDATE.
 */

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const isProd = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  max: 2,
});

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'Wodibenuah@yahoo.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@Bubu2025';
const ADMIN_USERNAME = 'Super Admin';

async function main() {
  const client = await pool.connect();
  try {
    // Make sure we're in the bubu schema
    await client.query(`SET search_path TO bubu,public`);

    // 1. Confirm admin_users table exists
    const { rows: tables } = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name = 'admin_users'
        AND table_schema IN ('bubu','public')
    `);

    if (tables.length === 0) {
      console.error('❌  admin_users table not found in bubu or public schema!');
      console.error('    Run the backend migrations / seed first.');
      process.exit(1);
    }
    console.log(`✅  Found admin_users in schema: ${tables[0].table_schema}`);

    // 2. Show current admin rows (no passwords)
    const { rows: existing } = await client.query(
      `SELECT id, email, created_at FROM admin_users`
    );
    console.log(`   Current admin rows (${existing.length}):`, existing);

    // 3. Hash the target password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    console.log(`🔑  Hashed password for ${ADMIN_EMAIL}`);

    // 4. Check which optional columns exist
    const colCheck = async (col) => {
      const r = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'admin_users' AND column_name = $2`,
        [tables[0].table_schema, col]
      );
      return r.rows.length > 0;
    };

    const hasUsername = await colCheck('username');
    const hasIsActive = await colCheck('is_active');

    // 5. Upsert admin user
    if (hasUsername && hasIsActive) {
      await client.query(
        `INSERT INTO admin_users (email, password_hash, username, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               username      = EXCLUDED.username,
               is_active     = true`,
        [ADMIN_EMAIL, passwordHash, ADMIN_USERNAME]
      );
    } else if (hasUsername) {
      await client.query(
        `INSERT INTO admin_users (email, password_hash, username)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               username      = EXCLUDED.username`,
        [ADMIN_EMAIL, passwordHash, ADMIN_USERNAME]
      );
    } else {
      await client.query(
        `INSERT INTO admin_users (email, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash`,
        [ADMIN_EMAIL, passwordHash]
      );
    }

    // 6. Verify
    const { rows: after } = await client.query(
      `SELECT id, email, created_at FROM admin_users WHERE email = $1`,
      [ADMIN_EMAIL]
    );
    if (after.length === 0) {
      console.error('❌  Admin user not found after upsert — check constraints.');
      process.exit(1);
    }
    console.log('✅  Admin user ready:', after[0]);
    console.log('');
    console.log('   Email   :', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('');
    console.log('You can now log in at the admin panel with those credentials.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌  Fix-admin script failed:', err);
  process.exit(1);
});
