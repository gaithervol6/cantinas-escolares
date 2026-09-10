import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const db = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.join(__dirname, 'src/shared/database/migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  });

  try {
    console.log('Running migrations...');
    const [batchNo, log] = await db.migrate.latest();
    if (log.length === 0) {
      console.log('Already up to date.');
    } else {
      console.log(`Batch ${batchNo} run: ${log.length} migrations`);
      log.forEach((file: string) => console.log(`  - ${file}`));
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

run();
