'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';

export function CustomerForm() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function create(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        setPending(true);
        setError(null);
        const { error: failure } = await apiRequest('/api/customers', {
            body: {
                name: String(data.get('name') ?? '') || null,
                email: String(data.get('email') ?? ''),
                phone: String(data.get('phone') ?? ''),
                notes: String(data.get('notes') ?? '') || null,
            },
        });
        setPending(false);

        if (failure) {
            setError(failure.message);
            return;
        }
        form.reset();
        router.refresh();
    }

    return (
        <Card>
            <CardHeader><CardTitle>Add a customer</CardTitle></CardHeader>
            <CardBody>
                <form onSubmit={create} className="space-y-3">
                    {error && <ErrorState message={error} />}
                    <Field label="Name">
                        {props => <Input {...props} name="name" autoComplete="name" />}
                    </Field>
                    <Field label="Email" hint="An email address or a phone number is required.">
                        {props => <Input {...props} name="email" type="email" />}
                    </Field>
                    <Field label="Phone">
                        {props => <Input {...props} name="phone" type="tel" />}
                    </Field>
                    <Field label="Notes">
                        {props => <Textarea {...props} name="notes" />}
                    </Field>
                    <Button type="submit" className="w-full" disabled={pending}>Save customer</Button>
                </form>
            </CardBody>
        </Card>
    );
}
