// PostgreSQL migration runner using the live `pg` pool.
//
// The original src/db/runMigration.js and src/db/executeSql.js were written
// against the legacy Supabase platform client (`platformClient.rpc('exec_sql', ...)`)
// and no longer apply to the self-hosted Postgres deployment. This runner uses
// the same connection config as the rest of the app (src/api/db/config.js).
//
// Usage:
//   node src/db/runPgMigration.js                   # run every *.sql in src/db/migrations
//   node src/db/runPgMigration.js path/to/file.sql  # run a single file
//   node src/db/runPgMigration.js path/to/dir       # run every *.sql in a directory

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, closePool } from '../api/db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runFile = async (client, filePath) => {
    const sql = fs.readFileSync(filePath, 'utf8');
    process.stdout.write(`  -> ${path.basename(filePath)} ... `);
    try {
        await client.query(sql);
        console.log('ok');
        return true;
    } catch (error) {
        console.log('FAILED');
        console.error(error);
        return false;
    }
};

const collectFiles = (target) => {
    const stat = fs.statSync(target);
    if (stat.isFile()) {
        return [target];
    }
    return fs.readdirSync(target)
        .filter((f) => f.endsWith('.sql'))
        .sort()
        .map((f) => path.join(target, f));
};

const main = async () => {
    const arg = process.argv[2];
    const target = arg
        ? path.resolve(process.cwd(), arg)
        : path.join(__dirname, 'migrations');

    if (!fs.existsSync(target)) {
        console.error(`Path not found: ${target}`);
        process.exit(1);
    }

    const files = collectFiles(target);
    if (files.length === 0) {
        console.log('No .sql files to run.');
        return;
    }

    console.log(`Running ${files.length} migration file(s):`);

    const pool = getPool();
    const client = await pool.connect();
    try {
        for (const file of files) {
            const ok = await runFile(client, file);
            if (!ok) {
                process.exitCode = 1;
                return;
            }
        }
        console.log('All migrations completed successfully.');
    } finally {
        client.release();
        await closePool();
    }
};

main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
