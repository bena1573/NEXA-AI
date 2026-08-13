import { env } from '@/lib/env';
import type { AIProvider } from '@/lib/ai/types';
import { DemoAIProvider } from '@/lib/ai/providers/demo';
import { OpenAICompatibleProvider } from '@/lib/ai/providers/openai';

let cached: AIProvider | null = null;

/**
 * Single place that knows which vendor is in use. Call sites depend on the
 * AIProvider interface only.
 */
export function getAIProvider(): AIProvider {
    if (cached) return cached;

    cached = env.aiProvider === 'openai' && env.AI_API_KEY
        ? new OpenAICompatibleProvider(env.AI_API_KEY)
        : new DemoAIProvider();

    return cached;
}

/** Test seam: forget the memoised provider. */
export function resetAIProvider(): void {
    cached = null;
}

export type { AIProvider };
