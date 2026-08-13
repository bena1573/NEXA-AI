import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ConversationThread } from '@/components/conversations/thread';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { requirePermission } from '@/lib/auth/context';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { durationLabel, formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Conversation' };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
    const ctx = await requirePermission('conversation:read');
    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
        where: { id, businessId: ctx.businessId },
        include: {
            customer: true,
            call: true,
            messages: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!conversation) notFound();

    return (
        <div className="space-y-6">
            <Link href="/dashboard/conversations" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
                <ArrowLeft aria-hidden className="h-4 w-4" />
                Back to inbox
            </Link>

            <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
                <ConversationThread
                    conversationId={conversation.id}
                    status={conversation.status}
                    handler={conversation.handler}
                    messages={conversation.messages.map(message => ({
                        id: message.id,
                        role: message.role,
                        content: message.content,
                        confidence: message.confidence,
                        createdAt: message.createdAt.toISOString(),
                    }))}
                    canReply={can(ctx.role, 'conversation:reply')}
                    canManage={can(ctx.role, 'conversation:assign')}
                />

                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                        <CardBody className="space-y-2 text-sm">
                            <Detail label="Channel" value={conversation.channel.toLowerCase()} />
                            <Detail label="Started" value={formatDateTime(conversation.startedAt)} />
                            <Detail label="Intent" value={conversation.intent ?? 'Not classified'} />
                            <Detail label="Sentiment" value={conversation.sentiment?.toLowerCase() ?? 'unknown'} />
                            <Detail
                                label="Escalation"
                                value={conversation.escalationReason
                                    ? conversation.escalationReason.replace(/_/g, ' ').toLowerCase()
                                    : 'none'}
                            />
                            {conversation.call && (
                                <>
                                    <Detail label="Call duration" value={durationLabel(conversation.call.durationSec)} />
                                    <Detail label="Provider" value={conversation.call.provider} />
                                </>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
                        <CardBody className="space-y-2 text-sm">
                            {conversation.customer
                                ? (
                                    <>
                                        <Detail label="Name" value={conversation.customer.name ?? 'Unknown'} />
                                        <Detail label="Email" value={conversation.customer.email ?? '—'} />
                                        <Detail label="Phone" value={conversation.customer.phone ?? '—'} />
                                        <Badge tone="neutral">{conversation.customer.status.toLowerCase()}</Badge>
                                        <Link
                                            href={`/dashboard/customers/${conversation.customer.id}`}
                                            className="block text-primary hover:underline"
                                        >
                                            Open customer record
                                        </Link>
                                    </>
                                )
                                : <p className="text-muted">No contact details were shared.</p>}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
            <span className="text-right capitalize">{value}</span>
        </div>
    );
}
