import { normalizeWhitespace } from '@/lib/ai/text';

export class ExtractionError extends Error {}

/** Strips scripts/styles/tags from an HTML document, keeping readable text. */
export function htmlToText(html: string): string {
    const withoutHead = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');

    const spaced = withoutHead
        .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ');

    return normalizeWhitespace(
        spaced
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'"),
    );
}

const PRIVATE_HOST = /^(localhost|\[?::1\]?|0\.0\.0\.0|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

/** Blocks the obvious SSRF targets: loopback, link-local and RFC1918 hosts. */
export function isFetchableHost(hostname: string): boolean {
    return !PRIVATE_HOST.test(hostname) && !hostname.endsWith('.internal') && !hostname.endsWith('.local');
}

export async function extractFromUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new ExtractionError('That URL is not valid.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new ExtractionError('Only http(s) URLs can be imported.');
    }
    if (!isFetchableHost(parsed.hostname)) {
        throw new ExtractionError('That address is not publicly reachable, so it cannot be imported.');
    }

    const response = await fetchImpl(parsed.toString(), {
        headers: { 'user-agent': 'NexaAI-KnowledgeBot/1.0' },
        redirect: 'follow',
    });
    if (!response.ok) {
        throw new ExtractionError(`The page could not be fetched (HTTP ${response.status}).`);
    }

    const text = htmlToText(await response.text());
    if (!text) throw new ExtractionError('No readable text was found on that page.');
    return text;
}

export async function extractFromFile(file: { name: string; buffer: Buffer }): Promise<string> {
    const name = file.name.toLowerCase();

    if (name.endsWith('.txt') || name.endsWith('.md')) {
        return normalizeWhitespace(file.buffer.toString('utf8'));
    }

    if (name.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return normalizeWhitespace(result.value);
    }

    if (name.endsWith('.pdf')) {
        // pdf-parse is CJS and reads a debug fixture at import time when called
        // with no arguments, so it is imported lazily and only ever with data.
        const pdfParse = (await import('pdf-parse')).default;
        try {
            const result = await pdfParse(file.buffer);
            const text = normalizeWhitespace(result.text);
            if (!text) {
                throw new ExtractionError('This PDF has no extractable text (it may be a scan).');
            }
            return text;
        } catch (error) {
            if (error instanceof ExtractionError) throw error;
            throw new ExtractionError('This PDF could not be parsed.');
        }
    }

    throw new ExtractionError('Supported files are PDF, DOCX, TXT and MD.');
}
