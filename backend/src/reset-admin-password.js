/**
 * reset-admin-password.js
 * -----------------------
 * Reset the admin user password to a known value.
 * Usage:  node src/reset-admin-password.js
 *
 * This script will update the password for the admin user specified
 * in the environment variables (or use defaults).
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

// Change these values to set a new password
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'Wodibenuah@yahoo.com';
const NEW_PASSWORD   = process.env.ADMIN_PASSWORD || 'Admin@Bubu2025';

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔐 Resetting admin password...');
    console.log(`   Email: ${ADMIN_EMAIL}`);

    // Find which schema admin_users lives in
    const { rows: schemas } = await client.query(`
      SELECT table_schema FROM information_schema.tables
      WHERE table_name = 'admin_users'
        AND table_schema IN ('bubu', 'public')
      LIMIT 1
    `);

    if (schemas.length === 0) {
      console.error('❌  admin_users table not found!');
      process.exit(1);
    }

    const schema = schemas[0].table_schema;
    console.log(`   Schema: ${schema}`);

    // Check if admin user exists
    const { rows: existing } = await client.query(
      `SELECT id, email FROM ${schema}.admin_users WHERE LOWER(email) = LOWER($1)`,
      [ADMIN_EMAIL]
    );

    if (existing.length === 0) {
      console.error(`❌  Admin user with email ${ADMIN_EMAIL} not found!`);
      console.log('   Run "node src/fix-admin.js" first to create the admin user.');
      process.exit(1);
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);

    // Update the password
    await client.query(
      `UPDATE ${schema}.admin_users 
       SET password_hash = $1,
           failed_login_count = 0,
           locked_until = NULL
       WHERE LOWER(email) = LOWER($2)`,
      [passwordHash, ADMIN_EMAIL]
    );

    console.log('✅  Password reset successfully!');
    console.log('');
    console.log('   You can now log in with:');
    console.log('   Email   :', ADMIN_EMAIL);
    console.log('   Password:', NEW_PASSWORD);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌  Password reset failed:', err);
  process.exit(1);
});
