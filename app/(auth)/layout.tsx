import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { currentUser } from '@/lib/auth/context';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    if (await currentUser()) redirect('/dashboard');

    return (
        <main id="main" className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center">
            <section className="flex-1 space-y-6">
                <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold">
                    <Sparkles aria-hidden className="h-5 w-5 text-primary" />
                    NEXA AI
                </Link>
                <h1 className="max-w-lg text-3xl font-semibold leading-tight sm:text-4xl">
                    Support that answers instantly — and only from what your business approved.
                </h1>
                <ul className="space-y-3 text-sm text-muted">
                    <li>· Chat and voice agents trained on your own knowledge base</li>
                    <li>· Books appointments, opens tickets, hands off to your team</li>
                    <li>· Works end to end in demo mode, no AI or telephony account needed</li>
                </ul>
            </section>
            <section className="w-full max-w-md">{children}</section>
        </main>
    );
}
