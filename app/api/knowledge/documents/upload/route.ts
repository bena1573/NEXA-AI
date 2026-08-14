import { badRequest, ok, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { ExtractionError, extractFromFile } from '@/lib/knowledge/extract';
import { ingestDocument } from '@/lib/knowledge/ingest';

const MAX_BYTES = 10 * 1024 * 1024;

const TYPE_BY_EXTENSION: Record<string, 'PDF' | 'DOCX' | 'TXT'> = {
    pdf: 'PDF',
    docx: 'DOCX',
    txt: 'TXT',
    md: 'TXT',
};

export const POST = route(async (request: Request) => {
    const ctx = await requirePermission('knowledge:write');

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw badRequest('Attach a file to upload.');
    if (file.size === 0) throw badRequest('That file is empty.');
    if (file.size > MAX_BYTES) throw badRequest('Files must be 10 MB or smaller.');

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const type = TYPE_BY_EXTENSION[extension];
    if (!type) throw badRequest('Supported files are PDF, DOCX, TXT and MD.');

    try {
        const content = await extractFromFile({
            name: file.name,
            buffer: Buffer.from(await file.arrayBuffer()),
        });

        const document = await ingestDocument(ctx, {
            title: file.name.replace(/\.[^.]+$/, ''),
            type,
            content,
            fileName: file.name,
        });

        return ok({ document }, 201);
    } catch (error) {
        if (error instanceof ExtractionError) throw badRequest(error.message);
        throw error;
    }
});
