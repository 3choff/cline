import { githubCopilotModels } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ApiKeyField } from "../common/ApiKeyField"
import { BaseUrlField } from "../common/BaseUrlField"
import { ModelInfoView } from "../common/ModelInfoView"
import { ModelSelector } from "../common/ModelSelector"
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
					<ModelSelector
						models={githubCopilotModels}
						onChange={(e: any) =>
							handleModeFieldChange(
								{ plan: "planModeGitHubCopilotModel", act: "actModeGitHubCopilotModel" },
								e.target.value,
								currentMode,
							)
						}
						selectedModelId={selectedModelId}
					/>

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}
