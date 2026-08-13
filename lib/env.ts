import { z } from 'zod';

const schema = z.object({
    DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/nexa'),
    AUTH_SECRET: z.string().min(16).default('nexa-ai-development-secret-change-me'),
    APP_URL: z.string().url().default('http://localhost:3000'),

    AI_PROVIDER: z.enum(['demo', 'openai']).optional(),
    AI_API_KEY: z.string().optional(),
    AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
    AI_MODEL: z.string().default('gpt-4o-mini'),
    AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

    VOICE_PROVIDER: z.enum(['simulator', 'twilio']).optional(),
    VOICE_PROVIDER_API_KEY: z.string().optional(),
    VOICE_PROVIDER_API_SECRET: z.string().optional(),
    VOICE_PROVIDER_PHONE_NUMBER: z.string().optional(),
    VOICE_WEBHOOK_SECRET: z.string().optional(),

    STORAGE_API_KEY: z.string().optional(),
    PAYMENT_PROVIDER_SECRET: z.string().optional(),

    DEMO_MODE: z.enum(['true', 'false']).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    // Fail fast with a readable message instead of a stack trace at first use.
    const issues = parsed.error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
}

const raw = parsed.data;

/**
 * Demo mode is the default whenever no AI credentials are configured, so the
 * project is fully explorable with an empty .env.
 */
const demoMode = raw.DEMO_MODE ? raw.DEMO_MODE === 'true' : !raw.AI_API_KEY;

export const env = {
    ...raw,
    DEMO_MODE: demoMode,
    aiProvider: raw.AI_PROVIDER ?? (demoMode || !raw.AI_API_KEY ? 'demo' : 'openai'),
    voiceProvider: raw.VOICE_PROVIDER
        ?? (raw.VOICE_PROVIDER_API_KEY && !demoMode ? 'twilio' : 'simulator'),
} as const;

export type Env = typeof env;
