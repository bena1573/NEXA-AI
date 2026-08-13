import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { formatDateTime, relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Customer' };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
    const ctx = await requirePermission('customer:read');
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
        where: { id, businessId: ctx.businessId },
        include: {
            conversations: {
                orderBy: { startedAt: 'desc' },
                take: 20,
                select: { id: true, channel: true, status: true, startedAt: true, intent: true },
            },
            appointments: {
                orderBy: { startsAt: 'desc' },
                take: 20,
                select: { id: true, startsAt: true, status: true, service: { select: { name: true } } },
            },
            tickets: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { id: true, subject: true, status: true, priority: true },
            },
        },
    });
    if (!customer) notFound();

    return (
        <div className="space-y-6">
            <Link href="/dashboard/customers" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
                <ArrowLeft aria-hidden className="h-4 w-4" />
                Back to customers
            </Link>

            <header className="space-y-1">
                <h1 className="text-xl font-semibold">
                    {customer.name ?? customer.email ?? customer.phone ?? 'Unnamed customer'}
                </h1>
                <p className="text-sm text-muted">
                    {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'No contact details'}
                </p>
                <Badge tone="neutral">{customer.status.toLowerCase().replace(/_/g, ' ')}</Badge>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Conversations</CardTitle></CardHeader>
                    <CardBody>
                        {customer.conversations.length === 0
                            ? <EmptyState title="No conversations" description="Nothing has been discussed with this customer yet." />
                            : (
                                <ul className="divide-y divide-border">
                                    {customer.conversations.map(conversation => (
                                        <li key={conversation.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                            <Link href={`/dashboard/conversations/${conversation.id}`} className="hover:text-primary">
                                                {conversation.intent ?? conversation.channel.toLowerCase()}
                                            </Link>
                                            <span className="text-xs text-muted">{relativeTime(conversation.startedAt)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Appointments</CardTitle></CardHeader>
                    <CardBody>
                        {customer.appointments.length === 0
                            ? <EmptyState title="No appointments" description="Bookings for this customer will appear here." />
                            : (
                                <ul className="divide-y divide-border">
                                    {customer.appointments.map(appointment => (
                                        <li key={appointment.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                            <span>{appointment.service.name}</span>
                                            <span className="text-xs text-muted">
                                                {formatDateTime(appointment.startsAt)} · {appointment.status.toLowerCase()}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Tickets</CardTitle></CardHeader>
                    <CardBody>
                        {customer.tickets.length === 0
                            ? <EmptyState title="No tickets" description="Escalations for this customer will appear here." />
                            : (
                                <ul className="divide-y divide-border">
                                    {customer.tickets.map(ticket => (
                                        <li key={ticket.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                            <span>{ticket.subject}</span>
                                            <Badge tone={ticket.status === 'OPEN' ? 'warning' : 'neutral'}>
                                                {ticket.status.toLowerCase().replace(/_/g, ' ')}
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                    <CardBody>
                        <p className="whitespace-pre-wrap text-sm text-muted">
                            {customer.notes ?? 'No notes yet.'}
                        </p>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
