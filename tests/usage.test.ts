import { describe, expect, it } from 'vitest';
import { periodStart, statusOf } from '@/lib/billing/usage';
import { PLANS, limitFor, formatPrice } from '@/lib/billing/plans';

describe('billing period', () => {
    it('normalises any date to the first UTC instant of its month', () => {
        expect(periodStart(new Date('2026-06-15T23:59:59Z')).toISOString()).toBe('2026-06-01T00:00:00.000Z');
        expect(periodStart(new Date('2026-01-01T00:00:00Z')).toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });
});

describe('plan limits', () => {
    it('increases every limit as plans get larger', () => {
        expect(limitFor('STARTER', 'CONVERSATIONS')).toBeLessThan(limitFor('BUSINESS', 'CONVERSATIONS'));
        expect(limitFor('BUSINESS', 'VOICE_MINUTES')).toBeLessThan(limitFor('PRO', 'VOICE_MINUTES'));
    });

    it('formats prices as whole dollars', () => {
        expect(formatPrice(PLANS.STARTER.priceCents)).toBe('$49');
    });
});

describe('usage status', () => {
    it('reports the ratio and flags the limit only once reached', () => {
        const limit = limitFor('STARTER', 'CONVERSATIONS');

        const half = statusOf('STARTER', 'CONVERSATIONS', limit / 2);
        expect(half.ratio).toBeCloseTo(0.5);
        expect(half.exceeded).toBe(false);

        expect(statusOf('STARTER', 'CONVERSATIONS', limit).exceeded).toBe(true);
        expect(statusOf('STARTER', 'CONVERSATIONS', limit * 3).ratio).toBe(1);
    });
});
