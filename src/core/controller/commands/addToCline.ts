import { Controller } from "../index"
import { AddToClineRequest, Empty } from "@/shared/proto/index.cline"
import { telemetryService } from "@/services/posthog/PostHogClientProvider"
import * as CommandHelpers from "./command-helpers"

export async function addToCline(controller: Controller, request: AddToClineRequest): Promise<Empty> {
	// 1. Create the context object from the incoming gRPC request.
	const context: CommandHelpers.CommandContext = {
		prompt: request.prompt,
		filePath: request.filePath,
		codeSelection: request.selectedText ? { text: request.selectedText, languageId: request.language || "" } : undefined,
		// diagnostics will need to be converted from proto format to vscode format if the helper expects that.
		// For now, let's assume formatContext is updated to handle proto diagnostics.
		diagnostics: request.diagnostics,
	}

	// 2. Use your helper to format the context into a single string.
	const formattedText = await CommandHelpers.formatContext(context, controller)

	// 3. Use the controller's central dispatch method to perform the action.
	await controller.dispatchChatAction(formattedText, request.submit || false)

	// 4. Record telemetry.
	telemetryService.captureButtonClick("command_addToCline", controller.task?.ulid)

	return {}
}
