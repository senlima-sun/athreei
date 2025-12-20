import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sql = postgres(dbUrl);

  console.log('Running database migrations...');

  try {
    // Read and execute migration file
    const migrationPath = join(__dirname, '001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the entire migration as a single transaction
    await sql.unsafe(migrationSQL);

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
