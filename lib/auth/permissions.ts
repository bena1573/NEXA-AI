import type { Role } from '@prisma/client';

/**
 * Every privileged action in the product. Route handlers assert one of these;
 * hiding UI is cosmetic only.
 */
export type Action =
    | 'business:read'
    | 'business:update'
    | 'business:delete'
    | 'agent:read'
    | 'agent:update'
    | 'knowledge:read'
    | 'knowledge:write'
    | 'conversation:read'
    | 'conversation:reply'
    | 'conversation:assign'
    | 'customer:read'
    | 'customer:write'
    | 'appointment:read'
    | 'appointment:write'
    | 'ticket:read'
    | 'ticket:write'
    | 'analytics:read'
    | 'team:read'
    | 'team:invite'
    | 'team:manage'
    | 'billing:read'
    | 'billing:manage'
    | 'integration:read'
    | 'integration:manage';

const VIEWER: Action[] = [
    'business:read',
    'agent:read',
    'knowledge:read',
    'conversation:read',
    'customer:read',
    'appointment:read',
    'ticket:read',
    'analytics:read',
    'team:read',
    'billing:read',
    'integration:read',
];

const AGENT: Action[] = [
    ...VIEWER,
    'conversation:reply',
    'conversation:assign',
    'customer:write',
    'appointment:write',
    'ticket:write',
];

const ADMIN: Action[] = [
    ...AGENT,
    'business:update',
    'agent:update',
    'knowledge:write',
    'team:invite',
    'integration:manage',
];

const OWNER: Action[] = [
    ...ADMIN,
    'business:delete',
    'team:manage',
    'billing:manage',
];

const MATRIX: Record<Role, Action[]> = {
    VIEWER,
    AGENT,
    ADMIN,
    OWNER,
};

export function can(role: Role, action: Action): boolean {
    return MATRIX[role].includes(action);
}

export function allowedActions(role: Role): Action[] {
    return [...MATRIX[role]];
}

export const ROLE_LABELS: Record<Role, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    AGENT: 'Agent',
    VIEWER: 'Viewer',
};
