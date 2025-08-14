import { Controller } from "../index"
import { AddFileMentionToChatRequest, Empty } from "@/shared/proto/index.cline"
import { telemetryService } from "@/services/posthog/PostHogClientProvider"
import * as CommandHelpers from "./command-helpers"

export async function addFileMentionToChat(controller: Controller, request: AddFileMentionToChatRequest): Promise<Empty> {
	// 1. Define the context from the gRPC request.
	const context: CommandHelpers.CommandContext = {
		filePath: request.filePath,
	}

	// 2. Format the context into the final string using the helper.
	const formattedText = await CommandHelpers.formatContext(context, controller)

	// 3. Use the controller's central dispatch method to perform the action.
	await controller.dispatchChatAction(formattedText, request.submit || false)

	// 4. Record telemetry.
	telemetryService.captureButtonClick("command_addFileMentionToChat", controller.task?.ulid)

	return {}
}
