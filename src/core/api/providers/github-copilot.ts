import { ModelInfo } from "@shared/api"
import { ApiHandler, CommonApiHandlerOptions } from "../index"
import { ApiStream } from "../transform/stream"

interface GitHubCopilotOptions extends CommonApiHandlerOptions {
	token?: string
	model?: string
	baseUrl?: string
	reasoningEffort?: string
}

export class GitHubCopilotHandler implements ApiHandler {
	private options: GitHubCopilotOptions
	private baseUrl: string
	private token: string
	private model: string

	constructor(options: GitHubCopilotOptions) {
		this.options = options
		this.token = options.token || ""
		this.model = options.model || "gpt-5"
		this.baseUrl = options.baseUrl || "https://api.githubcopilot.com"

		console.log("[GITHUB_COPILOT DEBUG] Constructor called with:", {
			hasToken: !!this.token,
			model: this.model,
			baseUrl: this.baseUrl,
		})

		if (!this.token) {
			throw new Error("GitHub Copilot token is required")
		}
	}

	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		console.log("[GITHUB_COPILOT DEBUG] createMessage called with:", {
			systemPromptLength: systemPrompt?.length || 0,
			messagesCount: messages?.length || 0,
			model: this.model,
		})

		// Transform messages to OpenAI format for GitHub Copilot API
		const transformedMessages = this.transformMessages(systemPrompt, messages)

		const requestBody: any = {
			model: this.model,
			messages: transformedMessages,
			stream: true,
		}

		// Add reasoning effort for GPT-5 models if specified
		if (this.model.includes("gpt-5") && this.options.reasoningEffort) {
			requestBody.reasoning = { effort: this.options.reasoningEffort }
		}

		const fullUrl = `${this.baseUrl}/chat/completions`
		console.log("[GITHUB_COPILOT DEBUG] Making request to:", fullUrl)
		console.log("[GITHUB_COPILOT DEBUG] Request body:", JSON.stringify(requestBody, null, 2))

		let response: Response
		try {
			response = await fetch(fullUrl, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
					"user-agent": "copilot/0.0.330 (win32 v22.14.0) OpenAI/4.104.0",
					"x-github-api-version": "2025-05-01",
					"copilot-integration-id": "copilot-developer-cli",
					"x-initiator": "user",
					"openai-intent": "conversation-agent",
					"x-interaction-type": "conversation-agent",
				},
				body: JSON.stringify(requestBody),
			})
		} catch (error: any) {
			console.error("[GITHUB_COPILOT DEBUG] Network error during fetch:", error)
			throw new Error(`GitHub Copilot API network error: ${error.message}`)
		}

		console.log("[GITHUB_COPILOT DEBUG] Response status:", response.status)
		const headersObj: Record<string, string> = {}
		response.headers.forEach((value, key) => {
			headersObj[key] = value
		})
		console.log("[GITHUB_COPILOT DEBUG] Response headers:", headersObj)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("[GITHUB_COPILOT DEBUG] Error response:", errorText)
			throw new Error(`GitHub Copilot API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		if (!response.body) {
			throw new Error("No response body from GitHub Copilot API")
		}

		const reader = response.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ""

		console.log("[GITHUB_COPILOT DEBUG] Starting to read streaming response...")

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) {
					console.log("[GITHUB_COPILOT DEBUG] Stream ended naturally")
					break
				}

				const chunk = decoder.decode(value, { stream: true })
				console.log("[GITHUB_COPILOT DEBUG] Raw chunk received:", JSON.stringify(chunk))

				buffer += chunk
				const lines = buffer.split("\n")

				// Keep the last incomplete line in the buffer
				buffer = lines.pop() || ""

				for (const line of lines) {
					console.log("[GITHUB_COPILOT DEBUG] Processing line:", JSON.stringify(line))

					if (line.startsWith("data: ")) {
						const data = line.slice(6).trim()
						console.log("[GITHUB_COPILOT DEBUG] Extracted data:", JSON.stringify(data))

						if (data === "[DONE]") {
							console.log("[GITHUB_COPILOT DEBUG] Received [DONE] signal")
							return
						}

						if (data === "") {
							console.log("[GITHUB_COPILOT DEBUG] Empty data line, skipping")
							continue
						}

						try {
							const parsed = JSON.parse(data)
							console.log("[GITHUB_COPILOT DEBUG] Parsed JSON:", parsed)

							// Handle OpenAI-compatible streaming response
							if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
								const delta = parsed.choices[0].delta
								if (delta.content) {
									console.log("[GITHUB_COPILOT DEBUG] Yielding content:", delta.content)
									yield {
										type: "text",
										text: delta.content,
									}
								}

								// Handle usage information
								if (parsed.usage) {
									yield {
										type: "usage",
										inputTokens: parsed.usage.prompt_tokens || 0,
										outputTokens: parsed.usage.completion_tokens || 0,
										totalCost: 0, // GitHub Copilot doesn't provide cost info
									}
								}
							}
						} catch (e) {
							console.warn("[GITHUB_COPILOT DEBUG] Failed to parse JSON:", data, "Error:", e)
						}
					} else if (line.trim() !== "") {
						console.log("[GITHUB_COPILOT DEBUG] Non-data line:", JSON.stringify(line))
					}
				}
			}
		} finally {
			reader.releaseLock()
			console.log("[GITHUB_COPILOT DEBUG] Stream reader released")
		}
	}

	private transformMessages(systemPrompt: string, messages: any[]): any[] {
		const transformed: any[] = []

		// Add system prompt if provided
		if (systemPrompt) {
			transformed.push({
				role: "system",
				content: systemPrompt,
			})
		}

		// Transform user and assistant messages
		for (const message of messages) {
			if (message.role === "user") {
				// Handle multimodal content (text + images)
				if (Array.isArray(message.content)) {
					transformed.push({
						role: "user",
						content: message.content,
					})
				} else {
					transformed.push({
						role: "user",
						content: message.content || "",
					})
				}
			} else if (message.role === "assistant") {
				transformed.push({
					role: "assistant",
					content: message.content || "",
				})
			}
		}

		return transformed
	}

	getModel(): { id: string; info: ModelInfo } {
		const modelInfo: ModelInfo = {
			maxTokens: 4096,
			contextWindow: 128000,
			supportsImages: true,
			supportsPromptCache: false,
			inputPrice: 0,
			outputPrice: 0,
			description: `GitHub Copilot model: ${this.model}`,
		}

		// Adjust based on model
		if (this.model.includes("gpt-5")) {
			modelInfo.maxTokens = 8192
			modelInfo.contextWindow = 200000
		} else if (this.model.includes("claude")) {
			modelInfo.maxTokens = 8192
			modelInfo.contextWindow = 200000
		}

		return {
			id: this.model,
			info: modelInfo,
		}
	}
}
