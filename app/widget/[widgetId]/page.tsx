import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChatPanel } from '@/components/chat/chat-panel';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Chat', robots: { index: false, follow: false } };

export default async function WidgetPage({ params }: { params: Promise<{ widgetId: string }> }) {
    const { widgetId } = await params;

    const business = await prisma.business.findUnique({
        where: { publicWidgetId: widgetId },
        select: {
            name: true,
            agent: { select: { name: true, greeting: true } },
            faqs: {
                where: { approved: true },
                orderBy: { askedCount: 'desc' },
                take: 4,
                select: { question: true },
            },
        },
    });
    if (!business) notFound();

    return (
        <main className="h-dvh bg-surface">
            <ChatPanel
                widgetId={widgetId}
                config={{
                    businessName: business.name,
                    agentName: business.agent?.name ?? 'Alex',
                    greeting: business.agent?.greeting ?? 'Hi! How can I help you today?',
                    suggestions: business.faqs.map(faq => faq.question),
                }}
            />
        </main>
    );
}
