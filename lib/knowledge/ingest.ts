import { Prisma, type DocumentType } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { getAIProvider } from '@/lib/ai';
import type { BusinessContext } from '@/lib/db/tenant';
import { chunkText } from '@/lib/knowledge/chunk';
import { toVectorLiteral } from '@/lib/knowledge/vector';
import { logger } from '@/lib/logger';
import { recordUsage } from '@/lib/billing/usage';

export type IngestInput = {
    title: string;
    type: DocumentType;
    content: string;
    sourceUrl?: string;
    fileName?: string;
};

/**
 * Stores a document and its embedded chunks. Extraction happens before this call
 * so failures are attributed to the document (status FAILED + error) instead of
 * bringing the whole request down.
 */
export async function ingestDocument(ctx: BusinessContext, input: IngestInput) {
    const document = await prisma.knowledgeDocument.create({
        data: {
            businessId: ctx.businessId,
            title: input.title,
            type: input.type,
            sourceUrl: input.sourceUrl,
            fileName: input.fileName,
            content: input.content,
            status: 'PROCESSING',
        },
    });

    try {
        const chunkCount = await embedChunks(ctx.businessId, document.id, input.content);
        const ready = await prisma.knowledgeDocument.update({
            where: { id: document.id },
            data: { status: 'READY', chunkCount },
        });
        await recordUsage(ctx.businessId, 'KNOWLEDGE_DOCUMENTS', 1);
        return ready;
    } catch (error) {
        logger.error('knowledge_ingest_failed', error);
        return prisma.knowledgeDocument.update({
            where: { id: document.id },
            data: {
                status: 'FAILED',
                error: error instanceof Error ? error.message : 'Unknown ingestion error',
            },
        });
    }
}

export async function reindexDocument(ctx: BusinessContext, documentId: string) {
    const document = await prisma.knowledgeDocument.findFirst({
        where: { id: documentId, businessId: ctx.businessId },
    });
    if (!document?.content) return null;

    await prisma.knowledgeChunk.deleteMany({ where: { documentId: document.id } });
    const chunkCount = await embedChunks(ctx.businessId, document.id, document.content);

    return prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { status: 'READY', chunkCount, error: null },
    });
}

async function embedChunks(businessId: string, documentId: string, content: string): Promise<number> {
    const ai = getAIProvider();
    const chunks = chunkText(content);

    for (const chunk of chunks) {
        const embedding = await ai.generateEmbedding(chunk.content);
        // Prisma cannot bind a `vector` column, so the insert is raw SQL. Values
        // are still parameterised — no interpolation of user content.
        await prisma.$executeRaw`
            INSERT INTO "KnowledgeChunk" ("id", "businessId", "documentId", "position", "content", "tokens", "embedding", "createdAt")
            VALUES (gen_random_uuid(), ${businessId}::uuid, ${documentId}::uuid, ${chunk.position}, ${chunk.content}, ${chunk.tokens}, ${toVectorLiteral(embedding)}::vector, now())
        `;
    }

    return chunks.length;
}

export async function deleteDocument(ctx: BusinessContext, documentId: string) {
    const result = await prisma.knowledgeDocument.deleteMany({
        where: { id: documentId, businessId: ctx.businessId },
    });
    return result.count > 0;
}

export { Prisma };
