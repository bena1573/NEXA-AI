import { describe, expect, it } from 'vitest';
import { can, type Action } from '@/lib/auth/permissions';

describe('role permissions', () => {
    it('gives viewers read-only access', () => {
        expect(can('VIEWER', 'conversation:read')).toBe(true);
        expect(can('VIEWER', 'conversation:reply')).toBe(false);
        expect(can('VIEWER', 'customer:write')).toBe(false);
    });

    it('lets agents work conversations but not change the business', () => {
        expect(can('AGENT', 'conversation:reply')).toBe(true);
        expect(can('AGENT', 'appointment:write')).toBe(true);
        expect(can('AGENT', 'business:update')).toBe(false);
        expect(can('AGENT', 'team:manage')).toBe(false);
    });

    it('lets admins configure the workspace but not billing or deletion', () => {
        expect(can('ADMIN', 'knowledge:write')).toBe(true);
        expect(can('ADMIN', 'agent:update')).toBe(true);
        expect(can('ADMIN', 'billing:manage')).toBe(false);
        expect(can('ADMIN', 'business:delete')).toBe(false);
    });

    it('gives owners every admin permission plus billing and deletion', () => {
        const adminActions: Action[] = [
            'conversation:read', 'conversation:reply', 'customer:write', 'knowledge:write',
            'agent:update', 'business:update', 'integration:manage',
        ];
        for (const action of adminActions) {
            expect(can('OWNER', action)).toBe(true);
        }
        expect(can('OWNER', 'billing:manage')).toBe(true);
        expect(can('OWNER', 'business:delete')).toBe(true);
    });

    it('is cumulative: every agent permission is also an admin permission', () => {
        const agentActions: Action[] = ['conversation:reply', 'ticket:write', 'appointment:write'];
        for (const action of agentActions) {
            expect(can('ADMIN', action)).toBe(true);
        }
    });
});
