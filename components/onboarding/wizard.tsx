'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiRequest, type ApiFailure } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STEPS = ['Business', 'Opening hours', 'Services', 'FAQs', 'AI agent'] as const;

type HourRow = { weekday: number; closed: boolean; opensAt: string; closesAt: string };
type ServiceRow = { name: string; description: string; durationMin: number; price: string };
type FaqRow = { question: string; answer: string };

export function OnboardingWizard({
    businessName,
    timezone,
    agentName,
    greeting,
}: {
    businessName: string;
    timezone: string;
    agentName: string;
    greeting: string;
}) {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [failure, setFailure] = useState<ApiFailure | null>(null);
    const [pending, setPending] = useState(false);

    const [profile, setProfile] = useState({
        name: businessName,
        industry: '',
        description: '',
        website: '',
        phone: '',
        email: '',
        addressLine: '',
        city: '',
        country: '',
        timezone,
    });

    const [hours, setHours] = useState<HourRow[]>(
        WEEKDAYS.map((_, weekday) => ({
            weekday,
            closed: weekday === 0,
            opensAt: '09:00',
            closesAt: '17:00',
        })),
    );

    const [services, setServices] = useState<ServiceRow[]>([
        { name: '', description: '', durationMin: 30, price: '' },
    ]);

    const [faqs, setFaqs] = useState<FaqRow[]>([{ question: '', answer: '' }]);

    const [agent, setAgent] = useState({
        name: agentName,
        personality: 'PROFESSIONAL',
        responseStyle: 'BALANCED',
        greeting,
        instructions: '',
        escalationRules: 'Transfer to a human for refunds, complaints, or anything legal.',
        handoffEmail: '',
    });

    async function submit() {
        setPending(true);
        setFailure(null);

        const { error } = await apiRequest('/api/onboarding', {
            body: {
                profile,
                hours: hours.map(hour => ({
                    weekday: hour.weekday,
                    closed: hour.closed,
                    opensAt: hour.closed ? null : hour.opensAt,
                    closesAt: hour.closed ? null : hour.closesAt,
                })),
                services: services
                    .filter(service => service.name.trim().length > 1)
                    .map(service => ({
                        name: service.name.trim(),
                        description: service.description.trim(),
                        durationMin: service.durationMin,
                        priceCents: service.price ? Math.round(Number(service.price) * 100) : null,
                        bookable: true,
                    })),
                faqs: faqs.filter(faq => faq.question.trim().length > 4 && faq.answer.trim().length > 1),
                agent,
            },
        });

        if (error) {
            setFailure(error);
            setPending(false);
            return;
        }

        router.replace('/dashboard');
    }

    return (
        <div className="mt-8 space-y-6">
            <ol className="flex flex-wrap gap-2" aria-label="Progress">
                {STEPS.map((label, index) => (
                    <li key={label}>
                        <span
                            aria-current={index === step ? 'step' : undefined}
                            className={cn(
                                'rounded-full border px-3 py-1 text-xs',
                                index === step
                                    ? 'border-primary/60 bg-primary/15 text-foreground'
                                    : index < step
                                        ? 'border-success/40 bg-success/10 text-success'
                                        : 'border-border text-muted',
                            )}
                        >
                            {index + 1}. {label}
                        </span>
                    </li>
                ))}
            </ol>

            {failure && <ErrorState message={failure.message} />}

            <Card>
                <CardBody className="space-y-5">
                    {step === 0 && (
                        <>
                            <Field label="Business name">
                                {props => (
                                    <Input
                                        {...props}
                                        value={profile.name}
                                        onChange={event => setProfile({ ...profile, name: event.target.value })}
                                        required
                                    />
                                )}
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Industry">
                                    {props => (
                                        <Input
                                            {...props}
                                            value={profile.industry}
                                            placeholder="Dental clinic"
                                            onChange={event => setProfile({ ...profile, industry: event.target.value })}
                                        />
                                    )}
                                </Field>
                                <Field label="Time zone" hint="Used for opening hours and bookings.">
                                    {props => (
                                        <Input
                                            {...props}
                                            value={profile.timezone}
                                            placeholder="Africa/Addis_Ababa"
                                            onChange={event => setProfile({ ...profile, timezone: event.target.value })}
                                        />
                                    )}
                                </Field>
                            </div>
                            <Field label="What does your business do?" hint="Your agent may quote this to customers.">
                                {props => (
                                    <Textarea
                                        {...props}
                                        value={profile.description}
                                        onChange={event => setProfile({ ...profile, description: event.target.value })}
                                    />
                                )}
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Public phone">
                                    {props => (
                                        <Input
                                            {...props}
                                            value={profile.phone}
                                            onChange={event => setProfile({ ...profile, phone: event.target.value })}
                                        />
                                    )}
                                </Field>
                                <Field label="Public email">
                                    {props => (
                                        <Input
                                            {...props}
                                            type="email"
                                            value={profile.email}
                                            onChange={event => setProfile({ ...profile, email: event.target.value })}
                                        />
                                    )}
                                </Field>
                                <Field label="Website">
                                    {props => (
                                        <Input
                                            {...props}
                                            value={profile.website}
                                            placeholder="https://"
                                            onChange={event => setProfile({ ...profile, website: event.target.value })}
                                        />
                                    )}
                                </Field>
                                <Field label="City">
                                    {props => (
                                        <Input
                                            {...props}
                                            value={profile.city}
                                            onChange={event => setProfile({ ...profile, city: event.target.value })}
                                        />
                                    )}
                                </Field>
                            </div>
                        </>
                    )}

                    {step === 1 && (
                        <fieldset className="space-y-3">
                            <legend className="text-sm text-muted">
                                Your agent quotes these hours and never books outside them.
                            </legend>
                            {hours.map((hour, index) => (
                                <div key={hour.weekday} className="flex flex-wrap items-center gap-3">
                                    <span className="w-24 text-sm">{WEEKDAYS[hour.weekday]}</span>
                                    <label className="flex items-center gap-2 text-sm text-muted">
                                        <input
                                            type="checkbox"
                                            checked={hour.closed}
                                            onChange={event => {
                                                const next = [...hours];
                                                next[index] = { ...hour, closed: event.target.checked };
                                                setHours(next);
                                            }}
                                        />
                                        Closed
                                    </label>
                                    {!hour.closed && (
                                        <>
                                            <label className="sr-only" htmlFor={`opens-${hour.weekday}`}>
                                                {WEEKDAYS[hour.weekday]} opening time
                                            </label>
                                            <Input
                                                id={`opens-${hour.weekday}`}
                                                type="time"
                                                className="w-32"
                                                value={hour.opensAt}
                                                onChange={event => {
                                                    const next = [...hours];
                                                    next[index] = { ...hour, opensAt: event.target.value };
                                                    setHours(next);
                                                }}
                                            />
                                            <label className="sr-only" htmlFor={`closes-${hour.weekday}`}>
                                                {WEEKDAYS[hour.weekday]} closing time
                                            </label>
                                            <Input
                                                id={`closes-${hour.weekday}`}
                                                type="time"
                                                className="w-32"
                                                value={hour.closesAt}
                                                onChange={event => {
                                                    const next = [...hours];
                                                    next[index] = { ...hour, closesAt: event.target.value };
                                                    setHours(next);
                                                }}
                                            />
                                        </>
                                    )}
                                </div>
                            ))}
                        </fieldset>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted">
                                Services the agent can describe and book. You can add more later.
                            </p>
                            {services.map((service, index) => (
                                <div key={index} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-4">
                                    <div className="sm:col-span-2">
                                        <Label htmlFor={`service-name-${index}`}>Name</Label>
                                        <Input
                                            id={`service-name-${index}`}
                                            value={service.name}
                                            placeholder="Teeth cleaning"
                                            onChange={event => {
                                                const next = [...services];
                                                next[index] = { ...service, name: event.target.value };
                                                setServices(next);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`service-duration-${index}`}>Minutes</Label>
                                        <Input
                                            id={`service-duration-${index}`}
                                            type="number"
                                            min={5}
                                            max={480}
                                            value={service.durationMin}
                                            onChange={event => {
                                                const next = [...services];
                                                next[index] = { ...service, durationMin: Number(event.target.value) };
                                                setServices(next);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`service-price-${index}`}>Price</Label>
                                        <Input
                                            id={`service-price-${index}`}
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={service.price}
                                            onChange={event => {
                                                const next = [...services];
                                                next[index] = { ...service, price: event.target.value };
                                                setServices(next);
                                            }}
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <Label htmlFor={`service-description-${index}`}>Description</Label>
                                        <Input
                                            id={`service-description-${index}`}
                                            value={service.description}
                                            onChange={event => {
                                                const next = [...services];
                                                next[index] = { ...service, description: event.target.value };
                                                setServices(next);
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setServices(services.filter((_, i) => i !== index))}
                                            aria-label={`Remove service ${index + 1}`}
                                        >
                                            <Trash2 aria-hidden className="h-4 w-4" />
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setServices([...services, { name: '', description: '', durationMin: 30, price: '' }])}
                            >
                                <Plus aria-hidden className="h-4 w-4" />
                                Add service
                            </Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted">
                                Answers your agent is allowed to give word for word.
                            </p>
                            {faqs.map((faq, index) => (
                                <div key={index} className="space-y-2 rounded-md border border-border p-3">
                                    <Label htmlFor={`faq-question-${index}`}>Question</Label>
                                    <Input
                                        id={`faq-question-${index}`}
                                        value={faq.question}
                                        placeholder="Do you accept walk-ins?"
                                        onChange={event => {
                                            const next = [...faqs];
                                            next[index] = { ...faq, question: event.target.value };
                                            setFaqs(next);
                                        }}
                                    />
                                    <Label htmlFor={`faq-answer-${index}`}>Answer</Label>
                                    <Textarea
                                        id={`faq-answer-${index}`}
                                        value={faq.answer}
                                        onChange={event => {
                                            const next = [...faqs];
                                            next[index] = { ...faq, answer: event.target.value };
                                            setFaqs(next);
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setFaqs(faqs.filter((_, i) => i !== index))}
                                        aria-label={`Remove FAQ ${index + 1}`}
                                    >
                                        <Trash2 aria-hidden className="h-4 w-4" />
                                        Remove
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}
                            >
                                <Plus aria-hidden className="h-4 w-4" />
                                Add FAQ
                            </Button>
                        </div>
                    )}

                    {step === 4 && (
                        <>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Field label="Agent name">
                                    {props => (
                                        <Input
                                            {...props}
                                            value={agent.name}
                                            onChange={event => setAgent({ ...agent, name: event.target.value })}
                                        />
                                    )}
                                </Field>
                                <Field label="Personality">
                                    {props => (
                                        <Select
                                            {...props}
                                            value={agent.personality}
                                            onChange={event => setAgent({ ...agent, personality: event.target.value })}
                                        >
                                            <option value="PROFESSIONAL">Professional</option>
                                            <option value="FRIENDLY">Friendly</option>
                                            <option value="CASUAL">Casual</option>
                                            <option value="FORMAL">Formal</option>
                                        </Select>
                                    )}
                                </Field>
                                <Field label="Response length">
                                    {props => (
                                        <Select
                                            {...props}
                                            value={agent.responseStyle}
                                            onChange={event => setAgent({ ...agent, responseStyle: event.target.value })}
                                        >
                                            <option value="SHORT">Short</option>
                                            <option value="BALANCED">Balanced</option>
                                            <option value="DETAILED">Detailed</option>
                                        </Select>
                                    )}
                                </Field>
                            </div>
                            <Field label="Greeting">
                                {props => (
                                    <Input
                                        {...props}
                                        value={agent.greeting}
                                        onChange={event => setAgent({ ...agent, greeting: event.target.value })}
                                    />
                                )}
                            </Field>
                            <Field label="Extra instructions" hint="Tone, phrases to avoid, how to sign off.">
                                {props => (
                                    <Textarea
                                        {...props}
                                        value={agent.instructions}
                                        onChange={event => setAgent({ ...agent, instructions: event.target.value })}
                                    />
                                )}
                            </Field>
                            <Field label="When should it hand over to a human?">
                                {props => (
                                    <Textarea
                                        {...props}
                                        value={agent.escalationRules}
                                        onChange={event => setAgent({ ...agent, escalationRules: event.target.value })}
                                    />
                                )}
                            </Field>
                            <Field label="Escalation email" hint="Where handover notifications should go.">
                                {props => (
                                    <Input
                                        {...props}
                                        type="email"
                                        value={agent.handoffEmail}
                                        onChange={event => setAgent({ ...agent, handoffEmail: event.target.value })}
                                    />
                                )}
                            </Field>
                        </>
                    )}
                </CardBody>
            </Card>

            <div className="flex items-center justify-between">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(value => Math.max(0, value - 1))}
                    disabled={step === 0 || pending}
                >
                    Back
                </Button>
                {step < STEPS.length - 1
                    ? (
                        <Button type="button" onClick={() => setStep(value => value + 1)}>
                            Continue
                        </Button>
                    )
                    : (
                        <Button type="button" onClick={submit} disabled={pending}>
                            {pending ? 'Finishing setup…' : 'Finish setup'}
                        </Button>
                    )}
            </div>
        </div>
    );
}
