// Apply optimize_schema_phase2.sql and verify all 23 new indexes exist.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_FILE = resolve(
  __dirname, '..', '..', '..',
  'wodifairrebrand', 'backend', 'migrations', 'optimize_schema_phase2.sql'
);

const EXPECTED = [
  ['bubu',     'contact_messages',     'idx_bubu_contact_messages_email'],
  ['bubu',     'customer_addresses',   'idx_bubu_customer_addresses_phone'],
  ['bubu',     'customer_addresses',   'idx_bubu_customer_addresses_zip'],
  ['bubu',     'orders',               'idx_bubu_orders_guest_phone'],
  ['public',   'contact_messages',     'idx_public_contact_messages_phone'],
  ['public',   'contacts',             'idx_public_contacts_email'],
  ['public',   'customer_addresses',   'idx_public_customer_addresses_phone'],
  ['public',   'customer_addresses',   'idx_public_customer_addresses_zip'],
  ['public',   'events',               'idx_public_events_status'],
  ['public',   'orders',               'idx_public_orders_customer_email'],
  ['public',   'orders',               'idx_public_orders_customer_phone'],
  ['public',   'orders',               'idx_public_orders_guest_email'],
  ['public',   'orders',               'idx_public_orders_guest_phone'],
  ['public',   'vendors',              'idx_public_vendors_payment_reference'],
  ['public',   'wodi_customers',       'idx_public_wodi_customers_status'],
  ['retail',   'sync_log',             'idx_retail_sync_log_entity_id'],
  ['retail',   'wodi_customers',       'idx_retail_wodi_customers_status'],
  ['public',   'audit_logs',           'idx_public_audit_logs_user_id'],
  ['public',   'blogs',                'idx_public_blogs_author_id'],
  ['public',   'order_items',          'idx_public_order_items_variant_id'],
  ['public',   'vendors',              'idx_public_vendors_event_id'],
  ['retail',   'wodi_sales',           'idx_retail_wodi_sales_customer_id'],
  ['public',   'orders',               'idx_public_orders_shipping_address_gin'],
];

const log = (m) => console.log(`[apply] ${m}`);
const ok  = (m) => console.log(`  \u2713 ${m}`);
const bad = (m) => console.log(`  \u2717 ${m}`);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Did you source backend/.env?');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  log('connected');
  log(`reading ${MIGRATION_FILE}`);
  const sql = readFileSync(MIGRATION_FILE, 'utf8');
  log('running migration...');
  await client.query(sql);
  log('migration finished');

  log(`checking ${EXPECTED.length} indexes...`);
  let present = 0, missing = 0;
  for (const [schema, table, idx] of EXPECTED) {
    const r = await client.query(
      `SELECT 1 FROM pg_indexes WHERE schemaname=$1 AND tablename=$2 AND indexname=$3`,
      [schema, table, idx]
    );
    if (r.rowCount === 1) {
      present++;
      ok(`${schema}.${idx}`);
    } else {
      missing++;
      bad(`${schema}.${idx} MISSING`);
    }
  }
  log(`done. ${present} present, ${missing} missing.`);
  process.exit(missing === 0 ? 0 : 2);
} catch (err) {
  console.error('[apply] FAILED:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
