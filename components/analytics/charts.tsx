'use client';

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const AXIS = { stroke: 'rgba(148,163,184,0.6)', fontSize: 12 };
const GRID = 'rgba(148,163,184,0.15)';
const SLICE_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#f43f5e', '#34d399'];

const TOOLTIP_STYLE = {
    background: 'rgb(15 23 42)',
    border: '1px solid rgba(148,163,184,0.3)',
    borderRadius: 8,
    fontSize: 12,
};

export function ConversationTrend({
    data,
}: {
    data: Array<{ date: string; conversations: number; resolved: number; escalated: number }>;
}) {
    return (
        <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                    <linearGradient id="conversations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={AXIS} tickFormatter={value => String(value).slice(5)} />
                <YAxis tick={AXIS} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                    type="monotone"
                    dataKey="conversations"
                    name="Conversations"
                    stroke="#6366f1"
                    fill="url(#conversations)"
                    strokeWidth={2}
                />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#34d399" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="escalated" name="Escalated" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export function ChannelSplit({ data }: { data: Array<{ channel: string; count: number }> }) {
    return (
        <ResponsiveContainer width="100%" height={240}>
            <PieChart>
                <Pie data={data} dataKey="count" nameKey="channel" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {data.map((entry, index) => (
                        <Cell key={entry.channel} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
        </ResponsiveContainer>
    );
}

export function IntentBars({ data }: { data: Array<{ intent: string; count: number }> }) {
    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 24 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={AXIS} allowDecimals={false} />
                <YAxis
                    type="category"
                    dataKey="intent"
                    tick={AXIS}
                    width={120}
                    tickFormatter={value => String(value).replace(/_/g, ' ').toLowerCase()}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Conversations" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
