import type { Metadata } from 'next';
import { BusinessSettingsForm } from '@/components/settings/business-form';
import { WidgetSnippet } from '@/components/settings/widget-snippet';
import { requirePermission } from '@/lib/auth/context';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'Business settings' };

export default async function BusinessSettingsPage() {
    const ctx = await requirePermission('business:read');

    const business = await prisma.business.findUniqueOrThrow({
        where: { id: ctx.businessId },
        include: { hours: { orderBy: { weekday: 'asc' } } },
    });

    return (
        <div className="space-y-6">
            <BusinessSettingsForm
                business={{
                    name: business.name,
                    industry: business.industry,
                    description: business.description,
                    website: business.website,
                    phone: business.phone,
                    email: business.email,
                    addressLine: business.addressLine,
                    city: business.city,
                    country: business.country,
                    timezone: business.timezone,
                }}
                hours={Array.from({ length: 7 }, (_, weekday) => {
                    const existing = business.hours.find(hour => hour.weekday === weekday);
                    return {
                        weekday,
                        closed: existing?.closed ?? weekday === 0,
                        opensAt: existing?.opensAt ?? '09:00',
                        closesAt: existing?.closesAt ?? '17:00',
                    };
                })}
                canWrite={can(ctx.role, 'business:update')}
            />
            <WidgetSnippet widgetId={business.publicWidgetId} appUrl={env.APP_URL} />
        </div>
    );
}
