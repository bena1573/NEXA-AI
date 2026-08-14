import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/client';
import { ingestDocument } from '@/lib/knowledge/ingest';
import { bestScore, retrieveKnowledge } from '@/lib/knowledge/search';
import { createWorkspace, destroyWorkspace, type Workspace } from './helpers';

const CLINIC_POLICY = `Refund policy

Deposits are refunded in full when an appointment is cancelled at least 24 hours
before the start time. Inside 24 hours we keep half of the deposit. Refunds are
paid back to the original card within five working days.`;

let clinic: Workspace;
let rival: Workspace;

beforeAll(async () => {
    clinic = await createWorkspace('knowledge-clinic');
    rival = await createWorkspace('knowledge-rival');

    await ingestDocument(
        { businessId: clinic.businessId, userId: clinic.userId, role: 'OWNER' },
        { title: 'Refund policy', type: 'TEXT', content: CLINIC_POLICY },
    );
    await prisma.fAQ.create({
        data: {
            businessId: clinic.businessId,
            question: 'Do you offer free parking for patients?',
            answer: 'Yes, patient parking behind the building is free for the duration of your appointment.',
            approved: true,
        },
    });
    await prisma.fAQ.create({
        data: {
            businessId: clinic.businessId,
            question: 'Which brand of implants do you fit?',
            answer: 'We fit Straumann implants.',
            approved: false,
        },
    });
}, 60_000);

afterAll(async () => {
    await destroyWorkspace(clinic);
    await destroyWorkspace(rival);
});

describe('knowledge ingestion', () => {
    it('stores the document as READY with embedded chunks', async () => {
        const document = await prisma.knowledgeDocument.findFirstOrThrow({
            where: { businessId: clinic.businessId },
        });
        expect(document.status).toBe('READY');
        expect(document.chunkCount).toBeGreaterThan(0);

        const chunks = await prisma.knowledgeChunk.count({ where: { documentId: document.id } });
        expect(chunks).toBe(document.chunkCount);
    });
});

describe('retrieval', () => {
    it('finds the tenant\'s own document content', async () => {
        const snippets = await retrieveKnowledge(clinic.businessId, 'Can I get my deposit refunded?');
        expect(snippets.length).toBeGreaterThan(0);
        expect(bestScore(snippets)).toBeGreaterThan(0);
        expect(snippets.some(snippet => snippet.content.toLowerCase().includes('deposit'))).toBe(true);
    });

    it('returns approved FAQs and never unapproved ones', async () => {
        const parking = await retrieveKnowledge(clinic.businessId, 'Do you offer free parking for patients?');
        expect(parking.some(snippet => snippet.content.includes('parking behind the building'))).toBe(true);

        const implants = await retrieveKnowledge(clinic.businessId, 'Which brand of implants do you fit?');
        expect(implants.some(snippet => snippet.content.includes('Straumann'))).toBe(false);
    });

    it('never leaks another tenant\'s knowledge', async () => {
        const snippets = await retrieveKnowledge(rival.businessId, 'Can I get my deposit refunded?');
        expect(snippets).toHaveLength(0);
    });
});
