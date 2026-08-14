import { Card, CardBody } from '@/components/ui/card';

export function StatCard({
    label,
    value,
    hint,
    icon,
}: {
    label: string;
    value: string;
    hint?: string;
    icon?: React.ReactNode;
}) {
    return (
        <Card>
            <CardBody className="space-y-1">
                <div className="flex items-center justify-between text-muted">
                    <p className="text-xs font-medium uppercase tracking-wider">{label}</p>
                    {icon}
                </div>
                <p className="text-2xl font-semibold">{value}</p>
                {hint && <p className="text-xs text-muted">{hint}</p>}
            </CardBody>
        </Card>
    );
}
