const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'is',
    'are', 'am', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'you', 'your', 'we', 'our', 'i',
    'me', 'my', 'it', 'its', 'this', 'that', 'these', 'those', 'can', 'could', 'would', 'should',
    'will', 'have', 'has', 'had', 'about', 'from', 'there', 'their', 'they', 'what', 'when', 'where',
    'how', 'please', 'hi', 'hello', 'hey', 'thanks', 'thank',
]);

export function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

export function keywordOverlap(question: string, candidate: string): number {
    const asked = new Set(tokenize(question));
    if (asked.size === 0) return 0;

    const candidateTokens = new Set(tokenize(candidate));
    let hits = 0;
    for (const token of asked) {
        if (candidateTokens.has(token)) hits += 1;
    }
    return hits / asked.size;
}

export function sentences(text: string): string[] {
    return text
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);
}

export function normalizeWhitespace(text: string): string {
    return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function estimateTokens(text: string): number {
    // Good enough for usage metering and chunk sizing without a tokenizer dependency.
    return Math.ceil(text.length / 4);
}

export function truncate(text: string, max: number): string {
    return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
