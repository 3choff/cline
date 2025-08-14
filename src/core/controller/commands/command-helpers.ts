import * as vscode from "vscode"
import pWaitFor from "p-wait-for"
import { Controller } from ".." // Adjust path if needed
import { WebviewProvider } from "../../webview"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"
import { sendFocusChatInputEvent } from "../ui/subscribeToFocusChatInput"
import { Diagnostic, DiagnosticSeverity } from "@/shared/proto/index.cline"

/**
 * Ensures a Cline webview is visible and ready, then returns its controller.
 * This function is the single source of truth for activating and finding the correct webview.
 * @returns The active Controller instance if a view is found/focused, otherwise null.
 */
export async function ensureClineViewIsVisible(): Promise<Controller | null> {
	// 1. Trigger the focus command to activate the sidebar or a tab.
	await vscode.commands.executeCommand("cline.focusChatInput")

	// 2. Get the last active webview instance.
	const activeWebview = WebviewProvider.getLastActiveInstance()

	// 3. Wait for it to become available.
	try {
		await pWaitFor(() => !!WebviewProvider.getLastActiveInstance(), { timeout: 3000 })
	} catch (error) {
		console.error("Timeout waiting for Cline webview to become available.", error)
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: "Could not activate Cline view. Please try opening it manually.",
		})
		return null
	}

	// 4. Double-check and get the client ID.
	const clientId = activeWebview?.getClientId()
	if (!activeWebview || !clientId) {
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: "Could not find an active Cline chat window.",
		})
		return null
	}

	// 5. Explicitly send the focus event to the webview UI.
	await sendFocusChatInputEvent(clientId)

	// 6. Return the controller.
	return activeWebview.controller
}

/**
 * Defines the structure for different types of context that can be formatted.
 */
export interface CommandContext {
	prompt?: string
	filePath?: string
	codeSelection?: { text: string; languageId: string }
	terminalOutput?: string
	diagnostics?: Diagnostic[]
}

/**
 * Formats various context sources into a single, formatted string ready for the chat input.
 * @param context An object containing the different types of context to format.
 * @param controller The active Controller instance, needed to generate file mentions.
 * @returns A promise that resolves to the final formatted string.
 */
export async function formatContext(context: CommandContext, controller: Controller): Promise<string> {
	const parts: string[] = []

	// 1. Add the primary prompt text first, if it exists.
	if (context.prompt) {
		parts.push(context.prompt)
	}

	// 2. Add a file mention if a file path is provided.
	if (context.filePath) {
		const fileMention = await controller.getFileMentionFromPath(context.filePath)
		parts.push(fileMention)
	}

	// 3. Add the selected code, formatted in a markdown block.
	if (context.codeSelection) {
		const { text, languageId } = context.codeSelection
		parts.push(`\`\`\`${languageId}\n${text}\n\`\`\``)
	}

	// 4. Add terminal output, formatted in a markdown block.
	if (context.terminalOutput) {
		parts.push(`Terminal output:\n\`\`\`\n${context.terminalOutput}\n\`\`\``)
	}

	// 5. Add diagnostics (linter/compiler errors), formatted as a list.
	if (context.diagnostics && context.diagnostics.length > 0) {
		let problemsString = "Problems:\n"
		for (const diagnostic of context.diagnostics) {
			let label: string
			// Use the Protobuf DiagnosticSeverity enum
			switch (diagnostic.severity) {
				case DiagnosticSeverity.DIAGNOSTIC_ERROR:
					label = "Error"
					break
				case DiagnosticSeverity.DIAGNOSTIC_WARNING:
					label = "Warning"
					break
				case DiagnosticSeverity.DIAGNOSTIC_INFORMATION:
					label = "Info"
					break
				case DiagnosticSeverity.DIAGNOSTIC_HINT:
					label = "Hint"
					break
				default:
					label = "Diagnostic"
			}

			// Safely access the line number, defaulting to 0 if range or start is missing
			const line = (diagnostic.range?.start?.line || 0) + 1
			const source = diagnostic.source ? `[${diagnostic.source}] ` : ""
			problemsString += `- ${source}${label} on line ${line}: ${diagnostic.message}\n`
		}
		parts.push(problemsString.trim())
	}

	return parts.join("\n\n")
}
