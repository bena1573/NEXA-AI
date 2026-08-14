import { describe, expect, it } from 'vitest';
import { chunkText } from '@/lib/knowledge/chunk';

describe('chunkText', () => {
    it('returns nothing for blank input', () => {
        expect(chunkText('   \n\t ')).toEqual([]);
    });

    it('keeps short text as a single chunk', () => {
        const chunks = chunkText('We are open from nine to five. Call us any time.');
        expect(chunks).toHaveLength(1);
        expect(chunks[0].position).toBe(0);
        expect(chunks[0].tokens).toBeGreaterThan(0);
    });

    it('splits long text into overlapping chunks that respect the target size', () => {
        const sentence = 'Nova Dental Clinic offers routine cleanings for new patients. ';
        const chunks = chunkText(sentence.repeat(40), { target: 300, overlap: 60 });

        expect(chunks.length).toBeGreaterThan(1);
        for (const chunk of chunks) {
            expect(chunk.content.length).toBeLessThanOrEqual(360);
        }
        expect(chunks.map(chunk => chunk.position)).toEqual(chunks.map((_, index) => index));
    });

    it('overlaps consecutive chunks so answers on a boundary stay retrievable', () => {
        const text = Array.from({ length: 20 }, (_, index) => `Fact number ${index} about the clinic.`).join(' ');
        const chunks = chunkText(text, { target: 120, overlap: 40 });

        const firstTail = chunks[0].content.slice(-20);
        expect(chunks[1].content.includes(firstTail.trim().split(' ').pop() as string)).toBe(true);
    });

    it('splits a single sentence that is longer than the target', () => {
        const chunks = chunkText(`${'word '.repeat(200)}.`, { target: 200, overlap: 0 });
        expect(chunks.length).toBeGreaterThan(3);
        for (const chunk of chunks) {
            expect(chunk.content.length).toBeLessThanOrEqual(200);
        }
    });
});
