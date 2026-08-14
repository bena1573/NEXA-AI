import { env } from '@/lib/env';
import type { VoiceProvider } from '@/lib/voice/types';
import { SimulatorVoiceProvider } from '@/lib/voice/providers/simulator';
import { TwilioVoiceProvider } from '@/lib/voice/providers/twilio';

let cached: VoiceProvider | null = null;

export function getVoiceProvider(): VoiceProvider {
    if (cached) return cached;

    const hasCredentials = Boolean(
        env.VOICE_PROVIDER_API_KEY && env.VOICE_PROVIDER_API_SECRET && env.VOICE_PROVIDER_PHONE_NUMBER,
    );

    cached = env.voiceProvider === 'twilio' && hasCredentials
        ? new TwilioVoiceProvider(
            env.VOICE_PROVIDER_API_KEY as string,
            env.VOICE_PROVIDER_API_SECRET as string,
            env.VOICE_PROVIDER_PHONE_NUMBER as string,
        )
        : new SimulatorVoiceProvider();

    return cached;
}

export function resetVoiceProvider(): void {
    cached = null;
}

export type { VoiceProvider };
