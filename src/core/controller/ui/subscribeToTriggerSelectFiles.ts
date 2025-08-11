import type { Empty, EmptyRequest } from "@shared/proto/cline/common"
import { getRequestRegistry, type StreamingResponseHandler } from "../grpc-handler"
import type { Controller } from "../index"

// Keep track of active triggerSelectFiles subscriptions
const activeTriggerSelectFilesSubscriptions = new Set<StreamingResponseHandler<Empty>>()

/**
 * Subscribe to triggerSelectFiles events
 * @param _controller The controller instance
 * @param request The request (empty for this trigger)
 * @param responseStream The streaming response handler
 * @param requestId The ID of the request (passed by the gRPC handler)
 */
export async function subscribeToTriggerSelectFiles(
	_controller: Controller,
	request: EmptyRequest,
	responseStream: StreamingResponseHandler<Empty>,
	requestId?: string,
): Promise<void> {
	// No client ID needed for this global trigger
	activeTriggerSelectFilesSubscriptions.add(responseStream)

	// Register cleanup when the connection is closed
	const cleanup = () => {
		activeTriggerSelectFilesSubscriptions.delete(responseStream)
		console.log("[DEBUG] Cleaned up triggerSelectFiles subscription")
	}

	// Register the cleanup function with the request registry if we have a requestId
	if (requestId) {
		getRequestRegistry().registerRequest(requestId, cleanup, { type: "triggerSelectFiles_subscription" }, responseStream)
	}
}

/**
 * Send a triggerSelectFiles event to all active subscribers
 */
export async function sendTriggerSelectFilesEvent(): Promise<void> {
	const promises = Array.from(activeTriggerSelectFilesSubscriptions).map(async (responseStream) => {
		try {
			const event: Empty = {}
			await responseStream(
				event,
				false, // Not the last message
			)
			console.log("[DEBUG] sending triggerSelectFiles event")
		} catch (error) {
			console.error("Error sending triggerSelectFiles event:", error)
			// Remove the subscription if there was an error
			activeTriggerSelectFilesSubscriptions.delete(responseStream)
		}
	})

	await Promise.all(promises)
}
