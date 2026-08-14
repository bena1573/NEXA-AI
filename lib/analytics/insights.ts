import type { DailyPoint, Overview } from '@/lib/analytics/metrics';

export type Insight = {
    id: string;
    tone: 'positive' | 'attention' | 'neutral';
    title: string;
    detail: string;
};

type InsightInput = {
    overview: Overview;
    series: DailyPoint[];
    topIntents: Array<{ intent: string; count: number }>;
    unanswered: Array<{ question: string }>;
    knowledgeDocuments: number;
    approvedFaqs: number;
};

const HEALTHY_RESOLVED_RATE = 0.7;
const HIGH_ESCALATION_RATE = 0.3;

function trend(series: DailyPoint[]): number {
    if (series.length < 4) return 0;
    const half = Math.floor(series.length / 2);
    const earlier = series.slice(0, half).reduce((total, point) => total + point.conversations, 0);
    const later = series.slice(half).reduce((total, point) => total + point.conversations, 0);
    if (earlier === 0) return later === 0 ? 0 : 1;
    return (later - earlier) / earlier;
}

/**
 * Deterministic, source-backed insights: every statement is derived from stored
 * metrics so nothing here can be a fabricated claim about the business.
 */
export function buildInsights(input: InsightInput): Insight[] {
    const { overview, series, topIntents, unanswered, knowledgeDocuments, approvedFaqs } = input;
    const insights: Insight[] = [];

    if (overview.conversations === 0) {
        return [{
            id: 'no-traffic',
            tone: 'neutral',
            title: 'No conversations in this period',
            detail: 'Install the chat widget on your website or start a simulated call to see analytics here.',
        }];
    }

    const escalationRate = overview.escalations / overview.conversations;

    insights.push(
        overview.resolvedRate >= HEALTHY_RESOLVED_RATE
            ? {
                id: 'resolution',
                tone: 'positive',
                title: `${Math.round(overview.resolvedRate * 100)}% of conversations resolved without a human`,
                detail: 'Your agent is handling most requests on its own.',
            }
            : {
                id: 'resolution',
                tone: 'attention',
                title: `Only ${Math.round(overview.resolvedRate * 100)}% of conversations resolved automatically`,
                detail: 'Adding the missing information below to your knowledge base is the fastest way to raise this.',
            },
    );

    if (escalationRate >= HIGH_ESCALATION_RATE) {
        insights.push({
            id: 'escalations',
            tone: 'attention',
            title: `${overview.escalations} conversations went to a human`,
            detail: 'Review the escalated threads in the inbox for repeated questions your agent could not answer.',
        });
    }

    if (unanswered.length > 0) {
        insights.push({
            id: 'knowledge-gap',
            tone: 'attention',
            title: 'Unanswered questions detected',
            detail: `Latest gap: “${unanswered[0].question.slice(0, 160)}”. Add an approved FAQ or document covering it.`,
        });
    }

    if (knowledgeDocuments === 0 && approvedFaqs === 0) {
        insights.push({
            id: 'empty-knowledge',
            tone: 'attention',
            title: 'Your agent has no approved knowledge',
            detail: 'Until you upload documents or approve FAQs, the agent can only offer to hand customers to your team.',
        });
    }

    const growth = trend(series);
    if (Math.abs(growth) >= 0.2) {
        insights.push({
            id: 'volume-trend',
            tone: growth > 0 ? 'positive' : 'neutral',
            title: `Conversation volume ${growth > 0 ? 'up' : 'down'} ${Math.abs(Math.round(growth * 100))}% in the second half of this period`,
            detail: growth > 0
                ? 'More customers are reaching your agent than at the start of the period.'
                : 'Traffic slowed compared with the start of the period.',
        });
    }

    if (topIntents.length > 0) {
        const top = topIntents[0];
        insights.push({
            id: 'top-intent',
            tone: 'neutral',
            title: `Most common request: ${top.intent.replace(/_/g, ' ').toLowerCase()}`,
            detail: `${top.count} of ${overview.conversations} conversations. Make sure this answer is exactly how you want it phrased.`,
        });
    }

    if (overview.appointments > 0) {
        insights.push({
            id: 'appointments',
            tone: 'positive',
            title: `${overview.appointments} appointments booked`,
            detail: 'Bookings created through the agent and your team in this period.',
        });
    }

    return insights;
}
