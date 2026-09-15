package gemini

import (
	"bufio"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGeminiImageGenerationContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, model := range []string{"gemini-2.5-flash-image", "gemini-3-pro-image", "gemini-3-pro-image-preview", "gemini-3.1-flash-image", "gemini-3.1-flash-image-preview", "gemini-3.1-flash-lite-image"} {
		t.Run(model, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", strings.NewReader(`{"model":"`+model+`","prompt":"A blue circle","size":"1536x1024","n":1}`))
			c.Request.Header.Set("Content-Type", "application/json")
			request, err := helper.GetAndValidOpenAIImageRequest(c, relayconstant.RelayModeImagesGenerations)
			require.NoError(t, err)
			info := &relaycommon.RelayInfo{RelayMode: relayconstant.RelayModeImagesGenerations, OriginModelName: model, ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: model, ChannelBaseUrl: "https://example.com"}}
			adaptor := &Adaptor{}
			converted, err := adaptor.ConvertImageRequest(c, info, *request)
			require.NoError(t, err)
			encoded, err := common.Marshal(converted)
			require.NoError(t, err)
			var upstream dto.GeminiChatRequest
			require.NoError(t, common.Unmarshal(encoded, &upstream))
			require.Len(t, upstream.Contents, 1)
			assert.Equal(t, "A blue circle", upstream.Contents[0].Parts[0].Text)
			assert.Equal(t, []string{"TEXT", "IMAGE"}, upstream.GenerationConfig.ResponseModalities)
			assert.JSONEq(t, `{"aspectRatio":"3:2"}`, string(upstream.GenerationConfig.ImageConfig))
			url, err := adaptor.GetRequestURL(info)
			require.NoError(t, err)
			assert.Contains(t, url, ":generateContent")
			response := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"candidates":[{"content":{"parts":[{"text":"done"},{"inlineData":{"mimeType":"image/png","data":"aW1hZ2U="}}]}}],"usageMetadata":{"promptTokenCount":45,"candidatesTokenCount":1200,"totalTokenCount":1245}}`))}
			rawUsage, apiErr := adaptor.DoResponse(c, response, info)
			require.Nil(t, apiErr)
			usage := rawUsage.(*dto.Usage)
			assert.Equal(t, 1245, usage.TotalTokens)
			require.NotNil(t, usage.BillingUsage)
			var output dto.ImageResponse
			require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &output))
			require.Len(t, output.Data, 1)
			assert.Equal(t, "aW1hZ2U=", output.Data[0].B64Json)
		})
	}
}

func TestGeminiImageRejectsUnsupportedRequestBeforeBilling(t *testing.T) {
	for _, extra := range []string{`,"n":2`, `,"stream":true`, `,"response_format":"url"`} {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest("POST", "/v1/images/generations", strings.NewReader(`{"model":"gemini-3.1-flash-image","prompt":"circle"`+extra+`}`))
		c.Request.Header.Set("Content-Type", "application/json")
		_, err := helper.GetAndValidOpenAIImageRequest(c, relayconstant.RelayModeImagesGenerations)
		require.Error(t, err)
	}
}

func TestGeminiImageEmptyResponseIsNotSuccess(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/v1/images/generations", nil)
	info := &relaycommon.RelayInfo{RelayMode: relayconstant.RelayModeImagesGenerations, ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "gemini-3.1-flash-image"}}
	response := &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"candidates":[{"content":{"parts":[{"text":"Cannot generate"}]}}]}`))}
	usage, err := (&Adaptor{}).DoResponse(c, response, info)
	require.NotNil(t, err)
	assert.Nil(t, usage)
}

func TestGeminiStreamSendsHeartbeatBeforeUpstreamResponds(t *testing.T) {
	service.InitHttpClient()
	setting := operation_setting.GetGeneralSetting()
	oldEnabled, oldSeconds := setting.PingIntervalEnabled, setting.PingIntervalSeconds
	setting.PingIntervalEnabled, setting.PingIntervalSeconds = true, 1
	t.Cleanup(func() { setting.PingIntervalEnabled, setting.PingIntervalSeconds = oldEnabled, oldSeconds })
	release := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-release:
		case <-r.Context().Done():
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		io.WriteString(w, "data: [DONE]\n\n")
	}))
	gateway := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, _ := gin.CreateTestContext(w)
		c.Request = r
		info := &relaycommon.RelayInfo{IsStream: true, ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "gemini-3.7-flash", ChannelBaseUrl: upstream.URL}}
		response, err := (&Adaptor{}).DoRequest(c, info, strings.NewReader(`{}`))
		if err != nil {
			return
		}
		response.(*http.Response).Body.Close()
	}))
	defer func() { close(release); gateway.Close(); upstream.Close() }()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, "POST", gateway.URL, strings.NewReader(`{}`))
	require.NoError(t, err)
	response, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer response.Body.Close()
	line, err := bufio.NewReader(response.Body).ReadString('\n')
	require.NoError(t, err)
	assert.Equal(t, ": PING\n", line)
}

func TestGeminiTextModelRejectsImageEndpoint(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/v1/images/generations", strings.NewReader(`{"model":"gemini-3.8-flash","prompt":"circle"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	_, err := helper.GetAndValidOpenAIImageRequest(c, relayconstant.RelayModeImagesGenerations)
	require.ErrorContains(t, err, "select a Gemini image model")
}
