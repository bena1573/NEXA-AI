import { z } from 'zod';
import type { ToolSpec } from '@/lib/ai/types';

/**
 * The AI may only ever call a tool defined here. Names are an allowlist and every
 * argument object is validated with Zod before any database work happens.
 */
export const TOOL_NAMES = [
    'get_business_hours',
    'get_service_information',
    'search_knowledge_base',
    'get_customer',
    'create_customer',
    'check_availability',
    'create_appointment',
    'get_order_status',
    'create_support_ticket',
    'transfer_to_human',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');
const isoDateTime = z.string().datetime({ offset: true }).or(
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'Use an ISO date-time.'),
);

export const TOOL_SCHEMAS = {
    get_business_hours: z.object({
        weekday: z.number().int().min(0).max(6).optional(),
    }),
    get_service_information: z.object({
        name: z.string().trim().min(2).max(120).optional(),
    }),
    search_knowledge_base: z.object({
        query: z.string().trim().min(3).max(500),
    }),
    get_customer: z.object({
        email: z.string().trim().email().optional(),
        phone: z.string().trim().min(6).max(32).optional(),
    }).refine(value => Boolean(value.email ?? value.phone), {
        message: 'Provide an email or a phone number.',
    }),
    create_customer: z.object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().min(6).max(32).optional(),
    }).refine(value => Boolean(value.email ?? value.phone), {
        message: 'Provide an email or a phone number.',
    }),
    check_availability: z.object({
        serviceName: z.string().trim().min(2).max(120),
        date: isoDate,
    }),
    create_appointment: z.object({
        serviceName: z.string().trim().min(2).max(120),
        startsAt: isoDateTime,
        customerName: z.string().trim().min(2).max(120),
        customerEmail: z.string().trim().email().optional(),
        customerPhone: z.string().trim().min(6).max(32).optional(),
        notes: z.string().trim().max(1000).optional(),
    }).refine(value => Boolean(value.customerEmail ?? value.customerPhone), {
        message: 'Provide a customer email or phone number.',
    }),
    get_order_status: z.object({
        orderReference: z.string().trim().min(3).max(64),
    }),
    create_support_ticket: z.object({
        subject: z.string().trim().min(3).max(160),
        body: z.string().trim().min(3).max(4000),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
    }),
    transfer_to_human: z.object({
        reason: z.enum([
            'ANGRY_CUSTOMER', 'REFUND_REQUEST', 'LEGAL_ISSUE', 'UNKNOWN_QUESTION',
            'HUMAN_REQUESTED', 'SENSITIVE_ISSUE', 'LOW_CONFIDENCE',
        ]),
        summary: z.string().trim().min(3).max(1000),
    }),
} as const satisfies Record<ToolName, z.ZodTypeAny>;

export type ToolArgs = {
    [K in ToolName]: z.infer<(typeof TOOL_SCHEMAS)[K]>;
};

export function isToolName(name: string): name is ToolName {
    return (TOOL_NAMES as readonly string[]).includes(name);
}

/** JSON-Schema-ish descriptors sent to the model. */
export const TOOL_SPECS: ToolSpec[] = [
    spec('get_business_hours', 'Look up the opening hours of the business.', {
        weekday: { type: 'integer', minimum: 0, maximum: 6, description: '0 = Sunday' },
    }, []),
    spec('get_service_information', 'Look up services, durations and prices offered by the business.', {
        name: { type: 'string', description: 'Optional service name to filter by.' },
    }, []),
    spec('search_knowledge_base', 'Search the approved business knowledge base for an answer.', {
        query: { type: 'string' },
    }, ['query']),
    spec('get_customer', 'Find an existing customer by email or phone.', {
        email: { type: 'string' },
        phone: { type: 'string' },
    }, []),
    spec('create_customer', 'Create a customer record after collecting their contact details.', {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
    }, ['name']),
    spec('check_availability', 'List available appointment slots for a service on a date.', {
        serviceName: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
    }, ['serviceName', 'date']),
    spec('create_appointment', 'Book an appointment in an available slot.', {
        serviceName: { type: 'string' },
        startsAt: { type: 'string', description: 'ISO date-time of an available slot.' },
        customerName: { type: 'string' },
        customerEmail: { type: 'string' },
        customerPhone: { type: 'string' },
        notes: { type: 'string' },
    }, ['serviceName', 'startsAt', 'customerName']),
    spec('get_order_status', 'Look up the status of an order by its reference.', {
        orderReference: { type: 'string' },
    }, ['orderReference']),
    spec('create_support_ticket', 'Open a support ticket for the team to follow up on.', {
        subject: { type: 'string' },
        body: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
    }, ['subject', 'body']),
    spec('transfer_to_human', 'Hand the conversation to a human team member.', {
        reason: {
            type: 'string',
            enum: ['ANGRY_CUSTOMER', 'REFUND_REQUEST', 'LEGAL_ISSUE', 'UNKNOWN_QUESTION',
                'HUMAN_REQUESTED', 'SENSITIVE_ISSUE', 'LOW_CONFIDENCE'],
        },
        summary: { type: 'string' },
    }, ['reason', 'summary']),
];

function spec(
    name: ToolName,
    description: string,
    properties: Record<string, unknown>,
    required: string[],
): ToolSpec {
    return {
        name,
        description,
        parameters: { type: 'object', properties, required, additionalProperties: false },
    };
}
