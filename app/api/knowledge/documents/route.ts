import { badRequest, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { ExtractionError, extractFromUrl } from '@/lib/knowledge/extract';
import { ingestDocument } from '@/lib/knowledge/ingest';
import { knowledgeTextSchema, knowledgeUrlSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
    const ctx = await requirePermission('knowledge:read');
    const documents = await prisma.knowledgeDocument.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, title: true, type: true, status: true, chunkCount: true,
            sourceUrl: true, error: true, createdAt: true,
        },
    });
    return ok({ documents });
});

export const POST = route(async (request: Request) => {
    const ctx = await requirePermission('knowledge:write');
    const url = new URL(request.url);
    const kind = url.searchParams.get('kind') ?? 'text';

    if (kind === 'text') {
        const input = await parseJson(request, knowledgeTextSchema);
        const document = await ingestDocument(ctx, { title: input.title, type: 'TEXT', content: input.content });
        return ok({ document }, 201);
    }

    if (kind === 'url') {
        const input = await parseJson(request, knowledgeUrlSchema);
        try {
            const content = await extractFromUrl(input.url);
            const document = await ingestDocument(ctx, {
                title: input.title?.trim() || new URL(input.url).hostname,
                type: 'URL',
                content,
                sourceUrl: input.url,
            });
            return ok({ document }, 201);
        } catch (error) {
            if (error instanceof ExtractionError) throw badRequest(error.message);
            throw error;
        }
    }

    throw badRequest('Unsupported knowledge source.');
});
