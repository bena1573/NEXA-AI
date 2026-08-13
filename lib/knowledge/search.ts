import { prisma } from '@/lib/db/client';
import { getAIProvider } from '@/lib/ai';
import { keywordOverlap } from '@/lib/ai/text';
import { toVectorLiteral } from '@/lib/knowledge/vector';
import type { KnowledgeSnippet } from '@/lib/ai/prompt';

export type RetrievedSnippet = KnowledgeSnippet & { score: number };

/** Below this cosine score retrieval is treated as "no answer available". */
export const RETRIEVAL_CONFIDENCE_FLOOR = 0.35;

type ChunkRow = { id: string; content: string; title: string; score: number };

/**
 * Hybrid retrieval: approved FAQs are matched by keyword overlap (they are short
 * and authoritative) and merged with pgvector cosine matches over document chunks.
 */
export async function retrieveKnowledge(
    businessId: string,
    question: string,
    limit = 5,
): Promise<RetrievedSnippet[]> {
    const [faqs, chunks] = await Promise.all([
        searchFaqs(businessId, question, limit),
        searchChunks(businessId, question, limit),
    ]);

    return [...faqs, ...chunks]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

async function searchFaqs(businessId: string, question: string, limit: number): Promise<RetrievedSnippet[]> {
    const faqs = await prisma.fAQ.findMany({
        where: { businessId, approved: true },
        select: { id: true, question: true, answer: true },
    });

    return faqs
        .map(faq => ({
            id: faq.id,
            source: 'FAQ',
            content: `Q: ${faq.question}\nA: ${faq.answer}`,
            // FAQ hits are boosted: a curated answer beats a document chunk of
            // comparable overlap.
            score: Math.min(1, keywordOverlap(question, faq.question) * 1.2),
        }))
        .filter(snippet => snippet.score >= RETRIEVAL_CONFIDENCE_FLOOR)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

async function searchChunks(businessId: string, question: string, limit: number): Promise<RetrievedSnippet[]> {
    const embedding = await getAIProvider().generateEmbedding(question);

    const rows = await prisma.$queryRaw<ChunkRow[]>`
        SELECT c."id", c."content", d."title", 1 - (c."embedding" <=> ${toVectorLiteral(embedding)}::vector) AS score
        FROM "KnowledgeChunk" c
        JOIN "KnowledgeDocument" d ON d."id" = c."documentId"
        WHERE c."businessId" = ${businessId}::uuid
          AND c."embedding" IS NOT NULL
          AND d."status" = 'READY'
        ORDER BY c."embedding" <=> ${toVectorLiteral(embedding)}::vector
        LIMIT ${limit}
    `;

    return rows
        .map(row => ({
            id: row.id,
            source: row.title,
            content: row.content,
            score: Number(row.score),
        }))
        .filter(snippet => snippet.score >= RETRIEVAL_CONFIDENCE_FLOOR);
}

export function bestScore(snippets: RetrievedSnippet[]): number {
    return snippets.reduce((best, snippet) => Math.max(best, snippet.score), 0);
}
