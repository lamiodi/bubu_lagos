/**
 * fix-admin-user.js
 * -----------------
 * Comprehensive fix for admin user issues:
 * - Resets password to match env or default
 * - Ensures admin user is active
 * - Unlocks the account if locked
 * 
 * Usage:  node src/fix-admin-user.js
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

// Configuration - change these or set via env vars
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'Wodibenuah@yahoo.com';
const NEW_PASSWORD   = process.env.ADMIN_PASSWORD || 'Admin@Bubu2025';

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing admin user...\n');

    // Find which schema admin_users lives in
    const { rows: schemas } = await client.query(`
      SELECT table_schema FROM information_schema.tables
      WHERE table_name = 'admin_users'
        AND table_schema IN ('bubu', 'public')
      LIMIT 1
    `);

    if (schemas.length === 0) {
      console.error('❌  admin_users table not found!');
      console.error('    Run migrations first.');
      process.exit(1);
    }

    const schema = schemas[0].table_schema;
    console.log(`✅ Found admin_users in schema: ${schema}`);

    // Check which columns exist
    const colCheck = async (col) => {
      const r = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'admin_users' AND column_name = $2`,
        [schema, col]
      );
      return r.rows.length > 0;
    };

    const hasUsername       = await colCheck('username');
    const hasIsActive       = await colCheck('is_active');
    const hasFailedLoginCount = await colCheck('failed_login_count');
    const hasLockedUntil    = await colCheck('locked_until');

    // Check current admin user status (case-insensitive)
    const { rows: existing } = await client.query(
      `SELECT id, email${hasUsername ? ', username' : ''}${hasIsActive ? ', is_active' : ''}${hasFailedLoginCount ? ', failed_login_count' : ''}${hasLockedUntil ? ', locked_until' : ''}
       FROM ${schema}.admin_users 
       WHERE LOWER(email) = LOWER($1)`,
      [ADMIN_EMAIL]
    );

    if (existing.length === 0) {
      console.log(`ℹ️  Admin user ${ADMIN_EMAIL} not found. Creating new admin...`);
      
      const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
      
      let insertQuery, insertValues;
      if (hasUsername && hasIsActive) {
        insertQuery = `INSERT INTO ${schema}.admin_users (email, password_hash, username, is_active) VALUES ($1, $2, 'Super Admin', true)`;
        insertValues = [ADMIN_EMAIL, passwordHash];
      } else if (hasUsername) {
        insertQuery = `INSERT INTO ${schema}.admin_users (email, password_hash, username) VALUES ($1, $2, 'Super Admin')`;
        insertValues = [ADMIN_EMAIL, passwordHash];
      } else {
        insertQuery = `INSERT INTO ${schema}.admin_users (email, password_hash) VALUES ($1, $2)`;
        insertValues = [ADMIN_EMAIL, passwordHash];
      }
      
      await client.query(insertQuery, insertValues);
      console.log(`✅ Created new admin user: ${ADMIN_EMAIL}`);
      
    } else {
      const admin = existing[0];
      console.log(`ℹ️  Admin user found: ${admin.email}`);
      
      if (hasIsActive && !admin.is_active) {
        console.log('   ⚠️  Admin is inactive. Activating...');
      }
      if (hasLockedUntil && admin.locked_until && new Date(admin.locked_until) > new Date()) {
        console.log('   ⚠️  Account is locked. Unlocking...');
      }
      if (hasFailedLoginCount && admin.failed_login_count > 0) {
        console.log(`   ⚠️  Resetting failed login count (was ${admin.failed_login_count})...`);
      }
      
      // Update password, activate, and unlock
      const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
      
      let setClauses = ['password_hash = $1'];
      if (hasIsActive) setClauses.push('is_active = true');
      if (hasFailedLoginCount) setClauses.push('failed_login_count = 0');
      if (hasLockedUntil) setClauses.push('locked_until = NULL');
      
      await client.query(
        `UPDATE ${schema}.admin_users 
         SET ${setClauses.join(', ')}
         WHERE LOWER(email) = LOWER($2)`,
        [passwordHash, ADMIN_EMAIL]
      );
      
      console.log('✅ Admin user updated successfully!');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('You can now log in with:');
    console.log(`   Email   : ${ADMIN_EMAIL}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Fix failed:', err);
  process.exit(1);
});
