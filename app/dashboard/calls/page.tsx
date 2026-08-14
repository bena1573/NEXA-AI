import type { Metadata } from 'next';
import Link from 'next/link';
import { CallSimulator } from '@/components/voice/call-simulator';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { getVoiceProvider } from '@/lib/voice';
import { durationLabel, relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Calls' };

export default async function CallsPage() {
    const ctx = await requirePermission('conversation:read');
    const provider = getVoiceProvider();

    const [agent, calls] = await Promise.all([
        prisma.aIAgent.findUnique({ where: { businessId: ctx.businessId }, select: { name: true } }),
        prisma.call.findMany({
            where: { businessId: ctx.businessId },
            orderBy: { startedAt: 'desc' },
            take: 20,
            select: {
                id: true, conversationId: true, fromNumber: true, status: true,
                durationSec: true, simulated: true, startedAt: true,
            },
        }),
    ]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold">Voice</h1>
                <p className="text-sm text-muted">
                    {provider.canPlaceRealCalls
                        ? `Calls run through ${provider.id}. The simulator stays available for testing.`
                        : 'No telephony credentials are configured, so calls run through the simulator.'}
                </p>
            </header>

            <CallSimulator agentName={agent?.name ?? 'Alex'} />

            <Card>
                <CardHeader><CardTitle>Recent calls</CardTitle></CardHeader>
                <CardBody>
                    {calls.length === 0
                        ? <EmptyState title="No calls yet" description="Start a simulated call above to see it recorded here." />
                        : (
                            <ul className="divide-y divide-border">
                                {calls.map(call => (
                                    <li key={call.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                        <div>
                                            <Link
                                                href={`/dashboard/conversations/${call.conversationId}`}
                                                className="font-medium hover:text-primary"
                                            >
                                                {call.fromNumber ?? 'Unknown caller'}
                                            </Link>
                                            <p className="text-xs text-muted">
                                                {relativeTime(call.startedAt)} · {durationLabel(call.durationSec)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {call.simulated && <Badge tone="warning">simulated</Badge>}
                                            <Badge tone={call.status === 'COMPLETED' ? 'success' : 'neutral'}>
                                                {call.status.toLowerCase().replace(/_/g, ' ')}
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
