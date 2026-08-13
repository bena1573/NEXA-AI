import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { currentContext, currentUser } from '@/lib/auth/context';
import { allowedActions, ROLE_LABELS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { env } from '@/lib/env';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await currentUser();
    if (!user) redirect('/login');

    const context = await currentContext();
    if (!context) redirect('/onboarding');

    const [memberships, business] = await Promise.all([
        prisma.membership.findMany({
            where: { userId: user.id },
            include: { business: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.business.findUniqueOrThrow({
            where: { id: context.businessId },
            select: { onboardedAt: true, demo: true },
        }),
    ]);

    if (!business.onboardedAt) redirect('/onboarding');

    return (
        <div className="flex min-h-screen flex-col lg:flex-row">
            <Sidebar allowed={allowedActions(context.role)} />
            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar
                    businesses={memberships.map(membership => membership.business)}
                    activeBusinessId={context.businessId}
                    userName={user.name}
                    roleLabel={ROLE_LABELS[context.role]}
                    demoMode={env.DEMO_MODE || business.demo}
                />
                <main id="main" className="flex-1 px-4 py-6 lg:px-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
