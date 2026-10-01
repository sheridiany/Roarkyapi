package codex

import (
	"encoding/json"
	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/service"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetRequestURLAlphaSearch(t *testing.T) {
	adaptor := &Adaptor{}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:    constant.ChannelTypeCodex,
			ChannelBaseUrl: "https://chatgpt.com",
		},
		RelayMode: relayconstant.RelayModeAlphaSearch,
	}

	url, err := adaptor.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://chatgpt.com/backend-api/codex/alpha/search", url)
}

// The Codex backend rejects these fields, so the adaptor clears them rather
// than forwarding what the client sent.
func TestConvertOpenAIResponsesRequestDropsPenalties(t *testing.T) {
	adaptor := &Adaptor{}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeCodex},
		RelayMode:   relayconstant.RelayModeResponses,
	}

	converted, err := adaptor.ConvertOpenAIResponsesRequest(nil, info, dto.OpenAIResponsesRequest{
		Model:            "gpt-5-codex",
		Input:            json.RawMessage(`"hello"`),
		MaxOutputTokens:  lo.ToPtr(uint(128)),
		Temperature:      lo.ToPtr(1.0),
		FrequencyPenalty: json.RawMessage(`1.5`),
		PresencePenalty:  json.RawMessage(`1.5`),
	})
	require.NoError(t, err)

	request, ok := converted.(dto.OpenAIResponsesRequest)
	require.True(t, ok)
	assert.Nil(t, request.MaxOutputTokens)
	assert.Nil(t, request.Temperature)
	assert.Nil(t, request.FrequencyPenalty)
	assert.Nil(t, request.PresencePenalty)
}

func TestCodexImageGenerationContract(t *testing.T) {
	for _, name := range []string{"gpt-image-2", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst"} {
		t.Run(name, func(t *testing.T) {
			info := &relaycommon.RelayInfo{RelayMode: relayconstant.RelayModeImagesGenerations, ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeCodex, ChannelBaseUrl: "https://chatgpt.com", UpstreamModelName: name}}
			a := &Adaptor{}
			request, err := a.ConvertImageRequest(nil, info, dto.ImageRequest{Model: name, Prompt: "blue circle", N: lo.ToPtr(uint(1))})
			require.NoError(t, err)
			data, err := common.Marshal(request)
			require.NoError(t, err)
			var payload struct {
				Model string `json:"model"`
				Tools []struct {
					Model string `json:"model"`
				} `json:"tools"`
				Stream bool `json:"stream"`
			}
			require.NoError(t, common.Unmarshal(data, &payload))
			require.Len(t, payload.Tools, 1)
			assert.Equal(t, name, payload.Tools[0].Model)
			assert.Equal(t, "gpt-6-sol", payload.Model)
			assert.True(t, payload.Stream)
			url, err := a.GetRequestURL(info)
			require.NoError(t, err)
			assert.Equal(t, "https://chatgpt.com/backend-api/codex/responses", url)
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("POST", "/v1/images/generations", nil)
			response := &http.Response{Body: io.NopCloser(strings.NewReader(`data: {"type":"response.output_item.done","item":{"type":"image_generation_call","status":"completed","result":"aW1hZ2U="}}` + "\n\n" + `data: {"type":"response.completed","response":{"status":"completed","output":[],"usage":{"input_tokens":20,"output_tokens":10,"total_tokens":30}}}` + "\n\n"))}
			usage, apiErr := a.DoResponse(c, response, info)
			require.Nil(t, apiErr)
			assert.Equal(t, 20, usage.(*dto.Usage).PromptTokens)
			assert.Equal(t, 1, info.RequestedImageCount())
		})
	}
}

