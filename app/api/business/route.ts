import { ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { businessSettingsSchema } from '@/lib/validation/schemas';

export const PATCH = route(async (request: Request) => {
    const ctx = await requirePermission('business:update');
    const { profile, hours } = await parseJson(request, businessSettingsSchema);

    await prisma.$transaction(async tx => {
        await tx.business.update({
            where: { id: ctx.businessId },
            data: {
                name: profile.name,
                industry: profile.industry ?? null,
                description: profile.description ?? null,
                website: profile.website || null,
                phone: profile.phone ?? null,
                email: profile.email || null,
                addressLine: profile.addressLine ?? null,
                city: profile.city ?? null,
                country: profile.country ?? null,
                timezone: profile.timezone,
            },
        });

        for (const hour of hours) {
            await tx.businessHour.upsert({
                where: { businessId_weekday: { businessId: ctx.businessId, weekday: hour.weekday } },
                create: { businessId: ctx.businessId, ...hour },
                update: { closed: hour.closed, opensAt: hour.opensAt, closesAt: hour.closesAt },
            });
        }
    });

    return ok({ saved: true });
});
