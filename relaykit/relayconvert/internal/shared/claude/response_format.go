package claude

import (
	"fmt"

	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/relayconvert/kitutil"
)

// ApplyOpenAIJSONSchema preserves the client's output schema in Claude's native format.
func ApplyOpenAIJSONSchema(request *dto.ClaudeRequest, format *dto.ResponseFormat) error {
	if format == nil || format.Type != "json_schema" {
		return nil
	}
	var schema dto.FormatJsonSchema
	if err := kitutil.Unmarshal(format.JsonSchema, &schema); err != nil {
		return fmt.Errorf("invalid JSON schema response format: %w", err)
	}
	if schema.Schema == nil {
		return fmt.Errorf("JSON schema response format requires a schema")
	}
	config := make(map[string]any)
	if len(request.OutputConfig) > 0 {
		if err := kitutil.Unmarshal(request.OutputConfig, &config); err != nil {
			return fmt.Errorf("invalid Claude output_config: %w", err)
		}
		if config == nil {
			config = make(map[string]any)
		}
	}
	config["format"] = map[string]any{"type": "json_schema", "schema": schema.Schema}
	encoded, err := kitutil.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal Claude output_config: %w", err)
	}
	request.OutputConfig = encoded
	return nil
}
