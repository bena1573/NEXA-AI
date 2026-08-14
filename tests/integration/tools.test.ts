import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/client';
import { executeTool } from '@/lib/ai/tools/execute';
import { createWorkspace, destroyWorkspace, nextWeekdayAt, type Workspace } from './helpers';

let clinic: Workspace;
let rival: Workspace;

beforeAll(async () => {
    clinic = await createWorkspace('tools-clinic');
    rival = await createWorkspace('tools-rival');

    await prisma.service.createMany({
        data: [
            { businessId: clinic.businessId, name: 'Check-up', durationMin: 30, priceCents: 6500 },
            { businessId: clinic.businessId, name: 'Whitening', durationMin: 60, bookable: false },
            { businessId: rival.businessId, name: 'Rival service', durationMin: 30 },
        ],
    });
}, 60_000);

afterAll(async () => {
    await destroyWorkspace(clinic);
    await destroyWorkspace(rival);
});

function ctx(workspace: Workspace) {
    return { businessId: workspace.businessId, conversationId: workspace.conversationId };
}

describe('tool allowlist', () => {
    it('rejects unknown tool names and invalid arguments', async () => {
        const unknown = await executeTool(ctx(clinic), { name: 'drop_database', arguments: {} });
        expect(unknown.ok).toBe(false);

        const invalid = await executeTool(ctx(clinic), { name: 'get_customer', arguments: {} });
        expect(invalid.ok).toBe(false);
    });
});

describe('get_service_information', () => {
    it('only returns services belonging to the calling tenant', async () => {
        const own = await executeTool(ctx(clinic), { name: 'get_service_information', arguments: {} });
        const names = (own.data as { services: { name: string }[] }).services.map(service => service.name);
        expect(names).toContain('Check-up');
        expect(names).not.toContain('Rival service');
    });
});

describe('create_appointment', () => {
    it('books inside opening hours, then refuses the same slot and closed days', async () => {
        const monday = nextWeekdayAt(1, 10);

        const booked = await executeTool(ctx(clinic), {
            name: 'create_appointment',
            arguments: {
                serviceName: 'Check-up',
                startsAt: monday.toISOString(),
                customerName: 'Priya Shah',
                customerEmail: 'priya@test.invalid',
            },
        });
        expect(booked.ok).toBe(true);
        expect(booked.effect).toMatchObject({ kind: 'appointment' });

        const appointment = await prisma.appointment.findFirstOrThrow({
            where: { businessId: clinic.businessId },
        });
        expect(appointment.bookedByAI).toBe(true);
        expect(appointment.endsAt.getTime() - appointment.startsAt.getTime()).toBe(30 * 60_000);

        const clash = await executeTool(ctx(clinic), {
            name: 'create_appointment',
            arguments: {
                serviceName: 'Check-up',
                startsAt: monday.toISOString(),
                customerName: 'Tom Baker',
                customerEmail: 'tom@test.invalid',
            },
        });
        expect(clash.ok).toBe(false);

        const sunday = nextWeekdayAt(0, 10);
        const closed = await executeTool(ctx(clinic), {
            name: 'create_appointment',
            arguments: {
                serviceName: 'Check-up',
                startsAt: sunday.toISOString(),
                customerName: 'Lena Fischer',
                customerEmail: 'lena@test.invalid',
            },
        });
        expect(closed.ok).toBe(false);
    });

    it('refuses services that are not bookable online', async () => {
        const result = await executeTool(ctx(clinic), {
            name: 'create_appointment',
            arguments: {
                serviceName: 'Whitening',
                startsAt: nextWeekdayAt(2, 11).toISOString(),
                customerName: 'Sam Okafor',
                customerPhone: '+447700900444',
            },
        });
        expect(result.ok).toBe(false);
    });

    it('cannot book another tenant\'s service', async () => {
        const result = await executeTool(ctx(clinic), {
            name: 'create_appointment',
            arguments: {
                serviceName: 'Rival service',
                startsAt: nextWeekdayAt(3, 11).toISOString(),
                customerName: 'Sam Okafor',
                customerPhone: '+447700900555',
            },
        });
        expect(result.ok).toBe(false);
    });
});

describe('check_availability', () => {
    it('offers slots on open days and none on closed days', async () => {
        const open = await executeTool(ctx(clinic), {
            name: 'check_availability',
            arguments: { serviceName: 'Check-up', date: nextWeekdayAt(2, 9).toISOString().slice(0, 10) },
        });
        expect((open.data as { slots: string[] }).slots.length).toBeGreaterThan(0);

        const closed = await executeTool(ctx(clinic), {
            name: 'check_availability',
            arguments: { serviceName: 'Check-up', date: nextWeekdayAt(0, 9).toISOString().slice(0, 10) },
        });
        expect((closed.data as { slots: string[] }).slots).toHaveLength(0);
    });
});

describe('create_customer', () => {
    it('is idempotent on contact details within the tenant', async () => {
        const args = { name: 'Dana Reid', email: 'dana@test.invalid' };
        const first = await executeTool(ctx(clinic), { name: 'create_customer', arguments: args });
        const second = await executeTool(ctx(clinic), { name: 'create_customer', arguments: args });

        expect((first.data as { created: boolean }).created).toBe(true);
        expect((second.data as { created: boolean }).created).toBe(false);
        expect(await prisma.customer.count({ where: { businessId: clinic.businessId, email: args.email } })).toBe(1);
    });
});

describe('get_order_status', () => {
    it('says lookup is unavailable rather than inventing an order', async () => {
        const result = await executeTool(ctx(clinic), {
            name: 'get_order_status',
            arguments: { orderReference: 'ORD-12345' },
        });
        expect(result.ok).toBe(false);
        expect(JSON.stringify(result.data)).not.toContain('shipped');
    });
});

describe('escalation', () => {
    it('transfer_to_human escalates the conversation and notifies the workspace', async () => {
        const result = await executeTool(ctx(clinic), {
            name: 'transfer_to_human',
            arguments: { reason: 'REFUND_REQUEST', summary: 'Customer wants a refund on a deposit.' },
        });
        expect(result.ok).toBe(true);

        const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: clinic.conversationId } });
        expect(conversation.status).toBe('ESCALATED');
        expect(conversation.handler).toBe('HUMAN');
        expect(conversation.escalationReason).toBe('REFUND_REQUEST');

        const notifications = await prisma.notification.count({
            where: { businessId: clinic.businessId, kind: 'ESCALATION' },
        });
        expect(notifications).toBe(1);
    });

    it('create_support_ticket files a tenant-scoped ticket', async () => {
        const result = await executeTool(ctx(clinic), {
            name: 'create_support_ticket',
            arguments: { subject: 'Crown feels loose', body: 'Needs a clinician to call back.', priority: 'HIGH' },
        });
        expect(result.ok).toBe(true);

        const ticket = await prisma.supportTicket.findFirstOrThrow({ where: { businessId: clinic.businessId } });
        expect(ticket.priority).toBe('HIGH');
        expect(ticket.conversationId).toBe(clinic.conversationId);
    });
});
