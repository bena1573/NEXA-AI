import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type {
    CallHandle,
    CreateCallInput,
    TransferInput,
    VoiceProvider,
} from '@/lib/voice/types';

const API_ROOT = 'https://api.twilio.com/2010-04-01';

type CallResource = { sid: string; status: string };

/**
 * Real telephony. Only selected when VOICE_PROVIDER_API_KEY/SECRET are present and
 * demo mode is off; otherwise the simulator is used and the UI says so.
 */
export class TwilioVoiceProvider implements VoiceProvider {
    readonly id = 'twilio' as const;
    readonly canPlaceRealCalls = true;

    constructor(
        private readonly accountSid: string,
        private readonly authToken: string,
        private readonly fromNumber: string,
    ) {}

    private async request<T>(path: string, form: Record<string, string>): Promise<T> {
        const response = await fetch(`${API_ROOT}/Accounts/${this.accountSid}${path}`, {
            method: 'POST',
            headers: {
                authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
                'content-type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(form),
        });

        if (!response.ok) {
            logger.error('voice_provider_error', { path, status: response.status });
            throw new Error(`Voice provider responded with ${response.status}`);
        }
        return response.json() as Promise<T>;
    }

    private static toStatus(status: string): CallHandle['status'] {
        if (status === 'queued' || status === 'ringing') return 'RINGING';
        if (status === 'in-progress') return 'IN_PROGRESS';
        if (status === 'completed') return 'COMPLETED';
        return 'FAILED';
    }

    async createCall(input: CreateCallInput): Promise<CallHandle> {
        const call = await this.request<CallResource>('/Calls.json', {
            To: input.toNumber,
            From: input.fromNumber ?? this.fromNumber,
            Url: `${env.APP_URL}/api/voice/webhook`,
        });
        return {
            providerCallId: call.sid,
            status: TwilioVoiceProvider.toStatus(call.status),
            simulated: false,
        };
    }

    async answerCall(_providerCallId: string, greeting: string): Promise<{ instructions: string }> {
        // TwiML: speak the greeting, then stream the caller's speech back to us.
        return {
            instructions: '<?xml version="1.0" encoding="UTF-8"?><Response>'
                + `<Say>${escapeXml(greeting)}</Say>`
                + `<Gather input="speech" action="${env.APP_URL}/api/voice/webhook" speechTimeout="auto"/>`
                + '</Response>',
        };
    }

    async transferCall(input: TransferInput): Promise<CallHandle> {
        const call = await this.request<CallResource>(`/Calls/${input.providerCallId}.json`, {
            Twiml: `<Response><Dial>${escapeXml(input.toNumber)}</Dial></Response>`,
        });
        return {
            providerCallId: call.sid,
            status: TwilioVoiceProvider.toStatus(call.status),
            simulated: false,
        };
    }

    async endCall(providerCallId: string): Promise<CallHandle> {
        const call = await this.request<CallResource>(`/Calls/${providerCallId}.json`, {
            Status: 'completed',
        });
        return { providerCallId: call.sid, status: 'COMPLETED', simulated: false };
    }

    async getCallRecording(providerCallId: string): Promise<string | null> {
        const response = await fetch(
            `${API_ROOT}/Accounts/${this.accountSid}/Calls/${providerCallId}/Recordings.json`,
            {
                headers: {
                    authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
                },
            },
        );
        if (!response.ok) return null;

        const data = await response.json() as { recordings?: Array<{ sid: string }> };
        const sid = data.recordings?.[0]?.sid;
        return sid ? `${API_ROOT}/Accounts/${this.accountSid}/Recordings/${sid}.mp3` : null;
    }

    async verifyWebhook(request: { body: string; signature: string | null; url: string }): Promise<boolean> {
        if (!request.signature) return false;

        const expected = createHmac('sha1', env.VOICE_WEBHOOK_SECRET ?? this.authToken)
            .update(request.url + request.body)
            .digest('base64');

        const provided = Buffer.from(request.signature);
        const computed = Buffer.from(expected);
        return provided.length === computed.length && timingSafeEqual(provided, computed);
    }
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
