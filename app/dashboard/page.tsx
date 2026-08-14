import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, MessageSquare, PhoneCall, ShieldAlert } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { requireContext } from '@/lib/auth/context';
import { overviewFor, rangeFrom } from '@/lib/analytics/metrics';
import { prisma } from '@/lib/db/client';
import { relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard' };

const CHANNEL_TONE = { CHAT: 'primary', VOICE: 'accent', EMAIL: 'neutral' } as const;

export default async function DashboardPage() {
    const ctx = await requireContext();
    const since = rangeFrom(30);

    const [overview, conversations, documents] = await Promise.all([
        overviewFor(ctx.businessId, since),
        prisma.conversation.findMany({
            where: { businessId: ctx.businessId },
            orderBy: { startedAt: 'desc' },
            take: 6,
            select: {
                id: true,
                channel: true,
                status: true,
                intent: true,
                startedAt: true,
                customer: { select: { name: true, email: true } },
            },
        }),
        prisma.knowledgeDocument.count({ where: { businessId: ctx.businessId } }),
    ]);

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">Last 30 days</h1>
                    <p className="text-sm text-muted">How your AI agent is handling customer contact.</p>
                </div>
                <Button asChild variant="secondary">
                    <Link href="/dashboard/calls">Open call simulator</Link>
                </Button>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Conversations"
                    value={String(overview.conversations)}
                    hint={`${overview.customers} customers on record`}
                    icon={<MessageSquare aria-hidden className="h-4 w-4" />}
                />
                <StatCard
                    label="Resolved by AI"
                    value={`${Math.round(overview.resolvedRate * 100)}%`}
                    hint={`${overview.escalations} escalated to a human`}
                    icon={<ShieldAlert aria-hidden className="h-4 w-4" />}
                />
                <StatCard
                    label="Appointments"
                    value={String(overview.appointments)}
                    hint="Booked in this period"
                    icon={<CalendarCheck aria-hidden className="h-4 w-4" />}
                />
                <StatCard
                    label="Voice minutes"
                    value={String(overview.voiceMinutes)}
                    hint={`${overview.openTickets} open tickets`}
                    icon={<PhoneCall aria-hidden className="h-4 w-4" />}
                />
            </div>

            {documents === 0 && (
                <Card>
                    <CardBody className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="font-medium">Your agent has no documents yet</p>
                            <p className="text-sm text-muted">
                                It can only answer from your profile and FAQs until you upload your own material.
                            </p>
                        </div>
                        <Button asChild>
                            <Link href="/dashboard/knowledge">Add knowledge</Link>
                        </Button>
                    </CardBody>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Recent conversations</CardTitle>
                    <Link href="/dashboard/conversations" className="text-sm text-primary hover:underline">
                        View inbox
                    </Link>
                </CardHeader>
                <CardBody>
                    {conversations.length === 0
                        ? (
                            <EmptyState
                                title="No conversations yet"
                                description="Start a simulated call or open your chat widget to see conversations appear here."
                                action={<Button asChild variant="secondary"><Link href="/dashboard/calls">Simulate a call</Link></Button>}
                            />
                        )
                        : (
                            <ul className="divide-y divide-border">
                                {conversations.map(conversation => (
                                    <li key={conversation.id} className="flex items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <Link
                                                href={`/dashboard/conversations/${conversation.id}`}
                                                className="truncate font-medium hover:text-primary"
                                            >
                                                {conversation.customer?.name
                                                    ?? conversation.customer?.email
                                                    ?? 'Anonymous visitor'}
                                            </Link>
                                            <p className="truncate text-xs text-muted">
                                                {conversation.intent ?? 'Intent not classified'} · {relativeTime(conversation.startedAt)}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Badge tone={CHANNEL_TONE[conversation.channel]}>
                                                {conversation.channel.toLowerCase()}
                                            </Badge>
                                            <Badge tone={conversation.status === 'ESCALATED' ? 'warning' : 'neutral'}>
                                                {conversation.status.toLowerCase()}
                                            </Badge>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                </CardBody>
            </Card>
        </div>
    );
}
