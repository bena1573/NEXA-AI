import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/client';
import { channelSplit, overviewFor, rangeFrom, topIntents } from '@/lib/analytics/metrics';
import { createWorkspace, destroyWorkspace, type Workspace } from './helpers';

let clinic: Workspace;
let rival: Workspace;

beforeAll(async () => {
    clinic = await createWorkspace('analytics-clinic');
    rival = await createWorkspace('analytics-rival');

    await prisma.conversation.createMany({
        data: [
            { businessId: clinic.businessId, channel: 'CHAT', status: 'RESOLVED', resolved: true, intent: 'PRICING' },
            { businessId: clinic.businessId, channel: 'CHAT', status: 'RESOLVED', resolved: true, intent: 'PRICING' },
            {
                businessId: clinic.businessId,
                channel: 'VOICE',
                status: 'ESCALATED',
                escalated: true,
                intent: 'REFUND',
            },
            { businessId: rival.businessId, channel: 'CHAT', status: 'RESOLVED', resolved: true, intent: 'SERVICES' },
        ],
    });
}, 60_000);

afterAll(async () => {
    await destroyWorkspace(clinic);
    await destroyWorkspace(rival);
});

describe('analytics metrics', () => {
    it('counts only the calling tenant\'s conversations', async () => {
        const since = rangeFrom(30);
        const overview = await overviewFor(clinic.businessId, since);

        // The helper seeds one extra conversation per workspace.
        expect(overview.conversations).toBe(4);
        expect(overview.escalations).toBe(1);
        expect(overview.resolvedRate).toBeCloseTo(0.5, 5);
    });

    it('splits channels and ranks intents per tenant', async () => {
        const since = rangeFrom(30);
        const [split, intents] = await Promise.all([
            channelSplit(clinic.businessId, since),
            topIntents(clinic.businessId, since),
        ]);

        expect(split.find(entry => entry.channel === 'VOICE')?.count).toBe(1);
        expect(split.find(entry => entry.channel === 'CHAT')?.count).toBe(3);

        expect(intents[0]?.intent).toBe('PRICING');
        expect(intents.some(entry => entry.intent === 'SERVICES')).toBe(false);
    });

    it('excludes activity outside the requested window', async () => {
        const overview = await overviewFor(clinic.businessId, rangeFrom(0, new Date(Date.now() + 60_000)));
        expect(overview.conversations).toBe(0);
    });
});
