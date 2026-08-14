import { describe, expect, it } from 'vitest';
import { assertCan, findOwned, scope, type BusinessContext } from '@/lib/db/tenant';
import { ApiError } from '@/lib/api/http';

const ctx: BusinessContext = {
    businessId: '11111111-1111-1111-1111-111111111111',
    userId: '22222222-2222-2222-2222-222222222222',
    role: 'AGENT',
};

describe('scope', () => {
    it('always adds the tenant predicate and cannot be overridden by caller input', () => {
        expect(scope(ctx)).toEqual({ businessId: ctx.businessId });
        expect(scope(ctx, { businessId: 'someone-else', status: 'OPEN' })).toEqual({
            businessId: ctx.businessId,
            status: 'OPEN',
        });
    });
});

describe('assertCan', () => {
    it('passes for permitted actions and throws FORBIDDEN otherwise', () => {
        expect(() => assertCan(ctx, 'conversation:reply')).not.toThrow();

        try {
            assertCan(ctx, 'billing:manage');
            throw new Error('expected assertCan to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError);
            expect((error as ApiError).code).toBe('FORBIDDEN');
        }
    });
});

describe('findOwned', () => {
    it('returns records owned by the tenant', async () => {
        const record = { id: 'a', businessId: ctx.businessId };
        await expect(findOwned(ctx, async () => record, 'a')).resolves.toBe(record);
    });

    it('reports foreign records as not found so ids cannot be probed', async () => {
        const foreign = { id: 'b', businessId: '33333333-3333-3333-3333-333333333333' };

        await expect(findOwned(ctx, async () => foreign, 'b')).rejects.toMatchObject({ code: 'NOT_FOUND' });
        await expect(findOwned(ctx, async () => null, 'c')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
});
