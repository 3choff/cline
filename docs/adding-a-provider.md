# Adding a New Provider to Cline

This guide walks you through the complete process of adding a new API provider to Cline. It covers all the files you need to modify and the common pitfalls to avoid.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Common Pitfalls](#common-pitfalls)
5. [Testing Checklist](#testing-checklist)
6. [Reference Implementation](#reference-implementation)

## Overview

Adding a provider to Cline requires changes across multiple layers:
- **Proto Layer**: Define data structures
- **Conversion Layer**: Handle serialization/deserialization
- **Type Layer**: TypeScript interfaces
- **Storage Layer**: Persist configuration and secrets
- **API Layer**: Implement the provider handler
- **UI Layer**: Create the settings interface

**Estimated Time**: 2-4 hours for a complete implementation

## Prerequisites

Before starting, ensure you have:
- A working Cline development environment
- Understanding of the provider's API (authentication, endpoints, models)
- API credentials for testing

## Step-by-Step Implementation

### Phase 1: Proto Layer (Data Structure)

#### 1.1 Add Provider to Enum

**File**: `proto/cline/models.proto`

Add your provider to the `ApiProvider` enum:

```protobuf
enum ApiProvider {
  // ... existing providers
  YOUR_PROVIDER = XX;  // Use next available number
}
```

#### 1.2 Add Configuration Fields

In the same file, add your provider's fields to `ModelsApiConfiguration`:

```protobuf
message ModelsApiConfiguration {
  // ... existing fields
  
  // Your Provider - Secrets (API keys, tokens)
  optional string your_provider_api_key = XX;  // Use next available number
  
  // Your Provider - Global Configuration (base URLs, settings)
  optional string your_provider_base_url = XX;
  
  // Your Provider - Plan Mode Model Selection
  optional string plan_mode_your_provider_model = XX;
  
  // Your Provider - Act Mode Model Selection
  optional string act_mode_your_provider_model = XX;
}
```

**Naming Convention**:
- Use `snake_case` for proto field names
- Secrets: `{provider}_api_key` or `{provider}_token`
- Global config: `{provider}_{setting_name}`
- Mode-specific: `{plan|act}_mode_{provider}_{field}`

#### 1.3 Generate TypeScript Types

Run the proto compiler:

```bash
npm run protos
```

This generates TypeScript types from your proto definitions.

---

### Phase 2: Conversion Layer (Serialization)

**File**: `src/shared/proto-conversions/models/api-configuration-conversion.ts`

#### 2.1 Add Provider to Enum Conversion

Add cases to both conversion functions:

```typescript
// Proto → TypeScript
export function convertProtoToApiProvider(provider: ProtoApiProvider): ApiProvider {
  switch (provider) {
    // ... existing cases
    case ProtoApiProvider.YOUR_PROVIDER:
      return "your-provider"
    // ...
  }
}

// TypeScript → Proto
export function convertApiProviderToProto(provider: ApiProvider): ProtoApiProvider {
  switch (provider) {
    // ... existing cases
    case "your-provider":
      return ProtoApiProvider.YOUR_PROVIDER
    // ...
  }
}
```

#### 2.2 Add Fields to Configuration Conversion

Add your fields to both conversion functions:

```typescript
// TypeScript → Proto
export function convertApiConfigurationToProto(config: ApiConfiguration): ProtoApiConfiguration {
  return {
    // ... existing fields
    
    // Your Provider fields
    yourProviderApiKey: config.yourProviderApiKey,
    yourProviderBaseUrl: config.yourProviderBaseUrl,
    
    // Plan mode
    planModeYourProviderModel: config.planModeYourProviderModel,
    
    // Act mode
    actModeYourProviderModel: config.actModeYourProviderModel,
  }
}

// Proto → TypeScript
export function convertProtoToApiConfiguration(protoConfig: ProtoApiConfiguration): ApiConfiguration {
  return {
    // ... existing fields
    
    // Your Provider fields
    yourProviderApiKey: protoConfig.yourProviderApiKey,
    yourProviderBaseUrl: protoConfig.yourProviderBaseUrl,
    
    // Plan mode
    planModeYourProviderModel: protoConfig.planModeYourProviderModel,
    
    // Act mode
    actModeYourProviderModel: protoConfig.actModeYourProviderModel,
  }
}
```

---

### Phase 3: Type Layer (TypeScript Interfaces)

**File**: `src/shared/api.ts`

#### 3.1 Add to ApiProvider Union Type

```typescript
export type ApiProvider =
  | "anthropic"
  | "openrouter"
  // ... existing providers
  | "your-provider"
```

#### 3.2 Add Secret to ApiHandlerSecrets

```typescript
export interface ApiHandlerSecrets {
  apiKey?: string
  // ... existing secrets
  yourProviderApiKey?: string
}
```

#### 3.3 Add Configuration to ApiHandlerOptions

```typescript
export interface ApiHandlerOptions {
  // ... existing options
  
  // Your Provider - Global Configuration
  yourProviderBaseUrl?: string
  
  // Your Provider - Plan Mode
  planModeYourProviderModel?: string
  
  // Your Provider - Act Mode
  actModeYourProviderModel?: string
}
```

---

### Phase 4: Storage Layer (Critical!)

This is the most error-prone part. Missing any step here will cause settings not to persist.

#### 4.1 Add to State Keys

**File**: `src/core/storage/state-keys.ts`

Add secret to `Secrets` interface:

```typescript
export interface Secrets {
  // ... existing secrets
  yourProviderApiKey: string | undefined
}
```

Add configuration to `GlobalStateAndSettings` interface:

```typescript
export interface GlobalStateAndSettings extends GlobalState, Settings {}

// In Settings interface:
export interface Settings {
  // ... existing settings
  yourProviderBaseUrl: string | undefined
  planModeYourProviderModel: string | undefined
  actModeYourProviderModel: string | undefined
}
```

#### 4.2 Add to State Helpers

**File**: `src/core/storage/utils/state-helpers.ts`

This file requires changes in **6 locations**:

**Location 1**: Destructure from Promise.all array:
```typescript
const [
  apiKey,
  // ... existing secrets
  yourProviderApiKey,  // Add here
  // ...
] = await Promise.all([
```

**Location 2**: Add to Promise.all secrets fetch:
```typescript
await Promise.all([
  context.secrets.get("apiKey") as Promise<Secrets["apiKey"]>,
  // ... existing secrets
  context.secrets.get("yourProviderApiKey") as Promise<Secrets["yourProviderApiKey"]>,
  // ...
])
```

**Location 3**: Add to return object (secrets):
```typescript
return {
  // ... existing secrets
  yourProviderApiKey,
  // ...
}
```

**Location 4**: Add to deletion array:
```typescript
const secretKeys = [
  "apiKey",
  // ... existing secrets
  "yourProviderApiKey",
  // ...
]
```

**Location 5**: Fetch global configuration:
```typescript
const yourProviderBaseUrl = context.globalState.get<GlobalStateAndSettings["yourProviderBaseUrl"]>("yourProviderBaseUrl")
```

**Location 6**: Fetch mode-specific fields:
```typescript
const planModeYourProviderModel = context.globalState.get("planModeYourProviderModel") as string | undefined
const actModeYourProviderModel = context.globalState.get("actModeYourProviderModel") as string | undefined
```

**Location 7**: Add to return object (global state):
```typescript
return {
  // ... existing fields
  yourProviderBaseUrl,
  planModeYourProviderModel,
  actModeYourProviderModel,
  // ...
}
```

#### 4.3 Add to StateManager

**File**: `src/core/storage/StateManager.ts`

This file requires changes in **3 methods**:

**Method 1: setApiConfiguration()** - Destructure parameters:
```typescript
const {
  // ... existing fields
  yourProviderApiKey,
  yourProviderBaseUrl,
  planModeYourProviderModel,
  actModeYourProviderModel,
} = apiConfiguration
```

**Method 1: setApiConfiguration()** - Add to setSecretsBatch (CRITICAL!):
```typescript
this.setSecretsBatch({
  apiKey,
  // ... existing secrets
  yourProviderApiKey,  // ⚠️ MUST be here or secret won't save!
})
```

**Method 1: setApiConfiguration()** - Add to setGlobalStateBatch:
```typescript
this.setGlobalStateBatch({
  // ... existing fields
  yourProviderBaseUrl,
  planModeYourProviderModel,
  actModeYourProviderModel,
})
```

**Method 2: getApiConfiguration()** - Read from secretsCache:
```typescript
return {
  // ... existing secrets
  yourProviderApiKey: this.secretsCache["yourProviderApiKey"],
  
  // ... existing global state
  yourProviderBaseUrl: this.taskStateCache["yourProviderBaseUrl"] || this.globalStateCache["yourProviderBaseUrl"],
  
  // ... existing mode fields
  planModeYourProviderModel: this.globalStateCache["planModeYourProviderModel"],
  actModeYourProviderModel: this.globalStateCache["actModeYourProviderModel"],
}
```

---

### Phase 5: API Layer (Business Logic)

#### 5.1 Create Provider Handler

**File**: `src/core/api/providers/your-provider.ts`

```typescript
import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandler, ApiHandlerOptions, ModelInfo } from "@shared/api"
import { ApiStream } from "../transform/stream"

export interface YourProviderHandlerOptions {
  apiKey?: string
  baseUrl?: string
  apiModelId: string
  // Add other provider-specific options
}

export class YourProviderHandler implements ApiHandler {
  private options: YourProviderHandlerOptions

  constructor(options: YourProviderHandlerOptions) {
    this.options = options
  }

  async *createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
    tools: Anthropic.Messages.Tool[]
  ): ApiStream {
    // Validate API key
    if (!this.options.apiKey) {
      throw new Error("Your Provider API key is required")
    }

    // Implement your provider's API call
    // Convert Anthropic format to your provider's format
    // Handle streaming responses
    // Convert responses back to Anthropic format
    
    // Example structure:
    const response = await fetch(`${this.options.baseUrl}/endpoint`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.options.apiModelId,
        messages: messages,
        // ... other parameters
      }),
    })

    // Stream and yield responses
    // See existing providers for examples
  }

  getModel(): { id: string; info: ModelInfo } {
    return {
      id: this.options.apiModelId,
      info: {
        maxTokens: 4096,
        contextWindow: 128000,
        supportsImages: true,
        supportsPromptCache: false,
        inputPrice: 0.0,
        outputPrice: 0.0,
      },
    }
  }
}
```

#### 5.2 Register Provider in Factory

**File**: `src/core/api/index.ts`

Add case to `createHandlerForProvider`:

```typescript
export function createHandlerForProvider(
  provider: ApiProvider,
  options: ApiHandlerOptions,
  mode: Mode
): ApiHandler {
  switch (provider) {
    // ... existing cases
    
    case "your-provider":
      return new YourProviderHandler({
        apiKey: options.yourProviderApiKey,
        baseUrl: options.yourProviderBaseUrl,
        apiModelId: mode === "plan" 
          ? options.planModeYourProviderModel 
          : options.actModeYourProviderModel,
      })
    
    // ...
  }
}
```

---

### Phase 6: UI Layer (Frontend)

#### 6.1 Create Provider Component

**File**: `webview-ui/src/components/settings/providers/YourProviderProvider.tsx`

```typescript
import { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ApiKeyField } from "../common/ApiKeyField"
import { ModelInfoView } from "../common/ModelInfoView"
import { ModelSelector } from "../common/ModelSelector"
import { normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

interface YourProviderProviderProps {
  mode: Mode
}

const YourProviderProvider = ({ mode }: YourProviderProviderProps) => {
  const { apiConfiguration } = useExtensionState()
  const { handleFieldChange, handleModeFieldChange } = useApiConfigurationHandlers()

  const { selectedModelId, selectedModelInfo } = normalizeApiConfiguration(
    apiConfiguration,
    "your-provider",
    mode
  )

  return (
    <div>
      {/* API Key Field */}
      <ApiKeyField
        initialValue={apiConfiguration?.yourProviderApiKey || ""}
        onChange={(value) => handleFieldChange("yourProviderApiKey", value)}
        providerName="Your Provider"
        signupUrl="https://your-provider.com/signup"
      />

      {/* Optional: Base URL Field */}
      <DebouncedTextField
        value={apiConfiguration?.yourProviderBaseUrl || "https://api.your-provider.com"}
        onChange={(value) => handleFieldChange("yourProviderBaseUrl", value)}
        placeholder="https://api.your-provider.com"
      >
        <span style={{ fontWeight: 500 }}>Base URL</span>
      </DebouncedTextField>

      {/* Model Selection */}
      <ModelSelector
        mode={mode}
        selectedModelId={selectedModelId}
        selectedModelInfo={selectedModelInfo}
        onChange={(value) =>
          handleModeFieldChange(
            { plan: "planModeYourProviderModel", act: "actModeYourProviderModel" },
            value,
            mode
          )
        }
        modelOptions={yourProviderModels}
      />

      {/* Model Info Display */}
      <ModelInfoView modelInfo={selectedModelInfo} />
    </div>
  )
}

export default YourProviderProvider
```

#### 6.2 Add Model Definitions

**File**: `src/shared/api.ts`

```typescript
export const yourProviderModels = {
  "model-1": {
    maxTokens: 4096,
    contextWindow: 128000,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0.0,
    outputPrice: 0.0,
    description: "Model 1 description",
  },
  "model-2": {
    maxTokens: 8192,
    contextWindow: 200000,
    supportsImages: false,
    supportsPromptCache: false,
    inputPrice: 0.0,
    outputPrice: 0.0,
    description: "Model 2 description",
  },
} as const satisfies Record<string, ModelInfo>

export type YourProviderModelId = keyof typeof yourProviderModels
export const yourProviderDefaultModelId: YourProviderModelId = "model-1"
```

#### 6.3 Add to Provider Utils

**File**: `webview-ui/src/components/settings/utils/providerUtils.ts`

**Add to normalizeApiConfiguration**:
```typescript
export function normalizeApiConfiguration(
  apiConfiguration: ApiConfiguration | undefined,
  provider: ApiProvider,
  currentMode: Mode
): NormalizedApiConfiguration {
  switch (provider) {
    // ... existing cases
    
    case "your-provider":
      return getProviderData(yourProviderModels, yourProviderDefaultModelId)
    
    // ...
  }
}
```

**Add to getModeSpecificFields**:
```typescript
export function getModeSpecificFields(
  apiConfiguration: ApiConfiguration | undefined,
  mode: Mode
): ModeSpecificFields {
  return {
    // ... existing fields
    
    yourProviderModel:
      mode === "plan"
        ? apiConfiguration.planModeYourProviderModel
        : apiConfiguration.actModeYourProviderModel,
  }
}
```

**Add to syncModeConfigurations**:
```typescript
export async function syncModeConfigurations(
  apiConfiguration: ApiConfiguration | undefined,
  sourceMode: Mode,
  handleFieldsChange: (updates: Partial<ApiConfiguration>) => Promise<void>
) {
  const sourceFields = getModeSpecificFields(apiConfiguration, sourceMode)
  const updates: Partial<ApiConfiguration> = {}

  switch (provider) {
    // ... existing cases
    
    case "your-provider":
      updates.planModeYourProviderModel = sourceFields.yourProviderModel
      updates.actModeYourProviderModel = sourceFields.yourProviderModel
      break
    
    // ...
  }
}
```

#### 6.4 Register in API Options

**File**: `webview-ui/src/components/settings/ApiOptions.tsx`

**Add to provider list**:
```typescript
const providers = [
  { value: "anthropic", label: "Anthropic" },
  // ... existing providers
  { value: "your-provider", label: "Your Provider" },
]
```

**Add to conditional rendering**:
```typescript
{selectedProvider === "your-provider" && <YourProviderProvider mode={mode} />}
```

---

## Common Pitfalls

### 1. Secrets Not Persisting

**Symptom**: API key doesn't save after entering it.

**Cause**: Missing from `StateManager.setSecretsBatch()` call.

**Fix**: Ensure your secret is in the `setSecretsBatch()` call in `StateManager.ts`:
```typescript
this.setSecretsBatch({
  // ... other secrets
  yourProviderApiKey,  // Must be here!
})
```

### 2. Settings Not Loading

**Symptom**: Settings disappear after reload.

**Cause**: Missing from `StateManager.getApiConfiguration()`.

**Fix**: Add all fields to the return object in `getApiConfiguration()`.

### 3. Model Selection Not Saving

**Symptom**: Model reverts to default after changing.

**Cause**: Missing from `setGlobalStateBatch()` or `getApiConfiguration()`.

**Fix**: Ensure mode-specific fields are in both methods.

### 4. Proto Conversion Errors

**Symptom**: TypeScript errors about missing properties.

**Cause**: Forgot to run `npm run protos` after modifying proto files.

**Fix**: Always run `npm run protos` after changing `.proto` files.

### 5. Provider Not Appearing in Dropdown

**Symptom**: Provider doesn't show in settings.

**Cause**: Missing from `ApiOptions.tsx` provider list.

**Fix**: Add provider to both the dropdown list and conditional rendering.

---

## Testing Checklist

Use this checklist to verify your implementation:

### Basic Functionality
- [ ] Provider appears in dropdown list
- [ ] Selecting provider shows configuration UI
- [ ] API key field accepts input
- [ ] Model dropdown shows available models
- [ ] Model info displays correctly

### Persistence
- [ ] API key saves after entering
- [ ] API key persists after closing settings
- [ ] API key persists after reloading VS Code
- [ ] Model selection saves
- [ ] Model selection persists after reload
- [ ] Base URL (if applicable) saves and persists

### Plan/Act Modes
- [ ] Can select different models for Plan and Act modes
- [ ] Model selection respects "Use different models" toggle
- [ ] Switching modes shows correct model
- [ ] Syncing modes copies settings correctly

### API Calls
- [ ] Provider handler receives correct API key
- [ ] Provider handler receives correct model
- [ ] API calls succeed with valid credentials
- [ ] Error messages are clear for invalid credentials
- [ ] Streaming responses work correctly

### Edge Cases
- [ ] Works with empty/missing API key (shows error)
- [ ] Works with invalid API key (shows error)
- [ ] Works with custom base URL
- [ ] Handles network errors gracefully
- [ ] Handles rate limiting appropriately

---

## Reference Implementation

For a complete reference, examine these existing providers:

### Simple Provider (Good Starting Point)
- **X AI**: Simple API key authentication, straightforward model selection
- **Files**: `src/core/api/providers/xai.ts`, `webview-ui/src/components/settings/providers/XaiProvider.tsx`

### Complex Provider (Advanced Features)
- **OpenRouter**: Multiple models, model info fetching, custom configuration
- **Files**: `src/core/api/providers/openrouter.ts`, `webview-ui/src/components/settings/providers/OpenRouterProvider.tsx`

### Provider with OAuth
- **OCA**: OAuth authentication flow, token refresh
- **Files**: `src/services/auth/oca/`, `webview-ui/src/components/settings/providers/OcaProvider.tsx`

---

## Summary

Adding a provider requires touching approximately **11 files** across **6 layers**:

1. **Proto Layer** (1 file): `proto/cline/models.proto`
2. **Conversion Layer** (1 file): `src/shared/proto-conversions/models/api-configuration-conversion.ts`
3. **Type Layer** (1 file): `src/shared/api.ts`
4. **Storage Layer** (3 files): `state-keys.ts`, `state-helpers.ts`, `StateManager.ts`
5. **API Layer** (2 files): `src/core/api/index.ts`, `src/core/api/providers/your-provider.ts`
6. **UI Layer** (3 files): Provider component, `providerUtils.ts`, `ApiOptions.tsx`

The most critical and error-prone parts are:
- **StateManager.ts**: Must add fields to `setSecretsBatch()`, `setGlobalStateBatch()`, and `getApiConfiguration()`
- **state-helpers.ts**: Must add fields in 7 different locations

Following this guide systematically will help you avoid the common pitfalls and create a fully functional provider integration.

---

## Getting Help

If you encounter issues:
1. Check the [Common Pitfalls](#common-pitfalls) section
2. Compare your implementation with a reference provider
3. Use the [Testing Checklist](#testing-checklist) to identify what's not working
4. Check the VS Code Developer Console for error messages
5. Ask in the Cline community discussions

Good luck with your provider implementation!
