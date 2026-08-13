import { cookies } from 'next/headers';
import { z } from 'zod';
import { notFound, ok, parseJson, route } from '@/lib/api/http';
import { BUSINESS_COOKIE, requireUser } from '@/lib/auth/context';
import { membershipFor } from '@/lib/db/tenant';

const schema = z.object({ businessId: z.string().uuid() });

export const POST = route(async (request: Request) => {
    const user = await requireUser();
    const { businessId } = await parseJson(request, schema);

    // Switching is only a cookie change, so membership must be proven first.
    if (!(await membershipFor(user.id, businessId))) throw notFound();

    (await cookies()).set(BUSINESS_COOKIE, businessId, { path: '/', sameSite: 'lax' });
    return ok({ businessId });
});
