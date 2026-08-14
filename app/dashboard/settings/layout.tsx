import { SettingsNav } from '@/components/settings/settings-nav';
import { requirePermission } from '@/lib/auth/context';
import { allowedActions } from '@/lib/auth/permissions';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
    const ctx = await requirePermission('business:read');

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold">Settings</h1>
                <p className="text-sm text-muted">Your business, your agent and your workspace.</p>
            </header>
            <SettingsNav allowed={allowedActions(ctx.role)} />
            {children}
        </div>
    );
}
