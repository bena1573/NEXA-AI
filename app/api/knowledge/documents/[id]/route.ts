import { notFound, ok, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { deleteDocument, reindexDocument } from '@/lib/knowledge/ingest';

type Params = { params: Promise<{ id: string }> };

export const DELETE = route(async (_request: Request, { params }: Params) => {
    const ctx = await requirePermission('knowledge:write');
    const { id } = await params;

    if (!(await deleteDocument(ctx, id))) throw notFound('That document no longer exists.');
    return ok({ deleted: true });
});

export const POST = route(async (_request: Request, { params }: Params) => {
    const ctx = await requirePermission('knowledge:write');
    const { id } = await params;

    const document = await reindexDocument(ctx, id);
    if (!document) throw notFound('That document no longer exists.');
    return ok({ document });
});
