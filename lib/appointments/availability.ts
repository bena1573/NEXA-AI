export type OpeningHour = {
    weekday: number;
    opensAt: string | null;
    closesAt: string | null;
    closed: boolean;
};

export type Busy = { startsAt: Date; endsAt: Date };

export type Slot = { startsAt: Date; endsAt: Date };

export const SLOT_STEP_MIN = 15;

/** Minutes since midnight for an "HH:MM" string, or null when malformed. */
export function minutesOf(time: string | null): number | null {
    if (!time) return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;

    return hours * 60 + minutes;
}

export function overlaps(a: Slot, b: Busy): boolean {
    return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/**
 * Candidate slots for one day, honouring opening hours, service duration, a
 * booking lead time and existing appointments. Times are UTC instants; callers
 * convert for display using the business timezone.
 */
export function availableSlots(options: {
    day: Date;
    hours: OpeningHour[];
    durationMin: number;
    busy?: Busy[];
    now?: Date;
    leadMinutes?: number;
    stepMin?: number;
}): Slot[] {
    const { day, hours, durationMin } = options;
    if (durationMin <= 0) return [];

    const busy = options.busy ?? [];
    const now = options.now ?? new Date();
    const lead = options.leadMinutes ?? 60;
    const step = options.stepMin ?? SLOT_STEP_MIN;

    const weekday = day.getUTCDay();
    const hour = hours.find(entry => entry.weekday === weekday);
    if (!hour || hour.closed) return [];

    const opens = minutesOf(hour.opensAt);
    const closes = minutesOf(hour.closesAt);
    if (opens === null || closes === null || closes <= opens) return [];

    const midnight = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
    const earliest = now.getTime() + lead * 60_000;
    const slots: Slot[] = [];

    for (let minute = opens; minute + durationMin <= closes; minute += step) {
        const startsAt = new Date(midnight + minute * 60_000);
        if (startsAt.getTime() < earliest) continue;

        const slot = { startsAt, endsAt: new Date(startsAt.getTime() + durationMin * 60_000) };
        if (busy.some(taken => overlaps(slot, taken))) continue;

        slots.push(slot);
    }

    return slots;
}

/** True when the requested slot is one the business could actually honour. */
export function isSlotBookable(options: {
    startsAt: Date;
    hours: OpeningHour[];
    durationMin: number;
    busy?: Busy[];
    now?: Date;
    leadMinutes?: number;
}): boolean {
    const slots = availableSlots({
        day: options.startsAt,
        hours: options.hours,
        durationMin: options.durationMin,
        busy: options.busy,
        now: options.now,
        leadMinutes: options.leadMinutes,
        stepMin: 1,
    });

    return slots.some(slot => slot.startsAt.getTime() === options.startsAt.getTime());
}
