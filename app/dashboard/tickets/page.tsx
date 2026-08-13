import type { Metadata } from 'next';
import { TicketList } from '@/components/tickets/ticket-list';
import { requirePermission } from '@/lib/auth/context';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Tickets' };

export default async function TicketsPage() {
    const ctx = await requirePermission('ticket:read');

    const [tickets, members] = await Promise.all([
        prisma.supportTicket.findMany({
            where: { businessId: ctx.businessId },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            take: 100,
            select: {
                id: true, subject: true, body: true, status: true, priority: true, reason: true,
                createdAt: true, conversationId: true, assigneeId: true,
                customer: { select: { name: true, email: true } },
            },
        }),
        prisma.membership.findMany({
            where: { businessId: ctx.businessId },
            select: { userId: true, user: { select: { name: true, email: true } } },
        }),
    ]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold">Tickets</h1>
                <p className="text-sm text-muted">Anything the agent could not finish on its own.</p>
            </header>
            <TicketList
                tickets={tickets.map(ticket => ({ ...ticket, createdAt: ticket.createdAt.toISOString() }))}
                members={members.map(member => ({
                    id: member.userId,
                    label: member.user.name || member.user.email,
                }))}
                canWrite={can(ctx.role, 'ticket:write')}
            />
        </div>
    );
}
