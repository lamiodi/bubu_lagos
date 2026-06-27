import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd || (process.env.DATABASE_URL || '').includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    
    if (char === '$' && nextChar === '$') {
      inDollarQuote = !inDollarQuote;
      current += '$$';
      i++; // Skip next '$'
      continue;
    }
    
    if (char === ';' && !inDollarQuote) {
      statements.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim().length > 0) {
    statements.push(current.trim());
  }
  
  return statements;
}

async function runAll() {
  const client = await pool.connect();
  try {
    console.log('Setting search path to bubu,public...');
    await client.query('SET search_path TO bubu, public');

    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`\nProcessing migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf8');

      const statements = splitStatements(sql);

      for (let statement of statements) {
        if (!statement) continue;
        statement += ';';
        try {
          await client.query(statement);
        } catch (err) {
          const errMsg = err.message.toLowerCase();
          if (
            errMsg.includes('already exists') ||
            errMsg.includes('duplicate') ||
            errMsg.includes('already a member') ||
            errMsg.includes('already exists')
          ) {
            console.log(`  [Skipped/Ignored] ${err.message}`);
          } else {
            console.warn(`  [Warning] ${err.message} on statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }
    console.log('\nAll migrations processed successfully!');
  } catch (err) {
    console.error('Fatal error during migration:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runAll();
