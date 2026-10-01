package codex

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
)

func (a *Adaptor) ConvertImageRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.ImageRequest) (any, error) {
	invalid := func(message string) (any, error) {
		return nil, types.NewErrorWithStatusCode(errors.New(message), types.ErrorCodeInvalidRequest, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
	}
	switch request.Model {
	case "gpt-image-2", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst":
	default:
		return invalid("select a supported GPT image model")
	}
	count, err := request.ImageCount(false)
	if err != nil {
		return invalid(err.Error())
	}
	if count != 1 {
		return invalid("Codex image generation supports n=1")
	}
	if request.Stream != nil && *request.Stream {
		return invalid("Codex Images API currently supports non-streaming responses only")
	}
	if request.ResponseFormat != "" && request.ResponseFormat != "b64_json" {
		return invalid("Codex image generation supports response_format=b64_json")
	}
	if strings.TrimSpace(request.Prompt) == "" {
		return invalid("prompt is required")
	}
	if info.RelayMode != relayconstant.RelayModeImagesGenerations {
		return invalid("Codex image editing is not supported by this endpoint yet")
	}
	if len(request.Image) > 0 || len(request.Images) > 0 || len(request.Mask) > 0 {
		return invalid("image input requires the image editing endpoint")
	}
	tool := map[string]any{"type": "image_generation", "model": request.Model}
	if request.Size != "" {
		tool["size"] = request.Size
	}
	if request.Quality != "" {
		tool["quality"] = request.Quality
	}
	for name, value := range map[string]json.RawMessage{"background": request.Background, "output_format": request.OutputFormat, "output_compression": request.OutputCompression, "moderation": request.Moderation} {
		if len(value) > 0 {
			tool[name] = value
		}
	}
	// The text model orchestrates the tool; the requested image model is passed
	// unchanged to image_generation, not mapped to the orchestrator's name.
	return map[string]any{"model": "gpt-6-sol", "instructions": "Generate the requested image using the image generation tool.", "input": []map[string]any{{"role": "user", "content": []map[string]string{{"type": "input_text", "text": request.Prompt}}}}, "tools": []any{tool}, "tool_choice": map[string]string{"type": "image_generation"}, "stream": true, "store": false}, nil
}

func codexImageResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (*dto.Usage, *types.NewAPIError) {
	defer resp.Body.Close()
	// Buffer the upstream SSE into a single Images JSON response. Do not emit
	// keepalives or partial results that would commit a false success to clients.
	info.IsStream = false
	timer := time.AfterFunc(180*time.Second, func() { _ = resp.Body.Close() })
	defer timer.Stop()
	scanner := helper.NewStreamScanner(io.LimitReader(resp.Body, 64<<20), 32<<20)
	var completedImage *dto.ResponsesOutput
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			break
		}
		var event struct {
			Type     string                       `json:"type"`
			Error    *types.OpenAIError           `json:"error"`
			Item     *dto.ResponsesOutput         `json:"item"`
			Response *dto.OpenAIResponsesResponse `json:"response"`
		}
		if err := common.UnmarshalJsonStr(data, &event); err != nil {
			return nil, types.NewError(err, types.ErrorCodeBadResponseBody, types.ErrOptionWithSkipRetry())
		}
		if event.Type == "response.output_item.done" && event.Item != nil && event.Item.Type == "image_generation_call" && event.Item.Status == "completed" {
			if completedImage != nil {
				return nil, types.NewError(errors.New("upstream returned multiple images for n=1"), types.ErrorCodeBadResponseBody, types.ErrOptionWithSkipRetry())
			}
			completedImage = event.Item
		}
		if event.Type == "error" || event.Type == "response.failed" || event.Type == "response.incomplete" {
			message := "upstream image generation failed"
			if event.Error != nil && event.Error.Message != "" {
				message = event.Error.Message
			} else if event.Response != nil {
				if upstreamError := event.Response.GetOpenAIError(); upstreamError != nil && upstreamError.Message != "" {
					message = upstreamError.Message
				}
			}
			return nil, types.NewErrorWithStatusCode(errors.New(message), types.ErrorCodeBadResponseBody, http.StatusBadGateway, types.ErrOptionWithSkipRetry())
		}
		if event.Type != "response.completed" || event.Response == nil {
			continue
		}
		result := dto.ImageResponse{Created: time.Now().Unix(), Data: []dto.ImageData{}}
		outputs := event.Response.Output
		if completedImage != nil {
			outputs = []dto.ResponsesOutput{*completedImage}
		}
		for _, item := range outputs {
			if item.Type != "image_generation_call" || item.Status != "completed" || item.Result == "" {
				continue
			}
			raw, err := base64.StdEncoding.DecodeString(item.Result)
			if err != nil || len(raw) == 0 {
				return nil, types.NewError(errors.New("upstream returned invalid image data"), types.ErrorCodeBadResponseBody, types.ErrOptionWithSkipRetry())
			}
			result.Data = append(result.Data, dto.ImageData{B64Json: item.Result})
		}
		if len(result.Data) != 1 {
			return nil, types.NewError(errors.New("upstream did not return exactly one completed image"), types.ErrorCodeBadResponseBody, types.ErrOptionWithSkipRetry())
		}
		usage := event.Response.Usage
		if usage == nil {
			usage = &dto.Usage{}
		}
		usage.PromptTokens = usage.InputTokens
		usage.CompletionTokens = usage.OutputTokens
		if usage.InputTokensDetails != nil {
			usage.PromptTokensDetails = usage.InputTokensDetails.Clone()
		}
		if usage.OutputTokensDetails != nil {
			usage.CompletionTokenDetails = *usage.OutputTokensDetails
		}
		info.UpdateImageCount(1)
		c.JSON(http.StatusOK, result)
		return usage, nil
	}
	err := scanner.Err()
	if err == nil {
		err = errors.New("upstream image stream ended before completion")
	}
	return nil, types.NewError(err, types.ErrorCodeBadResponseBody, types.ErrOptionWithSkipRetry())
}