func TestCodexImageUsageBilling(t *testing.T) {
	const expression = `tier("image", p * 2 + cr * 0.2 + img * 4 + img_cr * 0.4 + c * 8)`
	for _, tt := range []struct {
		name       string
		usage      string
		wantInput  dto.InputTokenDetails
		wantOutput dto.OutputTokenDetails
		wantQuota  int
	}{
		{
			name:       "cache and image details",
			usage:      `{"input_tokens":20,"output_tokens":10,"total_tokens":30,"input_tokens_details":{"cached_tokens":7,"text_tokens":18,"image_tokens":2,"cached_tokens_details":{"text_tokens":6,"image_tokens":1}},"output_tokens_details":{"text_tokens":2,"image_tokens":8,"reasoning_tokens":2}}`,
			wantInput:  dto.InputTokenDetails{CachedTokens: 7, TextTokens: 18, ImageTokens: 2, CachedTokensDetails: &dto.CachedTokenDetails{TextTokens: lo.ToPtr(6), ImageTokens: lo.ToPtr(1)}},
			wantOutput: dto.OutputTokenDetails{TextTokens: 2, ImageTokens: 8, ReasoningTokens: 2},
			wantQuota:  110,
		},
		{
			name:      "details omitted",
			usage:     `{"input_tokens":20,"output_tokens":10,"total_tokens":30}`,
			wantQuota: 120,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
			info := &relaycommon.RelayInfo{RelayMode: relayconstant.RelayModeImagesGenerations}
			body := `data: {"type":"response.completed","response":{"output":[{"type":"image_generation_call","status":"completed","result":"aW1hZ2U="}],"usage":` + tt.usage + "}}\n\n"
			result, apiErr := (&Adaptor{}).DoResponse(c, &http.Response{Body: io.NopCloser(strings.NewReader(body))}, info)
			require.Nil(t, apiErr)
			usage, ok := result.(*dto.Usage)
			require.True(t, ok)
			assert.Equal(t, tt.wantInput, usage.PromptTokensDetails)
			assert.Equal(t, tt.wantOutput, usage.CompletionTokenDetails)
			params := service.BuildTieredTokenParams(usage, false, billingexpr.UsedVars(expression))
			settled, err := billingexpr.ComputeTieredQuota(&billingexpr.BillingSnapshot{
				ExprString: expression, ExprHash: billingexpr.ExprHashString(expression),
				ExprVersion: 1, QuotaPerUnit: 1_000_000, GroupRatio: 1,
			}, params)
			require.NoError(t, err)
			assert.Equal(t, tt.wantQuota, settled.ActualQuotaAfterGroup)
		})
	}
}

func TestCodexImageFailureDoesNotWriteSuccess(t *testing.T) {
	for _, body := range []string{`data: {"type":"response.completed","response":{"output":[]}}`, `data: {"type":"response.failed"}`, `data: {"type":"response.output_item.done"}`, `data: {"type":"response.completed","response":{"output":[{"type":"image_generation_call","status":"completed","result":"bad-base64"}]}}`} {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", "/v1/images/generations", nil)
		info := &relaycommon.RelayInfo{RelayMode: relayconstant.RelayModeImagesGenerations}
		usage, err := (&Adaptor{}).DoResponse(c, &http.Response{Body: io.NopCloser(strings.NewReader(body + "\n\n"))}, info)
		require.NotNil(t, err)
		assert.Nil(t, usage)
		assert.Empty(t, w.Body.String())
		assert.Nil(t, info.BillingImageCount)
	}
}

func TestCodexImageRejectsUnsupportedOptions(t *testing.T) {
	for _, req := range []dto.ImageRequest{{Model: "gpt-image-2", Prompt: "x", N: lo.ToPtr(uint(2))}, {Model: "gpt-image-2", Prompt: "x", ResponseFormat: "url"}, {Model: "gpt-image-2", Prompt: "x", Stream: lo.ToPtr(true)}, {Model: "gpt-6-sol", Prompt: "x"}} {
		_, err := (&Adaptor{}).ConvertImageRequest(nil, &relaycommon.RelayInfo{RelayMode: relayconstant.RelayModeImagesGenerations}, req)
		require.Error(t, err)
	}
}
