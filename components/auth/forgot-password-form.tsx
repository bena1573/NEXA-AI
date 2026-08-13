'use client';

import { useState } from 'react';
import { apiRequest, type ApiFailure } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';

export function ForgotPasswordForm() {
    const [failure, setFailure] = useState<ApiFailure | null>(null);
    const [sent, setSent] = useState(false);
    const [pending, setPending] = useState(false);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setFailure(null);

        const form = new FormData(event.currentTarget);
        const { error } = await apiRequest('/api/auth/forgot-password', {
            body: { email: String(form.get('email') ?? '') },
        });

        setPending(false);
        if (error) {
            setFailure(error);
            return;
        }
        setSent(true);
    }

    if (sent) {
        return (
            <p role="status" className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
                If that email belongs to an account, a reset link is on its way.
            </p>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {failure && <ErrorState message={failure.message} />}
            <Field label="Email" error={failure?.fields?.email?.[0]}>
                {props => <Input {...props} name="email" type="email" autoComplete="email" required />}
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
                {pending ? 'Sending…' : 'Send reset link'}
            </Button>
        </form>
    );
}
