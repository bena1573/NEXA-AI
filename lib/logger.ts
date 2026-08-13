type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, event: string, data?: unknown) {
    const entry = {
        level,
        event,
        at: new Date().toISOString(),
        ...(data instanceof Error
            ? { message: data.message, stack: data.stack }
            : data !== undefined ? { data } : {}),
    };

    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

export const logger = {
    debug: (event: string, data?: unknown) => {
        if (process.env.NODE_ENV !== 'production') emit('debug', event, data);
    },
    info: (event: string, data?: unknown) => emit('info', event, data),
    warn: (event: string, data?: unknown) => emit('warn', event, data),
    error: (event: string, data?: unknown) => emit('error', event, data),
};
