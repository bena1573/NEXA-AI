import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from '@/components/auth/signup-form';
import { Card, CardBody } from '@/components/ui/card';

export const metadata: Metadata = {
    title: 'Create your account',
    description: 'Start a NEXA AI workspace and launch an AI support agent for your business.',
};

export default function SignupPage() {
    return (
        <Card>
            <CardBody className="space-y-6">
                <header className="space-y-1">
                    <h2 className="text-xl font-semibold">Create your workspace</h2>
                    <p className="text-sm text-muted">No credit card, no AI keys required.</p>
                </header>
                <SignupForm />
                <p className="text-sm text-muted">
                    Already have an account?{' '}
                    <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                </p>
            </CardBody>
        </Card>
    );
}
