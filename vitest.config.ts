import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        // Integration tests need a Postgres+pgvector database and run separately
        // via `npm run test:integration`.
        include: ['tests/*.test.ts'],
        coverage: {
            include: ['lib/**/*.ts'],
            reporter: ['text', 'lcov'],
        },
    },
});
