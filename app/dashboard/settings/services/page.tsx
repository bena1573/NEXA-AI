import type { Metadata } from 'next';
import { ServicesManager } from '@/components/settings/services-manager';
import { requirePermission } from '@/lib/auth/context';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Services' };

export default async function ServicesSettingsPage() {
    const ctx = await requirePermission('business:read');

    const services = await prisma.service.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true, durationMin: true, priceCents: true, bookable: true },
    });

    return <ServicesManager services={services} canWrite={can(ctx.role, 'business:update')} />;
}
