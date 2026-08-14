'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest, type ApiFailure } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';

export function ResetPasswordForm({ token }: { token: string }) {
    const router = useRouter();
    const [failure, setFailure] = useState<ApiFailure | null>(null);
    const [pending, setPending] = useState(false);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setFailure(null);

        const form = new FormData(event.currentTarget);
        const { error } = await apiRequest('/api/auth/reset-password', {
            body: { token, password: String(form.get('password') ?? '') },
        });

        if (error) {
            setFailure(error);
            setPending(false);
            return;
        }

        router.replace('/login');
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {failure && <ErrorState message={failure.message} />}
            <Field
                label="New password"
                hint="At least 10 characters, including a letter and a number."
                error={failure?.fields?.password?.[0]}
            >
                {props => <Input {...props} name="password" type="password" autoComplete="new-password" required minLength={10} />}
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
                {pending ? 'Saving…' : 'Save new password'}
            </Button>
        </form>
    );
}
