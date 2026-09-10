const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const usePostgres = process.env.DB_CLIENT === 'pg' || !!process.env.DATABASE_URL;
const isProd = process.env.NODE_ENV === 'production';

const migrationsDir = usePostgres
  ? path.resolve(__dirname, isProd ? './dist/shared/database/migrations' : './src/shared/database/migrations')
  : path.resolve(__dirname, './src/shared/database/migrations-sqlite');

const config = usePostgres
  ? {
      client: 'pg',
      connection: process.env.DATABASE_URL || 'postgresql://cantina:cantina123@localhost:5432/cantina_escolar',
      pool: { min: 2, max: 10 },
      migrations: {
        directory: migrationsDir,
        extension: isProd ? 'js' : 'ts',
        tableName: 'knex_migrations',
      },
      seeds: {
        directory: path.resolve(__dirname, isProd ? './dist/shared/database/seeds' : './src/shared/database/seeds'),
        extension: isProd ? 'js' : 'ts',
      },
    }
  : {
      client: 'better-sqlite3',
      connection: {
        filename: path.resolve(__dirname, 'dev.sqlite3'),
      },
      useNullAsDefault: true,
      migrations: {
        directory: migrationsDir,
        extension: 'ts',
        tableName: 'knex_migrations',
      },
      seeds: {
        directory: path.resolve(__dirname, './src/shared/database/seeds'),
        extension: 'ts',
      },
    };

module.exports = config;
