import { ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { onboardingSchema } from '@/lib/validation/schemas';

const emptyToNull = (value: string | null | undefined) => (value && value.length > 0 ? value : null);

export const POST = route(async (request: Request) => {
    const ctx = await requirePermission('business:update');
    const input = await parseJson(request, onboardingSchema);
    const { businessId } = ctx;

    await prisma.$transaction(async tx => {
        await tx.business.update({
            where: { id: businessId },
            data: {
                name: input.profile.name,
                industry: emptyToNull(input.profile.industry),
                description: emptyToNull(input.profile.description),
                website: emptyToNull(input.profile.website),
                phone: emptyToNull(input.profile.phone),
                email: emptyToNull(input.profile.email),
                addressLine: emptyToNull(input.profile.addressLine),
                city: emptyToNull(input.profile.city),
                country: emptyToNull(input.profile.country),
                timezone: input.profile.timezone,
                onboardedAt: new Date(),
            },
        });

        for (const hour of input.hours) {
            await tx.businessHour.upsert({
                where: { businessId_weekday: { businessId, weekday: hour.weekday } },
                create: { businessId, ...hour },
                update: { closed: hour.closed, opensAt: hour.opensAt, closesAt: hour.closesAt },
            });
        }

        for (const service of input.services) {
            await tx.service.upsert({
                where: { businessId_name: { businessId, name: service.name } },
                create: { businessId, ...service, description: emptyToNull(service.description) },
                update: {
                    description: emptyToNull(service.description),
                    durationMin: service.durationMin,
                    priceCents: service.priceCents ?? null,
                    bookable: service.bookable,
                },
            });
        }

        if (input.faqs.length > 0) {
            await tx.fAQ.createMany({
                data: input.faqs.map(faq => ({ businessId, ...faq })),
            });
        }

        await tx.aIAgent.upsert({
            where: { businessId },
            create: { businessId, ...input.agent, handoffEmail: emptyToNull(input.agent.handoffEmail) },
            update: { ...input.agent, handoffEmail: emptyToNull(input.agent.handoffEmail) },
        });
    });

    return ok({ onboarded: true });
});
