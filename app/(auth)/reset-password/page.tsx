import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Card, CardBody } from '@/components/ui/card';

export const metadata: Metadata = {
    title: 'Choose a new password',
    robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;

    return (
        <Card>
            <CardBody className="space-y-6">
                <header className="space-y-1">
                    <h2 className="text-xl font-semibold">Choose a new password</h2>
                    <p className="text-sm text-muted">Signing in again will use your new password everywhere.</p>
                </header>
                {token
                    ? <ResetPasswordForm token={token} />
                    : <p className="text-sm text-danger">This link is missing its reset token. Request a new email.</p>}
                <Link href="/login" className="text-sm text-primary hover:underline">Back to sign in</Link>
            </CardBody>
        </Card>
    );
}
