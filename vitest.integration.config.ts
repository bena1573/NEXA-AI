import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/** Requires a migrated Postgres database with the pgvector extension. */
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['tests/integration/**/*.test.ts'],
        // Tenants are created per file, but they share one database connection.
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 60_000,
    },
});
