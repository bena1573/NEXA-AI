import { describe, expect, it } from 'vitest';
import { TOOL_NAMES, TOOL_SCHEMAS, TOOL_SPECS, isToolName } from '@/lib/ai/tools/registry';

describe('tool allowlist', () => {
    it('only recognises registered tool names', () => {
        expect(isToolName('create_appointment')).toBe(true);
        expect(isToolName('delete_all_customers')).toBe(false);
        expect(isToolName('')).toBe(false);
    });

    it('publishes exactly one spec per allowlisted tool', () => {
        expect(TOOL_SPECS.map(spec => spec.name).sort()).toEqual([...TOOL_NAMES].sort());
        expect(Object.keys(TOOL_SCHEMAS).sort()).toEqual([...TOOL_NAMES].sort());
    });
});

describe('tool argument validation', () => {
    it('requires a contact detail when looking a customer up', () => {
        expect(TOOL_SCHEMAS.get_customer.safeParse({}).success).toBe(false);
        expect(TOOL_SCHEMAS.get_customer.safeParse({ email: 'a@b.com' }).success).toBe(true);
        expect(TOOL_SCHEMAS.get_customer.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });

    it('requires a name plus a contact detail to create a customer', () => {
        expect(TOOL_SCHEMAS.create_customer.safeParse({ name: 'Dana Ford' }).success).toBe(false);
        expect(TOOL_SCHEMAS.create_customer.safeParse({ name: 'D', phone: '+15551234567' }).success).toBe(false);
        expect(TOOL_SCHEMAS.create_customer.safeParse({ name: 'Dana Ford', phone: '+15551234567' }).success).toBe(true);
    });

    it('rejects availability lookups without an ISO date', () => {
        expect(TOOL_SCHEMAS.check_availability.safeParse({ serviceName: 'Cleaning', date: 'tomorrow' }).success).toBe(false);
        expect(TOOL_SCHEMAS.check_availability.safeParse({ serviceName: 'Cleaning', date: '2026-06-15' }).success).toBe(true);
    });

    it('rejects bookings without a valid slot time or contact detail', () => {
        const valid = {
            serviceName: 'Cleaning',
            startsAt: '2026-06-15T09:00:00Z',
            customerName: 'Dana Ford',
            customerEmail: 'dana@example.com',
        };
        expect(TOOL_SCHEMAS.create_appointment.safeParse(valid).success).toBe(true);
        expect(TOOL_SCHEMAS.create_appointment.safeParse({ ...valid, startsAt: 'next Monday' }).success).toBe(false);
        expect(TOOL_SCHEMAS.create_appointment.safeParse({
            serviceName: 'Cleaning',
            startsAt: '2026-06-15T09:00:00Z',
            customerName: 'Dana Ford',
        }).success).toBe(false);
    });

    it('defaults ticket priority and constrains it to known values', () => {
        const parsed = TOOL_SCHEMAS.create_support_ticket.parse({ subject: 'Broken crown', body: 'It came loose.' });
        expect(parsed.priority).toBe('NORMAL');
        expect(TOOL_SCHEMAS.create_support_ticket.safeParse({
            subject: 'Broken crown', body: 'It came loose.', priority: 'CATASTROPHIC',
        }).success).toBe(false);
    });

    it('constrains escalation reasons to the enum', () => {
        expect(TOOL_SCHEMAS.transfer_to_human.safeParse({ reason: 'ANGRY_CUSTOMER', summary: 'Wants a manager.' }).success).toBe(true);
        expect(TOOL_SCHEMAS.transfer_to_human.safeParse({ reason: 'BECAUSE', summary: 'Wants a manager.' }).success).toBe(false);
    });

    it('strips nothing but rejects an empty knowledge query', () => {
        expect(TOOL_SCHEMAS.search_knowledge_base.safeParse({ query: 'hi' }).success).toBe(false);
        expect(TOOL_SCHEMAS.search_knowledge_base.safeParse({ query: 'do you offer whitening' }).success).toBe(true);
    });

    it('keeps weekday lookups within a week', () => {
        expect(TOOL_SCHEMAS.get_business_hours.safeParse({ weekday: 7 }).success).toBe(false);
        expect(TOOL_SCHEMAS.get_business_hours.safeParse({ weekday: 0 }).success).toBe(true);
        expect(TOOL_SCHEMAS.get_business_hours.safeParse({}).success).toBe(true);
    });
});
