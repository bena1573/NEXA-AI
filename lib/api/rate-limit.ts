import { rateLimited } from '@/lib/api/http';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter kept in process memory. It protects a single instance
 * only; a shared store (Redis/Upstash) is the production swap-in, and the call
 * sites do not change because they only see `enforceRateLimit`.
 */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
        const seconds = Math.ceil((bucket.resetAt - now) / 1000);
        throw rateLimited(`Too many attempts. Try again in ${seconds}s.`);
    }
}

export function clientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Test seam: resets the in-memory windows. */
export function resetRateLimits(): void {
    buckets.clear();
}
