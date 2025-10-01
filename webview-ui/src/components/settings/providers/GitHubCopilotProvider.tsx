import { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ApiKeyField } from "../common/ApiKeyField"
import { BaseUrlField } from "../common/BaseUrlField"
import { ModelInfoView } from "../common/ModelInfoView"
import { normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/**
 * Props for the GitHubCopilotProvider component
 */
interface GitHubCopilotProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The GitHub Copilot provider configuration component
 */
export const GitHubCopilotProvider = ({ showModelOptions, isPopup, currentMode }: GitHubCopilotProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleFieldChange, handleModeFieldChange } = useApiConfigurationHandlers()

	// Get the normalized configuration
	const { selectedModelId, selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, currentMode)

	return (
		<div>
			<ApiKeyField
				initialValue={apiConfiguration?.githubCopilotToken || ""}
				onChange={(value) => handleFieldChange("githubCopilotToken", value)}
				providerName="GitHub Copilot"
			/>

			<BaseUrlField
				initialValue={apiConfiguration?.githubCopilotBaseUrl}
				label="Use custom base URL"
				onChange={(value) => handleFieldChange("githubCopilotBaseUrl", value)}
				placeholder="Default: https://api.githubcopilot.com"
			/>

			{showModelOptions && (
				<>
					<div style={{ marginBottom: 10 }}>
						<label htmlFor="github-copilot-model">
							<span style={{ fontWeight: 500 }}>Model</span>
						</label>
						<VSCodeDropdown
							id="github-copilot-model"
							onChange={(e: any) =>
								handleModeFieldChange(
									{ plan: "planModeGitHubCopilotModel", act: "actModeGitHubCopilotModel" },
									e.target.value,
									currentMode,
								)
							}
							style={{ width: "100%" }}
							value={selectedModelId || "claude-sonnet-4"}>
							<VSCodeOption value="gpt-5-mini">gpt-5-mini</VSCodeOption>
							<VSCodeOption value="gpt-5">gpt-5</VSCodeOption>
							<VSCodeOption value="claude-sonnet-4">claude-sonnet-4</VSCodeOption>
							<VSCodeOption value="claude-sonnet-4.5">claude-sonnet-4.5</VSCodeOption>
						</VSCodeDropdown>
					</div>

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}
