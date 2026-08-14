import { estimateTokens, normalizeWhitespace, sentences } from '@/lib/ai/text';

export type Chunk = {
    position: number;
    content: string;
    tokens: number;
};

export const CHUNK_TARGET_CHARS = 900;
export const CHUNK_OVERLAP_CHARS = 150;

/**
 * Sentence-aware chunking: sentences are never split unless a single sentence
 * exceeds the target size, and consecutive chunks share a trailing overlap so an
 * answer that straddles a boundary is still retrievable.
 */
export function chunkText(
    raw: string,
    options: { target?: number; overlap?: number } = {},
): Chunk[] {
    const target = options.target ?? CHUNK_TARGET_CHARS;
    const overlap = Math.min(options.overlap ?? CHUNK_OVERLAP_CHARS, target - 1);
    const text = normalizeWhitespace(raw);
    if (!text) return [];

    const parts = sentences(text).flatMap(sentence => splitLongSentence(sentence, target));
    const chunks: string[] = [];
    let current = '';

    for (const part of parts) {
        if (current && `${current} ${part}`.length > target) {
            chunks.push(current);
            current = overlap > 0 ? `${tailOf(current, overlap)} ${part}`.trim() : part;
        } else {
            current = current ? `${current} ${part}` : part;
        }
    }
    if (current) chunks.push(current);

    return chunks.map((content, position) => ({
        position,
        content,
        tokens: estimateTokens(content),
    }));
}

function splitLongSentence(sentence: string, target: number): string[] {
    if (sentence.length <= target) return [sentence];

    const words = sentence.split(' ');
    const pieces: string[] = [];
    let piece = '';

    for (const word of words) {
        if (piece && `${piece} ${word}`.length > target) {
            pieces.push(piece);
            piece = word;
        } else {
            piece = piece ? `${piece} ${word}` : word;
        }
    }
    if (piece) pieces.push(piece);
    return pieces;
}

/** Last `size` characters, trimmed to a word boundary. */
function tailOf(text: string, size: number): string {
    if (text.length <= size) return text;
    const tail = text.slice(-size);
    const boundary = tail.indexOf(' ');
    return boundary === -1 ? tail : tail.slice(boundary + 1);
}
