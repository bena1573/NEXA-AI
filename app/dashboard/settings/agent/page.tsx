import type { Metadata } from 'next';
import { AgentSettingsForm } from '@/components/settings/agent-form';
import { requirePermission } from '@/lib/auth/context';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'AI agent settings' };

export default async function AgentSettingsPage() {
    const ctx = await requirePermission('agent:read');
    const agent = await prisma.aIAgent.findUnique({ where: { businessId: ctx.businessId } });

    return (
        <AgentSettingsForm
            agent={{
                name: agent?.name ?? 'Alex',
                personality: agent?.personality ?? 'PROFESSIONAL',
                responseStyle: agent?.responseStyle ?? 'BALANCED',
                greeting: agent?.greeting ?? 'Hi! How can I help you today?',
                instructions: agent?.instructions ?? '',
                escalationRules: agent?.escalationRules ?? '',
                handoffEmail: agent?.handoffEmail ?? '',
            }}
            canWrite={can(ctx.role, 'agent:update')}
            demoMode={env.DEMO_MODE}
        />
    );
}
