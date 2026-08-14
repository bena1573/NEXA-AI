import Link from 'next/link';
import {
    BarChart3,
    BookOpen,
    CalendarCheck,
    MessageSquare,
    PhoneCall,
    ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, PLAN_ORDER, PLANS } from '@/lib/billing/plans';
import { env } from '@/lib/env';

const FEATURES = [
    {
        icon: MessageSquare,
        title: 'Website chat that stays on script',
        body: 'A single script tag adds a chat agent that answers only from the knowledge you approved.',
    },
    {
        icon: PhoneCall,
        title: 'Voice agent with a call simulator',
        body: 'Test full phone conversations before connecting a telephony provider — no phone number needed.',
    },
    {
        icon: BookOpen,
        title: 'Your knowledge, not the internet',
        body: 'Upload PDFs, docs, pages and FAQs. Retrieval is scored, and low-confidence answers hand off.',
    },
    {
        icon: CalendarCheck,
        title: 'Real appointment booking',
        body: 'Bookings respect your opening hours, service durations and existing appointments.',
    },
    {
        icon: BarChart3,
        title: 'Analytics that point at gaps',
        body: 'See resolution rate, escalations and the exact questions your agent could not answer.',
    },
    {
        icon: ShieldCheck,
        title: 'Multi-tenant by construction',
        body: 'Every query is scoped to your business server-side, and roles limit what each teammate can do.',
    },
];

const STEPS = [
    { title: 'Describe your business', body: 'Profile, opening hours, services and the FAQs you already answer daily.' },
    { title: 'Add your knowledge', body: 'Paste text, import a page or upload documents. Everything is chunked and indexed.' },
    { title: 'Go live', body: 'Drop the widget on your site, or run a simulated call to hear the agent first.' },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen">
            <header className="border-b border-border">
                <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                    <Link href="/" className="text-lg font-semibold">NEXA<span className="text-primary"> AI</span></Link>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm"><Link href="/login">Sign in</Link></Button>
                        <Button asChild size="sm"><Link href="/signup">Start free</Link></Button>
                    </div>
                </nav>
            </header>

            <main id="main">
                <section className="mx-auto max-w-6xl px-4 py-20 text-center">
                    {env.DEMO_MODE && <Badge tone="accent">Demo mode — no AI or telephony credentials required</Badge>}
                    <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                        AI customer support that only says what your business approved
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
                        NEXA AI answers questions on chat and phone, books appointments, and hands the conversation to
                        your team the moment it should — grounded in your documents, never invented.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Button asChild size="lg"><Link href="/signup">Create your agent</Link></Button>
                        <Button asChild size="lg" variant="secondary"><Link href="/login">See the dashboard</Link></Button>
                    </div>
                </section>

                <section aria-labelledby="features" className="mx-auto max-w-6xl px-4 pb-20">
                    <h2 id="features" className="text-2xl font-semibold">Everything a support team actually needs</h2>
                    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map(feature => (
                            <Card key={feature.title}>
                                <CardBody className="space-y-3">
                                    <feature.icon aria-hidden className="h-6 w-6 text-primary" />
                                    <h3 className="font-medium">{feature.title}</h3>
                                    <p className="text-sm text-muted">{feature.body}</p>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </section>

                <section aria-labelledby="how" className="mx-auto max-w-6xl px-4 pb-20">
                    <h2 id="how" className="text-2xl font-semibold">Live in an afternoon</h2>
                    <ol className="mt-8 grid gap-4 md:grid-cols-3">
                        {STEPS.map((step, index) => (
                            <li key={step.title}>
                                <Card>
                                    <CardBody className="space-y-2">
                                        <span className="text-sm font-semibold text-primary">Step {index + 1}</span>
                                        <h3 className="font-medium">{step.title}</h3>
                                        <p className="text-sm text-muted">{step.body}</p>
                                    </CardBody>
                                </Card>
                            </li>
                        ))}
                    </ol>
                </section>

                <section aria-labelledby="pricing" className="mx-auto max-w-6xl px-4 pb-20">
                    <h2 id="pricing" className="text-2xl font-semibold">Pricing</h2>
                    <p className="mt-2 text-sm text-muted">
                        Example pricing — no payment provider is connected in this deployment, so no card is ever charged.
                    </p>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {PLAN_ORDER.map(plan => (
                            <Card key={plan} className={plan === 'BUSINESS' ? 'border-primary/50' : undefined}>
                                <CardHeader>
                                    <div>
                                        <CardTitle>{PLANS[plan].name}</CardTitle>
                                        <CardDescription>{PLANS[plan].tagline}</CardDescription>
                                    </div>
                                    {plan === 'BUSINESS' && <Badge tone="primary">popular</Badge>}
                                </CardHeader>
                                <CardBody className="space-y-4">
                                    <p className="text-2xl font-semibold">
                                        {formatPrice(PLANS[plan].priceCents)}
                                        <span className="text-sm font-normal text-muted">/month</span>
                                    </p>
                                    <ul className="space-y-1 text-sm text-muted">
                                        {PLANS[plan].highlights.map(highlight => <li key={highlight}>{highlight}</li>)}
                                    </ul>
                                    <Button asChild variant={plan === 'BUSINESS' ? 'primary' : 'secondary'} className="w-full">
                                        <Link href="/signup">Start with {PLANS[plan].name}</Link>
                                    </Button>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="border-t border-border">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted">
                    <p>© {new Date().getFullYear()} NEXA AI</p>
                    <div className="flex gap-4">
                        <Link href="/login" className="hover:text-foreground">Sign in</Link>
                        <Link href="/signup" className="hover:text-foreground">Get started</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
