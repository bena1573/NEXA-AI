import { EMBEDDING_DIMENSIONS } from '@/lib/ai/types';

/** pgvector text literal, e.g. `[0.1,-0.2,…]`. */
export function toVectorLiteral(embedding: number[]): string {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Embedding must have ${EMBEDDING_DIMENSIONS} dimensions, received ${embedding.length}.`);
    }
    return `[${embedding.map(value => (Number.isFinite(value) ? value : 0)).join(',')}]`;
}

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Vectors must have the same length.');

    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let index = 0; index < a.length; index += 1) {
        dot += a[index] * b[index];
        normA += a[index] * a[index];
        normB += b[index] * b[index];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
