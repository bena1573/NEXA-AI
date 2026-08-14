import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export function formatDateTime(value: Date | string, timeZone = 'UTC'): string {
    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
    }).format(new Date(value));
}

export function formatDate(value: Date | string, timeZone = 'UTC'): string {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone }).format(new Date(value));
}

export function formatTime(value: Date | string, timeZone = 'UTC'): string {
    return new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone }).format(new Date(value));
}

export function relativeTime(value: Date | string, now: Date = new Date()): string {
    const diffMs = new Date(value).getTime() - now.getTime();
    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
        ['day', 86_400_000],
        ['hour', 3_600_000],
        ['minute', 60_000],
    ];

    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    for (const [unit, ms] of units) {
        if (Math.abs(diffMs) >= ms) return formatter.format(Math.round(diffMs / ms), unit);
    }
    return 'just now';
}

export function durationLabel(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function initialsOf(name: string | null | undefined, fallback = '?'): string {
    if (!name) return fallback;
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(part => part[0]?.toUpperCase() ?? '').join('') || fallback;
}
