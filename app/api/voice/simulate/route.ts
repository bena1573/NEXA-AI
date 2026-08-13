import { badRequest, notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { endCall, speakToCall, startCall } from '@/lib/voice/calls';
import { simulateCallSchema } from '@/lib/validation/schemas';

export const POST = route(async (request: Request) => {
    const ctx = await requirePermission('conversation:reply');
    const input = await parseJson(request, simulateCallSchema);

    if (input.action === 'start') {
        const call = await startCall({
            businessId: ctx.businessId,
            fromNumber: input.fromNumber ?? '+15550000000',
        });
        return ok(call, 201);
    }

    if (!input.callId) throw badRequest('Start a call first.');

    if (input.action === 'say') {
        if (!input.utterance) throw badRequest('Say something to the agent.');
        const reply = await speakToCall({
            businessId: ctx.businessId,
            callId: input.callId,
            utterance: input.utterance,
        });
        if (!reply) throw notFound('That call has already ended.');
        return ok(reply);
    }

    const ended = await endCall({ businessId: ctx.businessId, callId: input.callId });
    if (!ended) throw notFound('That call no longer exists.');
    return ok({ ended: true });
});
