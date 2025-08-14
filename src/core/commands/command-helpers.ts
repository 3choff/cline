import * as vscode from "vscode"
import pWaitFor from "p-wait-for"
import { Controller } from "../controller"
import { WebviewProvider } from "../webview"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"

export async function ensureClineViewIsVisible(): Promise<Controller | null> {
	await vscode.commands.executeCommand("cline.focusChatInput")

	try {
		// Use getLastActiveInstance in the check as well
		await pWaitFor(() => !!WebviewProvider.getLastActiveInstance(), { timeout: 3000 })
	} catch (error) {
		console.error("Timeout waiting for Cline webview to become available.", error)
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: "Could not activate Cline view. Please try opening it manually.",
		})
		return null
	}

	const activeWebview = WebviewProvider.getLastActiveInstance()
	if (!activeWebview) {
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: "Could not find an active Cline chat window.",
		})
		return null
	}

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

	return parts.join("\n\n")
}
