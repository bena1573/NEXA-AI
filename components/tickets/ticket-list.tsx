'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { EscalationReason, TicketPriority, TicketStatus } from '@prisma/client';
import { apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/field';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { relativeTime } from '@/lib/utils';

type Ticket = {
    id: string;
    subject: string;
    body: string;
    status: TicketStatus;
    priority: TicketPriority;
    reason: EscalationReason | null;
    createdAt: string;
    conversationId: string | null;
    assigneeId: string | null;
    customer: { name: string | null; email: string | null } | null;
};

const STATUS_TONE: Record<TicketStatus, 'warning' | 'primary' | 'success' | 'neutral'> = {
    OPEN: 'warning',
    IN_PROGRESS: 'primary',
    RESOLVED: 'success',
    CLOSED: 'neutral',
};

const PRIORITY_TONE: Record<TicketPriority, 'neutral' | 'primary' | 'warning' | 'danger'> = {
    LOW: 'neutral',
    NORMAL: 'primary',
    HIGH: 'warning',
    URGENT: 'danger',
};

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export function TicketList({
    tickets,
    members,
    canWrite,
}: {
    tickets: Ticket[];
    members: { id: string; label: string }[];
    canWrite: boolean;
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function update(id: string, body: Record<string, string | null>) {
        setPending(true);
        setError(null);
        const { error: failure } = await apiRequest(`/api/tickets/${id}`, { method: 'PATCH', body });
        setPending(false);

        if (failure) {
            setError(failure.message);
            return;
        }
        router.refresh();
    }

    return (
        <Card>
            <CardHeader><CardTitle>{tickets.length} tickets</CardTitle></CardHeader>
            <CardBody className="space-y-4">
                {error && <ErrorState message={error} />}
                {tickets.length === 0
                    ? (
                        <EmptyState
                            title="No tickets"
                            description="Tickets are created when the agent escalates or a customer asks for a human."
                        />
                    )
                    : (
                        <ul className="divide-y divide-border">
                            {tickets.map(ticket => (
                                <li key={ticket.id} className="space-y-2 py-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-medium">{ticket.subject}</p>
                                            <p className="text-xs text-muted">
                                                {ticket.customer?.name ?? ticket.customer?.email ?? 'Unknown customer'}
                                                {' · '}{relativeTime(ticket.createdAt)}
                                                {ticket.reason ? ` · ${ticket.reason.replace(/_/g, ' ').toLowerCase()}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority.toLowerCase()}</Badge>
                                            <Badge tone={STATUS_TONE[ticket.status]}>
                                                {ticket.status.toLowerCase().replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted">{ticket.body}</p>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {ticket.conversationId && (
                                            <Link
                                                href={`/dashboard/conversations/${ticket.conversationId}`}
                                                className="text-sm text-primary hover:underline"
                                            >
                                                Open conversation
                                            </Link>
                                        )}
                                        {canWrite && (
                                            <>
                                                <Select
                                                    aria-label={`Status for ${ticket.subject}`}
                                                    className="h-9 w-auto"
                                                    value={ticket.status}
                                                    disabled={pending}
                                                    onChange={event => void update(ticket.id, { status: event.target.value })}
                                                >
                                                    {STATUSES.map(status => (
                                                        <option key={status} value={status}>
                                                            {status.toLowerCase().replace(/_/g, ' ')}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <Select
                                                    aria-label={`Assignee for ${ticket.subject}`}
                                                    className="h-9 w-auto"
                                                    value={ticket.assigneeId ?? ''}
                                                    disabled={pending}
                                                    onChange={event => void update(ticket.id, {
                                                        assigneeId: event.target.value || null,
                                                    })}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {members.map(member => (
                                                        <option key={member.id} value={member.id}>{member.label}</option>
                                                    ))}
                                                </Select>
                                            </>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
            </CardBody>
        </Card>
    );
}
