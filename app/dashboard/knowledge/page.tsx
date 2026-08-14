import type { Metadata } from 'next';
import { KnowledgeManager } from '@/components/knowledge/knowledge-manager';
import { requirePermission } from '@/lib/auth/context';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Knowledge base' };

export default async function KnowledgePage() {
    const ctx = await requirePermission('knowledge:read');

    const [documents, faqs] = await Promise.all([
        prisma.knowledgeDocument.findMany({
            where: { businessId: ctx.businessId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, title: true, type: true, status: true, chunkCount: true,
                sourceUrl: true, error: true, createdAt: true,
            },
        }),
        prisma.fAQ.findMany({
            where: { businessId: ctx.businessId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, question: true, answer: true, approved: true, askedCount: true },
        }),
    ]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold">Knowledge base</h1>
                <p className="text-sm text-muted">
                    Everything your agent is allowed to say. If it is not here, the agent offers a human instead.
                </p>
            </header>
            <KnowledgeManager
                documents={documents.map(document => ({ ...document, createdAt: document.createdAt.toISOString() }))}
                faqs={faqs}
                canWrite={can(ctx.role, 'knowledge:write')}
            />
        </div>
    );
}
