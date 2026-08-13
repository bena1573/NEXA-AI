import { prisma } from '@/lib/db/client';
import { conflict } from '@/lib/api/http';

export function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'business';
}

async function uniqueSlug(base: string): Promise<string> {
    const slug = slugify(base);
    for (let attempt = 0; attempt < 25; attempt += 1) {
        const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
        const taken = await prisma.business.findUnique({ where: { slug: candidate }, select: { id: true } });
        if (!taken) return candidate;
    }
    throw conflict('Could not generate a unique workspace address for that name.');
}

const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
    weekday,
    closed: weekday === 0,
    opensAt: weekday === 0 ? null : '09:00',
    closesAt: weekday === 0 ? null : '17:00',
}));

/**
 * Creates a business with everything the product assumes exists: the owner
 * membership, an AI agent, a trial subscription and a default week of hours.
 */
export async function createBusinessForOwner(input: { name: string; userId: string; demo?: boolean }) {
    const slug = await uniqueSlug(input.name);

    return prisma.business.create({
        data: {
            name: input.name,
            slug,
            demo: input.demo ?? false,
            memberships: { create: { userId: input.userId, role: 'OWNER' } },
            agent: { create: {} },
            subscription: { create: {} },
            hours: { create: DEFAULT_HOURS },
        },
    });
}
