import { prisma } from '@/lib/db/client';
import { createBusinessForOwner } from '@/lib/businesses/create';
import { hashPassword } from '@/lib/auth/password';

export type Workspace = {
    businessId: string;
    userId: string;
    conversationId: string;
};

/** Weekday hours used by the booking tests: open 09:00–17:00 Monday to Saturday. */
const HOURS = [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
    weekday,
    closed: weekday === 0,
    opensAt: weekday === 0 ? null : '09:00',
    closesAt: weekday === 0 ? null : '17:00',
}));

export async function createWorkspace(label: string): Promise<Workspace> {
    const suffix = Math.random().toString(36).slice(2, 10);
    const user = await prisma.user.create({
        data: {
            email: `${label}-${suffix}@test.invalid`,
            name: `${label} owner`,
            passwordHash: await hashPassword('IntegrationTest123'),
            emailVerified: true,
        },
    });

    const business = await createBusinessForOwner({ name: `${label} ${suffix}`, userId: user.id });
    await prisma.businessHour.deleteMany({ where: { businessId: business.id } });
    await prisma.businessHour.createMany({
        data: HOURS.map(hour => ({ ...hour, businessId: business.id })),
    });

    const conversation = await prisma.conversation.create({
        data: { businessId: business.id, channel: 'CHAT' },
    });

    return { businessId: business.id, userId: user.id, conversationId: conversation.id };
}

export async function destroyWorkspace(workspace: Workspace): Promise<void> {
    await prisma.business.deleteMany({ where: { id: workspace.businessId } });
    await prisma.user.deleteMany({ where: { id: workspace.userId } });
}

/** Next occurrence of a weekday at a given UTC hour, always in the future. */
export function nextWeekdayAt(weekday: number, hour: number, from = new Date()): Date {
    const date = new Date(from);
    date.setUTCHours(hour, 0, 0, 0);
    while (date.getUTCDay() !== weekday || date <= from) {
        date.setUTCDate(date.getUTCDate() + 1);
        date.setUTCHours(hour, 0, 0, 0);
    }
    return date;
}
