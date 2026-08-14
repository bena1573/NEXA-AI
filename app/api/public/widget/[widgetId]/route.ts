import { notFound, ok, route } from '@/lib/api/http';
import { prisma } from '@/lib/db/client';

type Params = { params: Promise<{ widgetId: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
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
    if (!business) throw notFound('This chat widget is not active.');

    const response = ok({
        businessName: business.name,
        agentName: business.agent?.name ?? 'Alex',
        greeting: business.agent?.greeting ?? 'Hi! How can I help you today?',
        suggestions: business.faqs.map(faq => faq.question),
    });
    response.headers.set('access-control-allow-origin', '*');
    return response;
});
