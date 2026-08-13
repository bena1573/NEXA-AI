import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { retrieveKnowledge } from '@/lib/knowledge/search';
import { availableSlots, isSlotBookable, type OpeningHour } from '@/lib/appointments/availability';
import {
    TOOL_SCHEMAS,
    isToolName,
    type ToolName,
} from '@/lib/ai/tools/registry';

export type ToolContext = {
    businessId: string;
    conversationId: string;
    /** Present once the customer has been identified in this conversation. */
    customerId?: string;
    now?: Date;
};

export type ToolResult = {
    name: string;
    ok: boolean;
    /** Serialised back to the model as the `tool` message content. */
    data: unknown;
    /** Set when the tool changed state the caller must react to. */
    effect?: { kind: 'escalate'; reason: string; summary: string }
        | { kind: 'appointment'; appointmentId: string }
        | { kind: 'customer'; customerId: string }
        | { kind: 'ticket'; ticketId: string };
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Validates and runs one model-requested tool. Every query is scoped by
 * `businessId`, so a tool can never reach another tenant's data even if the model
 * is talked into asking for it.
 */
export async function executeTool(
    ctx: ToolContext,
    call: { name: string; arguments: unknown },
): Promise<ToolResult> {
    if (!isToolName(call.name)) {
        logger.warn('tool_not_allowed', { name: call.name, businessId: ctx.businessId });
        return { name: call.name, ok: false, data: { error: 'This action is not available.' } };
    }

    const parsed = TOOL_SCHEMAS[call.name].safeParse(call.arguments ?? {});
    if (!parsed.success) {
        return {
            name: call.name,
            ok: false,
            data: { error: 'Invalid arguments.', issues: parsed.error.issues.map(issue => issue.message) },
        };
    }

    try {
        return await run(ctx, call.name, parsed.data as Record<string, never>);
    } catch (error) {
        logger.error('tool_failed', { name: call.name, businessId: ctx.businessId, error });
        return { name: call.name, ok: false, data: { error: 'That action could not be completed right now.' } };
    }
}

async function run(ctx: ToolContext, name: ToolName, args: Record<string, never>): Promise<ToolResult> {
    const now = ctx.now ?? new Date();

    switch (name) {
        case 'get_business_hours': {
            const weekday = args.weekday as number | undefined;
            const hours = await prisma.businessHour.findMany({
                where: { businessId: ctx.businessId, ...(weekday === undefined ? {} : { weekday }) },
                orderBy: { weekday: 'asc' },
            });
            return ok(name, {
                hours: hours.map(hour => ({
                    day: DAY_NAMES[hour.weekday],
                    closed: hour.closed,
                    opensAt: hour.opensAt,
                    closesAt: hour.closesAt,
                })),
            });
        }

        case 'get_service_information': {
            const search = args.name as string | undefined;
            const services = await prisma.service.findMany({
                where: {
                    businessId: ctx.businessId,
                    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
                },
                orderBy: { name: 'asc' },
                take: 25,
            });
            return ok(name, {
                services: services.map(service => ({
                    name: service.name,
                    description: service.description,
                    durationMinutes: service.durationMin,
                    price: service.priceCents === null
                        ? null
                        : `${(service.priceCents / 100).toFixed(2)} ${service.currency}`,
                    bookable: service.bookable,
                })),
            });
        }

        case 'search_knowledge_base': {
            const snippets = await retrieveKnowledge(ctx.businessId, args.query as string, 4);
            return ok(name, {
                results: snippets.map(snippet => ({ source: snippet.source, content: snippet.content })),
            });
        }

        case 'get_customer': {
            const customer = await findCustomer(ctx.businessId, {
                email: args.email as string | undefined,
                phone: args.phone as string | undefined,
            });
            if (!customer) return ok(name, { found: false });
            return {
                name,
                ok: true,
                data: {
                    found: true,
                    customer: { name: customer.name, status: customer.status, since: customer.createdAt },
                },
                effect: { kind: 'customer', customerId: customer.id },
            };
        }

        case 'create_customer': {
            const existing = await findCustomer(ctx.businessId, {
                email: args.email as string | undefined,
                phone: args.phone as string | undefined,
            });
            const customer = existing ?? await prisma.customer.create({
                data: {
                    businessId: ctx.businessId,
                    name: args.name as string,
                    email: (args.email as string | undefined) ?? null,
                    phone: (args.phone as string | undefined) ?? null,
                    status: 'NEW',
                    lastSeenAt: now,
                },
            });
            return {
                name,
                ok: true,
                data: { created: !existing, customer: { name: customer.name } },
                effect: { kind: 'customer', customerId: customer.id },
            };
        }

        case 'check_availability': {
            const service = await findService(ctx.businessId, args.serviceName as string);
            if (!service) return fail(name, 'That service is not offered.');

            const day = new Date(`${args.date as string}T00:00:00.000Z`);
            const slots = availableSlots({
                day,
                hours: await openingHours(ctx.businessId),
                durationMin: service.durationMin,
                busy: await busySlots(ctx.businessId, day),
                now,
            });

            return ok(name, {
                service: service.name,
                date: args.date,
                slots: slots.slice(0, 12).map(slot => slot.startsAt.toISOString()),
            });
        }

        case 'create_appointment': {
            const service = await findService(ctx.businessId, args.serviceName as string);
            if (!service) return fail(name, 'That service is not offered.');
            if (!service.bookable) return fail(name, 'That service cannot be booked online.');

            const startsAt = new Date(args.startsAt as string);
            if (Number.isNaN(startsAt.getTime())) return fail(name, 'That start time is not valid.');

            const bookable = isSlotBookable({
                startsAt,
                hours: await openingHours(ctx.businessId),
                durationMin: service.durationMin,
                busy: await busySlots(ctx.businessId, startsAt),
                now,
            });
            if (!bookable) return fail(name, 'That slot is not available. Offer another time.');

            const customer = await findCustomer(ctx.businessId, {
                email: args.customerEmail as string | undefined,
                phone: args.customerPhone as string | undefined,
            }) ?? await prisma.customer.create({
                data: {
                    businessId: ctx.businessId,
                    name: args.customerName as string,
                    email: (args.customerEmail as string | undefined) ?? null,
                    phone: (args.customerPhone as string | undefined) ?? null,
                    lastSeenAt: now,
                },
            });

            const appointment = await prisma.appointment.create({
                data: {
                    businessId: ctx.businessId,
                    customerId: customer.id,
                    serviceId: service.id,
                    startsAt,
                    endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
                    notes: (args.notes as string | undefined) ?? null,
                    status: 'CONFIRMED',
                    bookedByAI: true,
                },
            });

            await prisma.notification.create({
                data: {
                    businessId: ctx.businessId,
                    kind: 'APPOINTMENT',
                    title: `New booking: ${service.name}`,
                    body: `${customer.name ?? 'A customer'} booked ${service.name} for ${startsAt.toISOString()}.`,
                },
            });

            return {
                name,
                ok: true,
                data: {
                    booked: true,
                    service: service.name,
                    startsAt: appointment.startsAt.toISOString(),
                    durationMinutes: service.durationMin,
                },
                effect: { kind: 'appointment', appointmentId: appointment.id },
            };
        }

        case 'get_order_status': {
            const integration = await prisma.integration.findFirst({
                where: { businessId: ctx.businessId, kind: 'ECOMMERCE', status: 'CONNECTED' },
            });
            if (!integration) {
                // No connected store: never invent an order status.
                return fail(name, 'Order lookup is not connected for this business.');
            }
            return ok(name, {
                unavailable: true,
                provider: integration.provider,
                message: 'Order lookup is connected but returned no data for that reference.',
            });
        }

        case 'create_support_ticket': {
            const ticket = await prisma.supportTicket.create({
                data: {
                    businessId: ctx.businessId,
                    conversationId: ctx.conversationId,
                    customerId: ctx.customerId ?? null,
                    subject: args.subject as string,
                    body: args.body as string,
                    priority: (args.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') ?? 'NORMAL',
                },
            });
            return {
                name,
                ok: true,
                data: { created: true, reference: ticket.id.slice(0, 8).toUpperCase() },
                effect: { kind: 'ticket', ticketId: ticket.id },
            };
        }

        case 'transfer_to_human': {
            const reason = args.reason as string;
            const summary = args.summary as string;

            await prisma.conversation.update({
                where: { id: ctx.conversationId },
                data: {
                    status: 'ESCALATED',
                    handler: 'HUMAN',
                    escalated: true,
                    escalationReason: reason as never,
                    summary,
                },
            });
            await prisma.notification.create({
                data: {
                    businessId: ctx.businessId,
                    kind: 'ESCALATION',
                    title: 'Conversation escalated to a human',
                    body: summary,
                },
            });

            return {
                name,
                ok: true,
                data: { transferred: true },
                effect: { kind: 'escalate', reason, summary },
            };
        }
    }
}

function ok(name: ToolName, data: unknown): ToolResult {
    return { name, ok: true, data };
}

function fail(name: ToolName, message: string): ToolResult {
    return { name, ok: false, data: { error: message } };
}

function findCustomer(businessId: string, by: { email?: string; phone?: string }) {
    const or = [
        ...(by.email ? [{ email: by.email }] : []),
        ...(by.phone ? [{ phone: by.phone }] : []),
    ];
    if (or.length === 0) return Promise.resolve(null);

    return prisma.customer.findFirst({ where: { businessId, OR: or } });
}

function findService(businessId: string, name: string) {
    return prisma.service.findFirst({
        where: { businessId, name: { equals: name, mode: 'insensitive' } },
    }).then(service => service ?? prisma.service.findFirst({
        where: { businessId, name: { contains: name, mode: 'insensitive' } },
    }));
}

async function openingHours(businessId: string): Promise<OpeningHour[]> {
    const hours = await prisma.businessHour.findMany({ where: { businessId } });
    return hours.map(hour => ({
        weekday: hour.weekday,
        opensAt: hour.opensAt,
        closesAt: hour.closesAt,
        closed: hour.closed,
    }));
}

async function busySlots(businessId: string, day: Date) {
    const from = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
    const to = new Date(from.getTime() + 24 * 60 * 60_000);

    const appointments = await prisma.appointment.findMany({
        where: {
            businessId,
            status: { in: ['REQUESTED', 'CONFIRMED'] },
            startsAt: { gte: from, lt: to },
        },
        select: { startsAt: true, endsAt: true },
    });
    return appointments;
}
