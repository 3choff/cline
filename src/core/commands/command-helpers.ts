import * as vscode from "vscode"
import pWaitFor from "p-wait-for"
import { Controller } from "../controller" // Note: Adjust the import path if the controller's index is in a different location
import { WebviewProvider } from "../webview" // Note: Adjust the import path if necessary
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"

/**
 * Ensures a Cline webview (either sidebar or a tab) is visible and ready for interaction.
 * It will focus an existing view or open a new one if necessary.
 * @returns The active Controller instance if a view becomes ready, otherwise null.
 */
export async function ensureClineViewIsVisible(): Promise<Controller | null> {
	// This uses the robust logic from the existing `cline.focusChatInput` command.
	await vscode.commands.executeCommand("cline.focusChatInput")

	try {
		// Wait for the provider to become active and registered.
		await pWaitFor(() => !!WebviewProvider.getVisibleInstance(), { timeout: 3000 })
	} catch (error) {
		console.error("Timeout waiting for Cline webview to become visible.", error)
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: "Could not activate Cline view. Please try opening it manually.",
		})
		return null
	}

	const visibleWebview = WebviewProvider.getVisibleInstance()
	if (!visibleWebview) {
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: "Could not find an active Cline chat window.",
		})
		return null
	}

	// Return the controller for the now-visible webview.
	return visibleWebview.controller
}

/**
 * Defines the structure for different types of context that can be formatted.
 */
export interface CommandContext {
	prompt?: string
	filePath?: string
	codeSelection?: { text: string; languageId: string }
	terminalOutput?: string
	diagnostics?: vscode.Diagnostic[]
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
			switch (diagnostic.severity) {
				case vscode.DiagnosticSeverity.Error:
					label = "Error"
					break
				case vscode.DiagnosticSeverity.Warning:
					label = "Warning"
					break
				case vscode.DiagnosticSeverity.Information:
					label = "Info"
					break
				case vscode.DiagnosticSeverity.Hint:
					label = "Hint"
					break
				default:
					label = "Diagnostic"
			}
			const line = diagnostic.range.start.line + 1
			const source = diagnostic.source ? `[${diagnostic.source}] ` : ""
			problemsString += `- ${source}${label} on line ${line}: ${diagnostic.message}\n`
		}
		parts.push(problemsString.trim())
	}

	// Join all the parts with a double newline for clean separation.
	return parts.join("\n\n")
}
