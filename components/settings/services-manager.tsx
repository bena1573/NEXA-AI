'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { EmptyState, ErrorState } from '@/components/ui/states';

type Service = {
    id: string;
    name: string;
    description: string | null;
    durationMin: number;
    priceCents: number | null;
    bookable: boolean;
};

export function ServicesManager({ services, canWrite }: { services: Service[]; canWrite: boolean }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function send(path: string, options: { method?: string; body?: unknown }) {
        setPending(true);
        setError(null);
        const { error: failure } = await apiRequest(path, options);
        setPending(false);

        if (failure) {
            setError(failure.message);
            return false;
        }
        router.refresh();
        return true;
    }

    async function create(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const price = String(data.get('price') ?? '').trim();

        const created = await send('/api/services', {
            body: {
                name: String(data.get('name') ?? ''),
                description: String(data.get('description') ?? '') || null,
                durationMin: Number(data.get('durationMin') ?? 30),
                priceCents: price ? Math.round(Number(price) * 100) : null,
                bookable: true,
            },
        });
        if (created) form.reset();
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Bookable services</CardTitle>
                        <CardDescription>Your agent can only book the services listed here.</CardDescription>
                    </div>
                </CardHeader>
                <CardBody className="space-y-4">
                    {error && <ErrorState message={error} />}
                    {services.length === 0
                        ? <EmptyState title="No services yet" description="Add a service so your agent can offer appointments." />
                        : (
                            <ul className="divide-y divide-border">
                                {services.map(service => (
                                    <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <p className="font-medium">{service.name}</p>
                                            <p className="text-xs text-muted">
                                                {service.durationMin} min
                                                {service.priceCents !== null ? ` · $${(service.priceCents / 100).toFixed(2)}` : ''}
                                            </p>
                                            {service.description && <p className="text-xs text-muted">{service.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge tone={service.bookable ? 'success' : 'neutral'}>
                                                {service.bookable ? 'bookable' : 'not bookable'}
                                            </Badge>
                                            {canWrite && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={pending}
                                                        onClick={() => void send(`/api/services/${service.id}`, {
                                                            method: 'PATCH',
                                                            body: { bookable: !service.bookable },
                                                        })}
                                                    >
                                                        {service.bookable ? 'Disable' : 'Enable'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={pending}
                                                        onClick={() => void send(`/api/services/${service.id}`, { method: 'DELETE' })}
                                                    >
                                                        Delete
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                </CardBody>
            </Card>

            {canWrite && (
                <Card>
                    <CardHeader><CardTitle>Add a service</CardTitle></CardHeader>
                    <CardBody>
                        <form onSubmit={create} className="space-y-3">
                            <Field label="Name">
                                {props => <Input {...props} name="name" required minLength={2} />}
                            </Field>
                            <Field label="Duration (minutes)">
                                {props => <Input {...props} name="durationMin" type="number" min={5} max={480} defaultValue={30} required />}
                            </Field>
                            <Field label="Price" hint="Optional. Leave empty to hide pricing.">
                                {props => <Input {...props} name="price" type="number" min={0} step="0.01" />}
                            </Field>
                            <Field label="Description">
                                {props => <Textarea {...props} name="description" />}
                            </Field>
                            <Button type="submit" className="w-full" disabled={pending}>Add service</Button>
                        </form>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
