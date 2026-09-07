package common

import (
	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestGPTImage2CatalogExposesImageEndpoint(t *testing.T) {
	for _, name := range []string{"gpt-image-2", "gpt-image-2-2026-04-21"} {
		t.Run(name, func(t *testing.T) {
			endpoints := GetEndpointTypesByChannelType(constant.ChannelTypeOpenAI, name)
			require.NotEmpty(t, endpoints)
			assert.Equal(t, []constant.EndpointType{constant.EndpointTypeImageGeneration}, endpoints)
		})
	}
	assert.False(t, IsImageGenerationModel("gpt-5.6-sol"))
}
