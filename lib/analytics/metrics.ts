import type { Channel } from '@prisma/client';
import { prisma } from '@/lib/db/client';

export type Overview = {
    conversations: number;
    resolvedRate: number;
    escalations: number;
    appointments: number;
    voiceMinutes: number;
    avgMessagesPerConversation: number;
    openTickets: number;
    customers: number;
};

export function rangeFrom(days: number, now: Date = new Date()): Date {
    return new Date(now.getTime() - days * 86_400_000);
}

export async function overviewFor(businessId: string, since: Date): Promise<Overview> {
    const [conversations, resolved, escalated, appointments, calls, messages, openTickets, customers] =
        await Promise.all([
            prisma.conversation.count({ where: { businessId, startedAt: { gte: since } } }),
            prisma.conversation.count({ where: { businessId, startedAt: { gte: since }, resolved: true } }),
            prisma.conversation.count({ where: { businessId, startedAt: { gte: since }, escalated: true } }),
            prisma.appointment.count({ where: { businessId, createdAt: { gte: since } } }),
            prisma.call.aggregate({
                where: { businessId, startedAt: { gte: since } },
                _sum: { durationSec: true },
            }),
            prisma.message.count({
                where: { conversation: { businessId, startedAt: { gte: since } } },
            }),
            prisma.supportTicket.count({ where: { businessId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
            prisma.customer.count({ where: { businessId } }),
        ]);

    return {
        conversations,
        resolvedRate: conversations === 0 ? 0 : resolved / conversations,
        escalations: escalated,
        appointments,
        voiceMinutes: Math.round((calls._sum.durationSec ?? 0) / 60),
        avgMessagesPerConversation: conversations === 0 ? 0 : messages / conversations,
        openTickets,
        customers,
    };
}

export type DailyPoint = { date: string; conversations: number; resolved: number; escalated: number };

export async function dailySeries(businessId: string, since: Date): Promise<DailyPoint[]> {
    const conversations = await prisma.conversation.findMany({
        where: { businessId, startedAt: { gte: since } },
        select: { startedAt: true, resolved: true, escalated: true },
    });

    const byDay = new Map<string, DailyPoint>();
    for (
        let cursor = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()));
        cursor.getTime() <= Date.now();
        cursor = new Date(cursor.getTime() + 86_400_000)
    ) {
        const key = cursor.toISOString().slice(0, 10);
        byDay.set(key, { date: key, conversations: 0, resolved: 0, escalated: 0 });
    }

    for (const conversation of conversations) {
        const key = conversation.startedAt.toISOString().slice(0, 10);
        const point = byDay.get(key);
        if (!point) continue;
        point.conversations += 1;
        if (conversation.resolved) point.resolved += 1;
        if (conversation.escalated) point.escalated += 1;
    }

    return [...byDay.values()];
}

export async function channelSplit(businessId: string, since: Date): Promise<Array<{ channel: Channel; count: number }>> {
    const rows = await prisma.conversation.groupBy({
        by: ['channel'],
        where: { businessId, startedAt: { gte: since } },
        _count: { _all: true },
    });
    return rows.map(row => ({ channel: row.channel, count: row._count._all }));
}

export async function topIntents(businessId: string, since: Date, limit = 6) {
    const rows = await prisma.conversation.groupBy({
        by: ['intent'],
        where: { businessId, startedAt: { gte: since }, intent: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { intent: 'desc' } },
        take: limit,
    });
    return rows.map(row => ({ intent: row.intent ?? 'UNKNOWN', count: row._count._all }));
}

export async function unansweredQuestions(businessId: string, since: Date, limit = 8) {
    const conversations = await prisma.conversation.findMany({
        where: {
            businessId,
            startedAt: { gte: since },
            OR: [{ escalated: true }, { resolved: false }],
        },
        select: {
            id: true,
            startedAt: true,
            messages: {
                where: { role: 'CUSTOMER' },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { content: true },
            },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
    });

    return conversations
        .filter(conversation => conversation.messages.length > 0)
        .map(conversation => ({
            conversationId: conversation.id,
            question: conversation.messages[0].content,
            askedAt: conversation.startedAt,
        }));
}
