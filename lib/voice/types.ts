export type VoiceProviderId = 'simulator' | 'twilio';

export type CreateCallInput = {
    businessId: string;
    toNumber: string;
    fromNumber?: string;
};

export type CallHandle = {
    providerCallId: string;
    status: 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    /** False only when a real telephony provider carried the call. */
    simulated: boolean;
};

export type TransferInput = {
    providerCallId: string;
    toNumber: string;
};

/**
 * Telephony is abstracted so the app never depends on one vendor and so demo
 * mode can run the whole voice experience locally. `simulated: true` must be
 * surfaced in the UI — the platform never claims a real call happened.
 */
export interface VoiceProvider {
    readonly id: VoiceProviderId;
    readonly canPlaceRealCalls: boolean;

    createCall(input: CreateCallInput): Promise<CallHandle>;
    answerCall(providerCallId: string, greeting: string): Promise<{ instructions: string }>;
    transferCall(input: TransferInput): Promise<CallHandle>;
    endCall(providerCallId: string): Promise<CallHandle>;
    getCallRecording(providerCallId: string): Promise<string | null>;
    verifyWebhook(request: { body: string; signature: string | null; url: string }): Promise<boolean>;
}
