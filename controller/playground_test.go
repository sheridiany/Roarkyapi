package controller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestPlaygroundImagesUsesImageValidationBeforeBilling(t *testing.T) {
	previousDB, previousRedis := model.DB, common.RedisEnabled
	t.Cleanup(func() { model.DB = previousDB; common.RedisEnabled = previousRedis })
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "playground.db")), &gorm.Config{})
	require.NoError(t, err)
	model.DB = db
	common.RedisEnabled = false
	sqlDB, err := db.DB()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	require.NoError(t, db.AutoMigrate(&model.User{}))
	require.NoError(t, db.Create(&model.User{Id: 1, Username: "image-test", Group: "default", Quota: 1000, Status: 1, Role: 1}).Error)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/pg/images/generations", strings.NewReader(fmt.Sprintf(`{"model":"gpt-image-2","prompt":"circle","response_format":"b64_json","n":%d}`, dto.MaxImageN+1)))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("id", 1)
	Playground(c)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "n must be an integer")
	assert.NotContains(t, w.Body.String(), "GeneralOpenAIRequest")
	var user model.User
	require.NoError(t, db.First(&user, 1).Error)
	assert.Equal(t, 1000, user.Quota)
}
