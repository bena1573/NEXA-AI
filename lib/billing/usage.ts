import type { Plan, UsageMetric } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { limitFor } from '@/lib/billing/plans';

/** First instant of the billing month a date falls in (UTC). */
export function periodStart(date: Date = new Date()): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function recordUsage(
    businessId: string,
    metric: UsageMetric,
    quantity: number,
    at: Date = new Date(),
): Promise<void> {
    if (quantity <= 0) return;

    await prisma.usageRecord.create({
        data: { businessId, metric, quantity, period: periodStart(at) },
    });
}

export async function usageFor(
    businessId: string,
    metric: UsageMetric,
    at: Date = new Date(),
): Promise<number> {
    const result = await prisma.usageRecord.aggregate({
        where: { businessId, metric, period: periodStart(at) },
        _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
}

export type UsageStatus = {
    metric: UsageMetric;
    used: number;
    limit: number;
    ratio: number;
    exceeded: boolean;
};

export function statusOf(plan: Plan, metric: UsageMetric, used: number): UsageStatus {
    const limit = limitFor(plan, metric);
    return {
        metric,
        used,
        limit,
        ratio: limit === 0 ? 1 : Math.min(1, used / limit),
        exceeded: used >= limit,
    };
}

export async function usageSummary(businessId: string, plan: Plan): Promise<UsageStatus[]> {
    const metrics: UsageMetric[] = [
        'CONVERSATIONS', 'VOICE_MINUTES', 'AI_TOKENS', 'KNOWLEDGE_DOCUMENTS', 'TEAM_MEMBERS',
    ];

    const period = periodStart();
    const rows = await prisma.usageRecord.groupBy({
        by: ['metric'],
        where: { businessId, period },
        _sum: { quantity: true },
    });

    return metrics.map(metric => statusOf(
        plan,
        metric,
        rows.find(row => row.metric === metric)?._sum.quantity ?? 0,
    ));
}
