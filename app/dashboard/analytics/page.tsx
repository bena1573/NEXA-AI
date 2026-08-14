import type { Metadata } from 'next';
import Link from 'next/link';
import { ChannelSplit, ConversationTrend, IntentBars } from '@/components/analytics/charts';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { requirePermission } from '@/lib/auth/context';
import {
    channelSplit,
    dailySeries,
    overviewFor,
    rangeFrom,
    topIntents,
    unansweredQuestions,
} from '@/lib/analytics/metrics';
import { buildInsights } from '@/lib/analytics/insights';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Analytics' };

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

function parseRange(value: string | undefined): Range {
    const days = Number(value);
    return RANGES.find(range => range === days) ?? 30;
}

const TONE: Record<'positive' | 'attention' | 'neutral', 'success' | 'warning' | 'neutral'> = {
    positive: 'success',
    attention: 'warning',
    neutral: 'neutral',
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
    const ctx = await requirePermission('analytics:read');
    const { range } = await searchParams;
    const days = parseRange(range);
    const since = rangeFrom(days);

    const [overview, series, channels, intents, unanswered, knowledgeDocuments, approvedFaqs] = await Promise.all([
        overviewFor(ctx.businessId, since),
        dailySeries(ctx.businessId, since),
        channelSplit(ctx.businessId, since),
        topIntents(ctx.businessId, since),
        unansweredQuestions(ctx.businessId, since),
        prisma.knowledgeDocument.count({ where: { businessId: ctx.businessId } }),
        prisma.fAQ.count({ where: { businessId: ctx.businessId, approved: true } }),
    ]);

    const insights = buildInsights({
        overview,
        series,
        topIntents: intents,
        unanswered,
        knowledgeDocuments,
        approvedFaqs,
    });

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold">Analytics</h1>
                    <p className="text-sm text-muted">How your agent is performing over the last {days} days.</p>
                </div>
                <nav aria-label="Date range" className="flex gap-1 rounded-md border border-border p-1">
                    {RANGES.map(option => (
                        <Link
                            key={option}
                            href={`/dashboard/analytics?range=${option}`}
                            aria-current={option === days ? 'page' : undefined}
                            className={option === days
                                ? 'rounded px-3 py-1 text-sm bg-primary/15 text-primary'
                                : 'rounded px-3 py-1 text-sm text-muted hover:text-foreground'}
                        >
                            {option}d
                        </Link>
                    ))}
                </nav>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Conversations" value={String(overview.conversations)} />
                <StatCard
                    label="Auto-resolved"
                    value={`${Math.round(overview.resolvedRate * 100)}%`}
                    hint={`${overview.escalations} escalated to a human`}
                />
                <StatCard label="Appointments" value={String(overview.appointments)} />
                <StatCard label="Voice minutes" value={String(overview.voiceMinutes)} hint="Includes simulated calls" />
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Conversation volume</CardTitle>
                        <CardDescription>Daily conversations, resolutions and escalations.</CardDescription>
                    </div>
                </CardHeader>
                <CardBody>
                    <ConversationTrend data={series} />
                </CardBody>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Channels</CardTitle></CardHeader>
                    <CardBody>
                        {channels.length === 0
                            ? <EmptyState title="No channel data" description="Chat and voice conversations will be split here." />
                            : <ChannelSplit data={channels} />}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Top requests</CardTitle></CardHeader>
                    <CardBody>
                        {intents.length === 0
                            ? <EmptyState title="No intents yet" description="Intents are detected automatically as conversations happen." />
                            : <IntentBars data={intents} />}
                    </CardBody>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Insights</CardTitle>
                            <CardDescription>Derived from your own conversation data — no guesswork.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <ul className="space-y-3">
                            {insights.map(insight => (
                                <li key={insight.id} className="space-y-1 rounded-md border border-border p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-medium">{insight.title}</p>
                                        <Badge tone={TONE[insight.tone]}>{insight.tone}</Badge>
                                    </div>
                                    <p className="text-sm text-muted">{insight.detail}</p>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Knowledge gaps</CardTitle>
                            <CardDescription>Questions your agent could not answer from approved sources.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardBody>
                        {unanswered.length === 0
                            ? <EmptyState title="No gaps found" description="Every question in this period was answered or resolved." />
                            : (
                                <ul className="divide-y divide-border">
                                    {unanswered.map(item => (
                                        <li key={item.conversationId} className="py-2 text-sm">
                                            <Link
                                                href={`/dashboard/conversations/${item.conversationId}`}
                                                className="hover:text-primary"
                                            >
                                                {item.question.slice(0, 160)}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
