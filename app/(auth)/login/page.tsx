import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardBody } from '@/components/ui/card';
import { env } from '@/lib/env';

export const metadata: Metadata = {
    title: 'Sign in',
    description: 'Sign in to your NEXA AI workspace.',
};

export default function LoginPage() {
    return (
        <Card>
            <CardBody className="space-y-6">
                <header className="space-y-1">
                    <h2 className="text-xl font-semibold">Welcome back</h2>
                    <p className="text-sm text-muted">Sign in to your workspace.</p>
                </header>
                <LoginForm />
                <div className="flex items-center justify-between text-sm text-muted">
                    <Link href="/forgot-password" className="hover:text-foreground">Forgot password?</Link>
                    <Link href="/signup" className="text-primary hover:underline">Create an account</Link>
                </div>
                {env.DEMO_MODE && (
                    <p className="rounded-md border border-accent/40 bg-accent/10 p-3 text-xs text-muted">
                        Demo mode: sign in with <span className="font-mono text-foreground">owner@novadental.example</span>{' '}
                        / <span className="font-mono text-foreground">NovaDental2024</span> after running{' '}
                        <span className="font-mono text-foreground">npm run db:seed</span>.
                    </p>
                )}
            </CardBody>
        </Card>
    );
}
