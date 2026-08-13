export type ApiFailure = {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
};

/**
 * Single place the browser talks to the API, so every form gets the same
 * error shape instead of each component inventing its own handling.
 */
export async function apiRequest<T>(
    path: string,
    options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<{ data: T; error: null } | { data: null; error: ApiFailure }> {
    try {
        const response = await fetch(path, {
            method: options.method ?? (options.body ? 'POST' : 'GET'),
            headers: options.body ? { 'content-type': 'application/json' } : undefined,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: options.signal,
        });

        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
            const error = extractError(payload);
            return { data: null, error };
        }

        return { data: payload as T, error: null };
    } catch {
        return {
            data: null,
            error: { code: 'NETWORK', message: 'We could not reach the server. Check your connection and try again.' },
        };
    }
}

function extractError(payload: unknown): ApiFailure {
    if (payload && typeof payload === 'object' && 'error' in payload) {
        const raw = (payload as { error: unknown }).error;
        if (raw && typeof raw === 'object') {
            const entry = raw as { code?: unknown; message?: unknown; details?: unknown };
            return {
                code: typeof entry.code === 'string' ? entry.code : 'INTERNAL',
                message: typeof entry.message === 'string' ? entry.message : 'Something went wrong.',
                fields: fieldErrors(entry.details),
            };
        }
    }
    return { code: 'INTERNAL', message: 'Something went wrong. Please try again.' };
}

function fieldErrors(details: unknown): Record<string, string[]> | undefined {
    if (!details || typeof details !== 'object' || Array.isArray(details)) return undefined;
    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
        if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
            result[key] = value;
        }
    }
    return Object.keys(result).length > 0 ? result : undefined;
}
