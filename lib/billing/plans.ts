import type { Plan, UsageMetric } from '@prisma/client';

export type PlanLimits = Record<UsageMetric, number>;

export type PlanDefinition = {
    plan: Plan;
    name: string;
    priceCents: number;
    tagline: string;
    highlights: string[];
    limits: PlanLimits;
};

/**
 * Example pricing used by the marketing page and the usage meter. No payment
 * provider is connected, so nothing here charges a card.
 */
export const PLANS: Record<Plan, PlanDefinition> = {
    STARTER: {
        plan: 'STARTER',
        name: 'Starter',
        priceCents: 4900,
        tagline: 'For a single location getting started with AI support.',
        highlights: ['Website chat agent', 'FAQ + document knowledge base', 'Email escalation', '1 seat'],
        limits: {
            CONVERSATIONS: 500,
            VOICE_MINUTES: 60,
            AI_TOKENS: 1_000_000,
            KNOWLEDGE_DOCUMENTS: 25,
            TEAM_MEMBERS: 2,
        },
    },
    BUSINESS: {
        plan: 'BUSINESS',
        name: 'Business',
        priceCents: 14900,
        tagline: 'For growing teams that book appointments and take calls.',
        highlights: ['Voice agent + call simulator', 'Appointment booking', 'Analytics & insights', '5 seats'],
        limits: {
            CONVERSATIONS: 3_000,
            VOICE_MINUTES: 600,
            AI_TOKENS: 8_000_000,
            KNOWLEDGE_DOCUMENTS: 200,
            TEAM_MEMBERS: 5,
        },
    },
    PRO: {
        plan: 'PRO',
        name: 'Pro',
        priceCents: 39900,
        tagline: 'For multi-location operations with custom workflows.',
        highlights: ['Unlimited seats', 'Priority routing', 'Custom tools & integrations', 'Dedicated support'],
        limits: {
            CONVERSATIONS: 20_000,
            VOICE_MINUTES: 5_000,
            AI_TOKENS: 50_000_000,
            KNOWLEDGE_DOCUMENTS: 2_000,
            TEAM_MEMBERS: 100,
        },
    },
};

export const PLAN_ORDER: Plan[] = ['STARTER', 'BUSINESS', 'PRO'];

export function limitFor(plan: Plan, metric: UsageMetric): number {
    return PLANS[plan].limits[metric];
}

export function formatPrice(priceCents: number): string {
    return `$${(priceCents / 100).toFixed(0)}`;
}
