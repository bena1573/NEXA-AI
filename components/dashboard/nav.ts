import {
    BarChart3,
    BookOpen,
    CalendarCheck,
    LayoutDashboard,
    MessageSquare,
    PhoneCall,
    Settings,
    Ticket,
    Users,
} from 'lucide-react';
import type { Action } from '@/lib/auth/permissions';

export type NavItem = {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    /** Hidden when the member's role cannot perform this action. */
    requires?: Action;
};

export const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
    {
        title: 'Overview',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, requires: 'analytics:read' },
        ],
    },
    {
        title: 'Conversations',
        items: [
            { href: '/dashboard/conversations', label: 'Inbox', icon: MessageSquare },
            { href: '/dashboard/calls', label: 'Calls', icon: PhoneCall },
            { href: '/dashboard/tickets', label: 'Tickets', icon: Ticket },
        ],
    },
    {
        title: 'Operations',
        items: [
            { href: '/dashboard/appointments', label: 'Appointments', icon: CalendarCheck },
            { href: '/dashboard/customers', label: 'Customers', icon: Users },
            { href: '/dashboard/knowledge', label: 'Knowledge', icon: BookOpen },
        ],
    },
    {
        title: 'Workspace',
        items: [
            { href: '/dashboard/settings', label: 'Settings', icon: Settings },
        ],
    },
];
