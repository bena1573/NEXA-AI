/**
 * Demo workspace: Nova Dental Clinic. Idempotent — running it again refreshes
 * the demo business without touching other tenants.
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';
import { ingestDocument } from '../lib/knowledge/ingest';
import { slugify } from '../lib/businesses/create';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'owner@novadental.demo';
const DEMO_PASSWORD = 'NovaDental2026';
const BUSINESS_NAME = 'Nova Dental Clinic';

const SERVICES = [
    { name: 'Routine check-up', durationMin: 30, priceCents: 6500, description: 'Examination, scale and polish.' },
    { name: 'Teeth whitening', durationMin: 60, priceCents: 24_900, description: 'In-clinic whitening session.' },
    { name: 'Emergency appointment', durationMin: 30, priceCents: 9500, description: 'Same-day slot for pain or trauma.' },
    { name: 'Invisalign consultation', durationMin: 45, priceCents: 0, description: 'Free assessment and treatment plan.' },
];

const FAQS = [
    {
        question: 'Do you accept new patients?',
        answer: 'Yes, Nova Dental Clinic is accepting new patients. Your first visit is a 30 minute check-up.',
    },
    {
        question: 'Where is the clinic and is there parking?',
        answer: 'We are at 42 Harbour Street, Bristol. Free patient parking is available behind the building.',
    },
    {
        question: 'What are your opening hours?',
        answer: 'Monday to Friday 09:00 to 18:00, Saturday 09:00 to 13:00. We are closed on Sundays.',
    },
    {
        question: 'How much is a check-up?',
        answer: 'A routine check-up is £65 and includes an examination, scale and polish.',
    },
    {
        question: 'Do you offer emergency appointments?',
        answer: 'Yes. We keep same-day emergency slots for dental pain or trauma; these are £95.',
    },
    {
        question: 'Which payment methods do you take?',
        answer: 'We accept card, cash and monthly dental plans. Treatment over £500 can be split over three payments.',
    },
];

const POLICY_DOCUMENT = `Nova Dental Clinic — patient policies

Cancellations
Appointments can be moved or cancelled free of charge up to 24 hours before the start time.
Cancellations inside 24 hours, and missed appointments, are charged at 50 percent of the treatment price.

Late arrivals
If you arrive more than 10 minutes late we may need to shorten or rebook the appointment so the rest of the day runs on time.

Children and nervous patients
Children under 18 are seen free of charge when a parent is a registered patient.
Nervous patients can request a longer appointment and a pre-treatment consultation at no extra cost.

Complaints
Complaints are handled by the practice manager and acknowledged within two working days.

Data
Patient records are kept for ten years after the last appointment, in line with UK dental record retention guidance.`;

const HOURS = [
    { weekday: 0, closed: true, opensAt: null, closesAt: null },
    { weekday: 1, closed: false, opensAt: '09:00', closesAt: '18:00' },
    { weekday: 2, closed: false, opensAt: '09:00', closesAt: '18:00' },
    { weekday: 3, closed: false, opensAt: '09:00', closesAt: '18:00' },
    { weekday: 4, closed: false, opensAt: '09:00', closesAt: '18:00' },
    { weekday: 5, closed: false, opensAt: '09:00', closesAt: '18:00' },
    { weekday: 6, closed: false, opensAt: '09:00', closesAt: '13:00' },
];

const CUSTOMERS = [
    { name: 'Priya Shah', email: 'priya@example.com', phone: '+447700900111', status: 'RETURNING' as const },
    { name: 'Tom Baker', email: 'tom@example.com', phone: '+447700900222', status: 'ACTIVE' as const },
    { name: 'Lena Fischer', email: 'lena@example.com', phone: '+447700900333', status: 'NEW' as const },
];

async function main() {
    const user = await prisma.user.upsert({
        where: { email: DEMO_EMAIL },
        create: {
            email: DEMO_EMAIL,
            name: 'Dr Ada Nwosu',
            passwordHash: await hashPassword(DEMO_PASSWORD),
            emailVerified: true,
        },
        update: {},
    });

    const slug = slugify(BUSINESS_NAME);
    const existing = await prisma.business.findUnique({ where: { slug } });
    if (existing) {
        // Rebuild the demo tenant from scratch so the seed stays deterministic.
        await prisma.business.delete({ where: { id: existing.id } });
    }

    const business = await prisma.business.create({
        data: {
            name: BUSINESS_NAME,
            slug,
            industry: 'Dental care',
            description: 'A five-chair dental practice in Bristol offering general, cosmetic and emergency dentistry.',
            website: 'https://novadental.example.com',
            phone: '+441179000000',
            email: 'hello@novadental.example.com',
            addressLine: '42 Harbour Street',
            city: 'Bristol',
            country: 'United Kingdom',
            timezone: 'Europe/London',
            demo: true,
            onboardedAt: new Date(),
            memberships: { create: { userId: user.id, role: 'OWNER' } },
            hours: { create: HOURS },
            services: { create: SERVICES },
            faqs: { create: FAQS.map(faq => ({ ...faq, approved: true })) },
            customers: { create: CUSTOMERS },
            subscription: { create: { plan: 'BUSINESS', status: 'ACTIVE' } },
            agent: {
                create: {
                    name: 'Nova',
                    personality: 'FRIENDLY',
                    responseStyle: 'BALANCED',
                    greeting: 'Hi, this is Nova at Nova Dental Clinic. How can I help today?',
                    instructions: 'Always confirm the appointment date, time and service back to the patient. '
                        + 'Never give clinical advice; offer an emergency appointment instead.',
                    escalationRules: 'Hand over to a human for complaints, refunds, or anything involving medication.',
                    handoffEmail: DEMO_EMAIL,
                },
            },
        },
        include: { services: true, customers: true },
    });

    const ctx = { businessId: business.id, userId: user.id, role: 'OWNER' as const };
    await ingestDocument(ctx, {
        title: 'Patient policies',
        type: 'TEXT',
        content: POLICY_DOCUMENT,
    });

    const checkup = business.services.find(service => service.name === 'Routine check-up');
    const whitening = business.services.find(service => service.name === 'Teeth whitening');
    const [priya, tom] = business.customers;

    if (checkup && whitening && priya && tom) {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(10, 0, 0, 0);

        await prisma.appointment.createMany({
            data: [
                {
                    businessId: business.id,
                    customerId: priya.id,
                    serviceId: checkup.id,
                    startsAt: tomorrow,
                    endsAt: new Date(tomorrow.getTime() + checkup.durationMin * 60_000),
                    status: 'CONFIRMED',
                    bookedByAI: true,
                },
                {
                    businessId: business.id,
                    customerId: tom.id,
                    serviceId: whitening.id,
                    startsAt: new Date(tomorrow.getTime() + 4 * 3_600_000),
                    endsAt: new Date(tomorrow.getTime() + 4 * 3_600_000 + whitening.durationMin * 60_000),
                    status: 'REQUESTED',
                },
            ],
        });
    }

    const conversation = await prisma.conversation.create({
        data: {
            businessId: business.id,
            customerId: priya?.id,
            channel: 'CHAT',
            status: 'RESOLVED',
            intent: 'BUSINESS_HOURS',
            resolved: true,
            summary: 'Patient asked about Saturday opening hours and booked a check-up.',
            sentiment: 'POSITIVE',
            messages: {
                create: [
                    { role: 'CUSTOMER', content: 'Are you open on Saturday?' },
                    {
                        role: 'AGENT',
                        content: 'Yes, we are open on Saturdays from 09:00 to 13:00. Would you like me to book a check-up?',
                        confidence: 0.92,
                    },
                    { role: 'CUSTOMER', content: 'Please book me in for a check-up.' },
                    { role: 'AGENT', content: 'Booked — a 30 minute check-up tomorrow at 10:00. See you then!', confidence: 0.9 },
                ],
            },
        },
    });

    await prisma.supportTicket.create({
        data: {
            businessId: business.id,
            conversationId: conversation.id,
            customerId: tom?.id,
            subject: 'Whitening result question',
            body: 'Patient asked whether whitening is safe with a crown — needs a clinician to answer.',
            status: 'OPEN',
            priority: 'HIGH',
            reason: 'SENSITIVE_ISSUE',
        },
    });

    await prisma.usageRecord.createMany({
        data: [
            { businessId: business.id, metric: 'CONVERSATIONS', quantity: 1, period: periodStart() },
            { businessId: business.id, metric: 'VOICE_MINUTES', quantity: 12, period: periodStart() },
        ],
    });

    console.log(`Seeded ${BUSINESS_NAME}. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

function periodStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

main()
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
