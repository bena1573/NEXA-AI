import type { Metadata } from 'next';
import type { UsageMetric } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requirePermission } from '@/lib/auth/context';
import { formatPrice, PLAN_ORDER, PLANS } from '@/lib/billing/plans';
import { usageSummary } from '@/lib/billing/usage';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Billing & usage' };

const METRIC_LABELS: Record<UsageMetric, string> = {
    CONVERSATIONS: 'Conversations this month',
    VOICE_MINUTES: 'Voice minutes this month',
    AI_TOKENS: 'AI tokens this month',
    KNOWLEDGE_DOCUMENTS: 'Knowledge documents',
    TEAM_MEMBERS: 'Team members',
};

export default async function BillingSettingsPage() {
    const ctx = await requirePermission('billing:read');

    const subscription = await prisma.subscription.findUnique({ where: { businessId: ctx.businessId } });
    const plan = subscription?.plan ?? 'STARTER';
    const usage = await usageSummary(ctx.businessId, plan);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Current plan</CardTitle>
                        <CardDescription>
                            No payment provider is connected, so nothing here charges a card.
                        </CardDescription>
                    </div>
                    <Badge tone="accent">Billing not live</Badge>
                </CardHeader>
                <CardBody className="flex flex-wrap items-baseline gap-3">
                    <p className="text-2xl font-semibold">{PLANS[plan].name}</p>
                    <p className="text-sm text-muted">
                        {formatPrice(PLANS[plan].priceCents)}/month · status {(subscription?.status ?? 'TRIALING').toLowerCase()}
                    </p>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Usage</CardTitle>
                        <CardDescription>Measured against your plan limits.</CardDescription>
                    </div>
                </CardHeader>
                <CardBody className="space-y-4">
                    {usage.map(entry => (
                        <div key={entry.metric} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span>{METRIC_LABELS[entry.metric]}</span>
                                <span className={entry.exceeded ? 'text-danger' : 'text-muted'}>
                                    {entry.used.toLocaleString()} / {entry.limit.toLocaleString()}
                                </span>
                            </div>
                            <div
                                role="progressbar"
                                aria-label={METRIC_LABELS[entry.metric]}
                                aria-valuenow={Math.round(entry.ratio * 100)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                className="h-2 overflow-hidden rounded-full bg-surface-raised"
                            >
                                <div
                                    className={entry.exceeded ? 'h-full bg-danger' : 'h-full bg-primary'}
                                    style={{ width: `${Math.round(entry.ratio * 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </CardBody>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                {PLAN_ORDER.map(option => (
                    <Card key={option} className={option === plan ? 'border-primary/50' : undefined}>
                        <CardHeader>
                            <div>
                                <CardTitle>{PLANS[option].name}</CardTitle>
                                <CardDescription>{PLANS[option].tagline}</CardDescription>
                            </div>
                            {option === plan && <Badge tone="primary">current</Badge>}
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <p className="text-xl font-semibold">
                                {formatPrice(PLANS[option].priceCents)}
                                <span className="text-sm font-normal text-muted">/month</span>
                            </p>
                            <ul className="space-y-1 text-sm text-muted">
                                {PLANS[option].highlights.map(highlight => (
                                    <li key={highlight}>{highlight}</li>
                                ))}
                            </ul>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </div>
    );
}
