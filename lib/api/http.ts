import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { logger } from '@/lib/logger';

export type ErrorCode =
    | 'BAD_REQUEST'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL: 500,
};

export class ApiError extends Error {
    constructor(
        readonly code: ErrorCode,
        message: string,
        readonly details?: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
    }

    get status(): number {
        return STATUS[this.code];
    }
}

export const badRequest = (message: string, details?: unknown) => new ApiError('BAD_REQUEST', message, details);
export const unauthorized = (message = 'You must sign in to continue.') => new ApiError('UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have access to this resource.') => new ApiError('FORBIDDEN', message);
export const notFound = (message = 'Not found.') => new ApiError('NOT_FOUND', message);
export const conflict = (message: string) => new ApiError('CONFLICT', message);
export const rateLimited = (message = 'Too many requests. Please slow down.') => new ApiError('RATE_LIMITED', message);

export function ok<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
}

/**
 * Wraps a route handler so every failure becomes a structured response and
 * internal details stay in the logs instead of the client payload.
 */
export function route<Args extends unknown[]>(
    handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
    return async (...args: Args) => {
        try {
            return await handler(...args);
        } catch (error) {
            if (error instanceof ApiError) {
                return NextResponse.json(
                    { error: { code: error.code, message: error.message, details: error.details } },
                    { status: error.status },
                );
            }

            if (error instanceof ZodError) {
                return NextResponse.json(
                    { error: { code: 'BAD_REQUEST', message: 'Invalid request.', details: error.issues } },
                    { status: 400 },
                );
            }

            logger.error('unhandled_route_error', error);
            return NextResponse.json(
                { error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } },
                { status: 500 },
            );
        }
    };
}

export async function parseJson<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw badRequest('Request body must be valid JSON.');
    }

    const result = schema.safeParse(body);
    if (!result.success) {
        throw badRequest('Some fields need attention.', result.error.flatten().fieldErrors);
    }
    return result.data;
}
