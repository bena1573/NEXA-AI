'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest, type ApiFailure } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';

export function SignupForm() {
    const router = useRouter();
    const [failure, setFailure] = useState<ApiFailure | null>(null);
    const [pending, setPending] = useState(false);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setFailure(null);

        const form = new FormData(event.currentTarget);
        const { error } = await apiRequest('/api/auth/signup', {
            body: {
                name: String(form.get('name') ?? ''),
                email: String(form.get('email') ?? ''),
                password: String(form.get('password') ?? ''),
                businessName: String(form.get('businessName') ?? ''),
            },
        });

        if (error) {
            setFailure(error);
            setPending(false);
            return;
        }

        router.replace('/onboarding');
    }

    const fieldError = (name: string) => failure?.fields?.[name]?.[0];

    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {failure && !failure.fields && <ErrorState message={failure.message} />}

            <Field label="Your name" error={fieldError('name')}>
                {props => <Input {...props} name="name" autoComplete="name" required placeholder="Sara Bekele" />}
            </Field>

            <Field label="Business name" error={fieldError('businessName')}>
                {props => <Input {...props} name="businessName" autoComplete="organization" required placeholder="Nova Dental Clinic" />}
            </Field>

            <Field label="Work email" error={fieldError('email')}>
                {props => <Input {...props} name="email" type="email" autoComplete="email" required placeholder="you@business.com" />}
            </Field>

            <Field
                label="Password"
                hint="At least 10 characters, including a letter and a number."
                error={fieldError('password')}
            >
                {props => <Input {...props} name="password" type="password" autoComplete="new-password" required minLength={10} />}
            </Field>

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
                {pending ? 'Creating workspace…' : 'Create workspace'}
            </Button>
        </form>
    );
}
