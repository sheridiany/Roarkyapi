package common

import (
	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestGPTImage2CatalogExposesImageEndpoint(t *testing.T) {
	for _, name := range []string{"gpt-image-2", "gpt-image-2-2026-04-21", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst"} {
		t.Run(name, func(t *testing.T) {
			endpoints := GetEndpointTypesByChannelType(constant.ChannelTypeOpenAI, name)
			require.NotEmpty(t, endpoints)
			assert.Equal(t, []constant.EndpointType{constant.EndpointTypeImageGeneration}, endpoints)
		})
	}
	assert.False(t, IsImageGenerationModel("gpt-5.6-sol"))
}

func TestWanEndpointsDistinguishImagesFromVideos(t *testing.T) {
	for _, name := range []string{
		"wan2.7-image-pro", "wan2.7-image", "wan2.6-image", "wan2.6-t2i",
		"wan2.5-t2i-preview", "wan2.2-t2i-flash", "wan2.2-t2i-plus",
		"wanx2.1-t2i-turbo", "wanx2.1-t2i-plus", "wanx2.0-t2i-turbo",
	} {
		t.Run(name, func(t *testing.T) {
			assert.Contains(t, GetEndpointTypesByChannelType(constant.ChannelTypeAli, name), constant.EndpointTypeImageGeneration)
		})
	}
	for _, name := range []string{
		"wanx2.1-t2v-plus", "wanx2.1-t2v-turbo", "wanx2.1-i2v-plus", "wanx2.1-i2v-turbo",
	} {
		t.Run(name, func(t *testing.T) {
			assert.NotContains(t, GetEndpointTypesByChannelType(constant.ChannelTypeAli, name), constant.EndpointTypeImageGeneration)
		})
	}
}

func TestGrokImageCatalogDoesNotAdvertiseChatOrVideo(t *testing.T) {
	for _, m := range []string{"grok-imagine", "grok-imagine-image", "grok-imagine-image-2.0", "grok-imagine-image-quality"} {
		assert.Equal(t, []constant.EndpointType{constant.EndpointTypeImageGeneration}, GetEndpointTypesByChannelType(constant.ChannelTypeXai, m))
	}
	assert.False(t, IsImageGenerationModel("grok-imagine-video"))
	assert.False(t, IsImageGenerationModel("grok-4.7"))
}
