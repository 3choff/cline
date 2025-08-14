import { Controller } from "../index"
import { AddPromptToChatRequest, Empty } from "@/shared/proto/index.cline"
import { telemetryService } from "@/services/posthog/PostHogClientProvider"
import * as CommandHelpers from "./command-helpers"

export async function addPromptToChat(controller: Controller, request: AddPromptToChatRequest): Promise<Empty> {
	// This handler's job is to format and dispatch the action.

	// 1. Define the context based on the gRPC request.
	const context: CommandHelpers.CommandContext = {
		prompt: request.prompt,
	}

	// 2. Format the context into the final string.
	const formattedText = await CommandHelpers.formatContext(context, controller)

	// 3. Use the controller's dispatch method to perform the action.
	await controller.dispatchChatAction(formattedText, request.submit || false)

	// 4. Record telemetry.
	telemetryService.captureButtonClick("command_addPromptToChat", controller.task?.ulid)

	return {}
}
