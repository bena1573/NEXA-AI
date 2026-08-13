import { cookies } from 'next/headers';
import { ok, route } from '@/lib/api/http';
import { destroySession } from '@/lib/auth/session';
import { BUSINESS_COOKIE } from '@/lib/auth/context';

export const POST = route(async () => {
    await destroySession();
    (await cookies()).delete(BUSINESS_COOKIE);
    return ok({ signedOut: true });
});
