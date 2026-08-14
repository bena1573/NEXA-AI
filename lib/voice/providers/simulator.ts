import { randomUUID } from 'node:crypto';
import type {
    CallHandle,
    CreateCallInput,
    TransferInput,
    VoiceProvider,
} from '@/lib/voice/types';

/**
 * Default voice provider. It carries no audio: the call simulator drives the same
 * agent loop over text so the voice experience is fully testable without
 * telephony credentials. Every call it returns is flagged `simulated`.
 */
export class SimulatorVoiceProvider implements VoiceProvider {
    readonly id = 'simulator' as const;
    readonly canPlaceRealCalls = false;

    async createCall(_input: CreateCallInput): Promise<CallHandle> {
        return {
            providerCallId: `sim_${randomUUID()}`,
            status: 'RINGING',
            simulated: true,
        };
    }

    async answerCall(_providerCallId: string, greeting: string): Promise<{ instructions: string }> {
        return { instructions: greeting };
    }

    async transferCall(input: TransferInput): Promise<CallHandle> {
        return { providerCallId: input.providerCallId, status: 'COMPLETED', simulated: true };
    }

    async endCall(providerCallId: string): Promise<CallHandle> {
        return { providerCallId, status: 'COMPLETED', simulated: true };
    }

    async getCallRecording(): Promise<string | null> {
        // Simulated calls have a transcript, never an audio recording.
        return null;
    }

    async verifyWebhook(): Promise<boolean> {
        return false;
    }
}
