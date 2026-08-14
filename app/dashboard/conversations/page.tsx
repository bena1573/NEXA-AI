import type { Metadata } from 'next';
import Link from 'next/link';
import type { Channel, ConversationStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { cn, relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Inbox' };

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'escalated', label: 'Needs a human' },
    { key: 'resolved', label: 'Resolved' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const STATUS_WHERE: Record<FilterKey, { status?: ConversationStatus }> = {
    all: {},
    open: { status: 'OPEN' },
    escalated: { status: 'ESCALATED' },
    resolved: { status: 'RESOLVED' },
};

const CHANNEL_TONE: Record<Channel, 'primary' | 'accent' | 'neutral'> = {
    CHAT: 'primary',
    VOICE: 'accent',
    EMAIL: 'neutral',
};

export default async function ConversationsPage({
    searchParams,
}: {
    searchParams: Promise<{ filter?: string }>;
}) {
    const ctx = await requirePermission('conversation:read');
    const { filter } = await searchParams;
    const active: FilterKey = FILTERS.some(entry => entry.key === filter) ? (filter as FilterKey) : 'all';

    const conversations = await prisma.conversation.findMany({
        where: { businessId: ctx.businessId, ...STATUS_WHERE[active] },
        orderBy: { startedAt: 'desc' },
        take: 50,
        select: {
            id: true,
            channel: true,
            status: true,
            handler: true,
            intent: true,
            startedAt: true,
            customer: { select: { name: true, email: true, phone: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } },
        },
    });

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold">Inbox</h1>
                <p className="text-sm text-muted">Every chat and call your agent handled, and the ones it handed over.</p>
            </header>

            <nav aria-label="Filter conversations" className="flex flex-wrap gap-2">
                {FILTERS.map(entry => (
                    <Link
                        key={entry.key}
                        href={entry.key === 'all' ? '/dashboard/conversations' : `/dashboard/conversations?filter=${entry.key}`}
                        aria-current={active === entry.key ? 'page' : undefined}
                        className={cn(
                            'rounded-md px-3 py-1.5 text-sm transition',
                            active === entry.key ? 'bg-primary/15 text-foreground' : 'text-muted hover:text-foreground',
                        )}
                    >
                        {entry.label}
                    </Link>
                ))}
            </nav>

            <Card>
                <CardBody>
                    {conversations.length === 0
                        ? (
                            <EmptyState
                                title="Nothing here yet"
                                description="Conversations appear as soon as a customer uses your widget or calls your number."
                            />
                        )
                        : (
                            <ul className="divide-y divide-border">
                                {conversations.map(conversation => (
                                    <li key={conversation.id}>
                                        <Link
                                            href={`/dashboard/conversations/${conversation.id}`}
                                            className="flex flex-wrap items-center justify-between gap-3 py-3 transition hover:text-primary"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {conversation.customer?.name
                                                        ?? conversation.customer?.email
                                                        ?? conversation.customer?.phone
                                                        ?? 'Anonymous visitor'}
                                                </p>
                                                <p className="truncate text-xs text-muted">
                                                    {conversation.messages[0]?.content ?? 'No messages yet'}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
                                                <Badge tone={CHANNEL_TONE[conversation.channel]}>
                                                    {conversation.channel.toLowerCase()}
                                                </Badge>
                                                <Badge tone={conversation.status === 'ESCALATED' ? 'warning' : 'neutral'}>
                                                    {conversation.status.toLowerCase()}
                                                </Badge>
                                                {relativeTime(conversation.startedAt)}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                </CardBody>
            </Card>
        </div>
    );
}
