import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/wizard';
import { currentContext, currentUser } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = {
    title: 'Set up your business',
    robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
    const user = await currentUser();
    if (!user) redirect('/login');

    const context = await currentContext();
    if (!context) redirect('/login');

    const business = await prisma.business.findUniqueOrThrow({
        where: { id: context.businessId },
        select: { name: true, timezone: true, onboardedAt: true, agent: true },
    });
    if (business.onboardedAt) redirect('/dashboard');

    return (
        <main id="main" className="mx-auto w-full max-w-3xl px-6 py-10">
            <h1 className="text-2xl font-semibold">Set up {business.name}</h1>
            <p className="mt-1 text-sm text-muted">
                Your agent answers only from what you enter here, so the more accurate this is, the better it performs.
            </p>
            <OnboardingWizard
                businessName={business.name}
                timezone={business.timezone}
                agentName={business.agent?.name ?? 'Alex'}
                greeting={business.agent?.greeting ?? 'Hi! How can I help you today?'}
            />
        </main>
    );
}
