'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest, type ApiFailure } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';

export function LoginForm() {
    const router = useRouter();
    const [failure, setFailure] = useState<ApiFailure | null>(null);
    const [pending, setPending] = useState(false);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setFailure(null);

        const form = new FormData(event.currentTarget);
        const { data, error } = await apiRequest<{ onboarded: boolean }>('/api/auth/login', {
            body: {
                email: String(form.get('email') ?? ''),
                password: String(form.get('password') ?? ''),
            },
        });

        if (error) {
            setFailure(error);
            setPending(false);
            return;
        }

        router.replace(data.onboarded ? '/dashboard' : '/onboarding');
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {failure && <ErrorState message={failure.message} />}

            <Field label="Email" error={failure?.fields?.email?.[0]}>
                {props => <Input {...props} name="email" type="email" autoComplete="email" required />}
            </Field>

            <Field label="Password" error={failure?.fields?.password?.[0]}>
                {props => <Input {...props} name="password" type="password" autoComplete="current-password" required />}
            </Field>

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
            </Button>
        </form>
    );
}
