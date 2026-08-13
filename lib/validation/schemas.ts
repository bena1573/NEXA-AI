import { z } from 'zod';
import { passwordPolicy } from '@/lib/auth/password';

export const email = z.string().trim().toLowerCase().email('Enter a valid email address.');

export const password = z.string()
    .min(passwordPolicy.minLength, passwordPolicy.describe)
    .refine(value => passwordPolicy.isStrong(value), passwordPolicy.describe);

export const signupSchema = z.object({
    name: z.string().trim().min(2, 'Enter your full name.').max(80),
    email,
    password,
    businessName: z.string().trim().min(2, 'Enter your business name.').max(120),
});

export const loginSchema = z.object({
    email,
    password: z.string().min(1, 'Enter your password.'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
    token: z.string().min(10),
    password,
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM.');

export const businessHourSchema = z.object({
    weekday: z.number().int().min(0).max(6),
    closed: z.boolean(),
    opensAt: time.nullable(),
    closesAt: time.nullable(),
});

export const businessProfileSchema = z.object({
    name: z.string().trim().min(2).max(120),
    industry: z.string().trim().max(60).nullish(),
    description: z.string().trim().max(2000).nullish(),
    website: z.string().trim().url('Enter a full URL including https://').nullish().or(z.literal('')),
    phone: z.string().trim().max(40).nullish(),
    email: z.string().trim().email().nullish().or(z.literal('')),
    addressLine: z.string().trim().max(160).nullish(),
    city: z.string().trim().max(80).nullish(),
    country: z.string().trim().max(80).nullish(),
    timezone: z.string().trim().min(1).max(60),
});

export const onboardingSchema = z.object({
    profile: businessProfileSchema,
    hours: z.array(businessHourSchema).length(7),
    services: z.array(z.object({
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().max(500).nullish(),
        durationMin: z.number().int().min(5).max(480),
        priceCents: z.number().int().min(0).max(10_000_000).nullish(),
        bookable: z.boolean().default(true),
    })).max(50),
    faqs: z.array(z.object({
        question: z.string().trim().min(5).max(300),
        answer: z.string().trim().min(2).max(4000),
    })).max(100),
    agent: z.object({
        name: z.string().trim().min(1).max(40),
        personality: z.enum(['PROFESSIONAL', 'FRIENDLY', 'CASUAL', 'FORMAL']),
        responseStyle: z.enum(['SHORT', 'BALANCED', 'DETAILED']),
        greeting: z.string().trim().min(5).max(400),
        instructions: z.string().trim().max(4000),
        escalationRules: z.string().trim().max(2000),
        handoffEmail: z.string().trim().email().nullish().or(z.literal('')),
    }),
});

export const agentSchema = onboardingSchema.shape.agent;

export const serviceSchema = onboardingSchema.shape.services.element;

export const faqSchema = onboardingSchema.shape.faqs.element.extend({
    approved: z.boolean().default(true),
});

export const customerSchema = z.object({
    name: z.string().trim().min(1).max(120).nullish(),
    email: z.string().trim().email().nullish().or(z.literal('')),
    phone: z.string().trim().min(5).max(40).nullish().or(z.literal('')),
    status: z.enum(['NEW', 'ACTIVE', 'RETURNING', 'VIP', 'AT_RISK']).default('NEW'),
    notes: z.string().trim().max(2000).nullish(),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
}).refine(value => Boolean(value.email) || Boolean(value.phone), {
    message: 'Provide an email address or a phone number.',
    path: ['email'],
});

export const appointmentSchema = z.object({
    customerId: z.string().uuid(),
    serviceId: z.string().uuid(),
    startsAt: z.string().datetime({ offset: true }),
    notes: z.string().trim().max(1000).nullish(),
    status: z.enum(['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).default('CONFIRMED'),
});

export const ticketUpdateSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
    assigneeId: z.string().uuid().nullish(),
});

export const inviteSchema = z.object({
    email,
    role: z.enum(['ADMIN', 'AGENT', 'VIEWER']),
});

export const knowledgeTextSchema = z.object({
    title: z.string().trim().min(2).max(160),
    content: z.string().trim().min(20, 'Add at least a couple of sentences.').max(200_000),
});

export const knowledgeUrlSchema = z.object({
    title: z.string().trim().max(160).optional(),
    url: z.string().trim().url('Enter a full URL including https://'),
});

export const publicChatSchema = z.object({
    widgetId: z.string().uuid(),
    conversationId: z.string().uuid().optional(),
    message: z.string().trim().min(1, 'Type a message.').max(2000),
    customer: z.object({
        name: z.string().trim().max(120).optional(),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().max(40).optional(),
    }).optional(),
});

export const simulateCallSchema = z.object({
    fromNumber: z.string().trim().min(4).max(40).default('+15550000000'),
    callId: z.string().uuid().optional(),
    utterance: z.string().trim().min(1).max(2000).optional(),
    action: z.enum(['start', 'say', 'end']),
});
