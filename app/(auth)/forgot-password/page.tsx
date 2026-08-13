import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Card, CardBody } from '@/components/ui/card';

export const metadata: Metadata = {
    title: 'Reset your password',
    description: 'Request a password reset link for your NEXA AI account.',
};

export default function ForgotPasswordPage() {
    return (
        <Card>
            <CardBody className="space-y-6">
                <header className="space-y-1">
                    <h2 className="text-xl font-semibold">Reset your password</h2>
                    <p className="text-sm text-muted">We will send a reset link if the email belongs to an account.</p>
                </header>
                <ForgotPasswordForm />
                <Link href="/login" className="text-sm text-primary hover:underline">Back to sign in</Link>
            </CardBody>
        </Card>
    );
}
