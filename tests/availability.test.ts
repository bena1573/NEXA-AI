import { describe, expect, it } from 'vitest';
import { availableSlots, isSlotBookable, minutesOf, overlaps, type OpeningHour } from '@/lib/appointments/availability';

// 2026-06-15 is a Monday.
const MONDAY = new Date('2026-06-15T00:00:00.000Z');
const NOW = new Date('2026-06-14T12:00:00.000Z');

const hours: OpeningHour[] = [
    { weekday: 0, opensAt: null, closesAt: null, closed: true },
    { weekday: 1, opensAt: '09:00', closesAt: '12:00', closed: false },
    { weekday: 2, opensAt: '09:00', closesAt: '17:00', closed: false },
];

describe('minutesOf', () => {
    it('parses valid times and rejects malformed ones', () => {
        expect(minutesOf('09:30')).toBe(570);
        expect(minutesOf('9:05')).toBe(545);
        expect(minutesOf(null)).toBeNull();
        expect(minutesOf('24:00')).toBeNull();
        expect(minutesOf('09:60')).toBeNull();
        expect(minutesOf('morning')).toBeNull();
    });
});

describe('overlaps', () => {
    it('detects intersecting ranges but treats touching ranges as free', () => {
        const slot = { startsAt: new Date('2026-06-15T09:00:00Z'), endsAt: new Date('2026-06-15T09:30:00Z') };
        expect(overlaps(slot, { startsAt: new Date('2026-06-15T09:15:00Z'), endsAt: new Date('2026-06-15T09:45:00Z') })).toBe(true);
        expect(overlaps(slot, { startsAt: new Date('2026-06-15T09:30:00Z'), endsAt: new Date('2026-06-15T10:00:00Z') })).toBe(false);
    });
});

describe('availableSlots', () => {
    it('returns slots inside opening hours only', () => {
        const slots = availableSlots({ day: MONDAY, hours, durationMin: 30, now: NOW });

        expect(slots).not.toHaveLength(0);
        expect(slots[0].startsAt.toISOString()).toBe('2026-06-15T09:00:00.000Z');
        expect(slots.at(-1)?.endsAt.toISOString()).toBe('2026-06-15T12:00:00.000Z');
    });

    it('returns nothing on closed or unconfigured days', () => {
        expect(availableSlots({ day: new Date('2026-06-14T00:00:00Z'), hours, durationMin: 30, now: NOW })).toEqual([]);
        expect(availableSlots({ day: new Date('2026-06-18T00:00:00Z'), hours, durationMin: 30, now: NOW })).toEqual([]);
    });

    it('excludes slots taken by existing appointments', () => {
        const slots = availableSlots({
            day: MONDAY,
            hours,
            durationMin: 30,
            now: NOW,
            busy: [{ startsAt: new Date('2026-06-15T09:00:00Z'), endsAt: new Date('2026-06-15T10:00:00Z') }],
        });

        expect(slots.map(slot => slot.startsAt.toISOString())).not.toContain('2026-06-15T09:15:00.000Z');
        expect(slots[0].startsAt.toISOString()).toBe('2026-06-15T10:00:00.000Z');
    });

    it('respects the booking lead time', () => {
        const slots = availableSlots({
            day: MONDAY,
            hours,
            durationMin: 30,
            now: new Date('2026-06-15T09:00:00Z'),
            leadMinutes: 120,
        });
        expect(slots[0].startsAt.toISOString()).toBe('2026-06-15T11:00:00.000Z');
    });

    it('returns nothing when the service does not fit or has no duration', () => {
        expect(availableSlots({ day: MONDAY, hours, durationMin: 240, now: NOW })).toEqual([]);
        expect(availableSlots({ day: MONDAY, hours, durationMin: 0, now: NOW })).toEqual([]);
    });

    it('ignores malformed or inverted opening hours', () => {
        const broken: OpeningHour[] = [{ weekday: 1, opensAt: '17:00', closesAt: '09:00', closed: false }];
        expect(availableSlots({ day: MONDAY, hours: broken, durationMin: 30, now: NOW })).toEqual([]);
    });
});

describe('isSlotBookable', () => {
    it('accepts an open slot and rejects busy, closed and out-of-hours times', () => {
        const base = { hours, durationMin: 30, now: NOW };

        expect(isSlotBookable({ ...base, startsAt: new Date('2026-06-15T09:20:00Z') })).toBe(true);
        expect(isSlotBookable({ ...base, startsAt: new Date('2026-06-15T13:00:00Z') })).toBe(false);
        expect(isSlotBookable({ ...base, startsAt: new Date('2026-06-14T09:00:00Z') })).toBe(false);
        expect(isSlotBookable({
            ...base,
            startsAt: new Date('2026-06-15T09:00:00Z'),
            busy: [{ startsAt: new Date('2026-06-15T08:45:00Z'), endsAt: new Date('2026-06-15T09:15:00Z') }],
        })).toBe(false);
    });

    it('rejects a slot inside the lead time', () => {
        expect(isSlotBookable({
            hours,
            durationMin: 30,
            startsAt: new Date('2026-06-15T09:00:00Z'),
            now: new Date('2026-06-15T08:30:00Z'),
        })).toBe(false);
    });
});
