package model

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestUserLogFundingFilter(t *testing.T) {
	dialect := os.Getenv("USER_LOG_TEST_DIALECT")
	dsn := os.Getenv("USER_LOG_TEST_DSN")
	var driver gorm.Dialector
	dbType := common.DatabaseTypeSQLite
	switch dialect {
	case "mysql":
		require.NotEmpty(t, dsn)
		driver = mysql.Open(dsn)
		dbType = common.DatabaseTypeMySQL
	case "postgres":
		require.NotEmpty(t, dsn)
		driver = postgres.Open(dsn)
		dbType = common.DatabaseTypePostgreSQL
	case "", "sqlite":
		driver = sqlite.Open(filepath.Join(t.TempDir(), "logs.db"))
	default:
		t.Fatalf("unsupported test database: %s", dialect)
	}
	db, err := gorm.Open(driver, &gorm.Config{})
	require.NoError(t, err)
	originalDB, originalType := LOG_DB, common.LogDatabaseType()
	LOG_DB = db
	common.SetLogDatabaseType(dbType)
	initCol()
	t.Cleanup(func() {
		LOG_DB = originalDB
		common.SetLogDatabaseType(originalType)
		initCol()
		sqlDB, err := db.DB()
		if assert.NoError(t, err) {
			assert.NoError(t, sqlDB.Close())
		}
	})
	require.NoError(t, db.AutoMigrate(&Log{}))
	require.NoError(t, db.Where("user_id IN ?", []int{81701, 81702}).Delete(&Log{}).Error)
	now := time.Now().Unix()
	fixtures := []Log{
		{UserId: 81701, Username: "funding-reader", Type: LogTypeConsume, CreatedAt: now - 10, Quota: 100, ModelName: "model-a", Other: `{"billing_source":"wallet"}`},
		{UserId: 81701, Username: "funding-reader", Type: LogTypeConsume, CreatedAt: now - 9, Quota: 200, ModelName: "model-a", Other: `{"billing_source":"subscription","admin_info":{"secret":"private"}}`},
		{UserId: 81701, Username: "funding-reader", Type: LogTypeConsume, CreatedAt: now - 8, Quota: 300, ModelName: "model-b", Other: "{\n \"billing_source\": \"subscription\"\n}"},
		{UserId: 81701, Username: "funding-reader", Type: LogTypeConsume, CreatedAt: now - 7, Quota: 50, ModelName: "model-a", Other: ""},
		{UserId: 81701, Username: "funding-reader", Type: LogTypeError, CreatedAt: now - 6, Quota: 0, ModelName: "model-a", Other: `{"billing_source":"wallet"}`},
		{UserId: 81701, Username: "funding-reader", Type: LogTypeLogin, CreatedAt: now - 5},
		{UserId: 81702, Username: "other-reader", Type: LogTypeConsume, CreatedAt: now - 4, Quota: 9000, ModelName: "model-a", Other: `{"billing_source":"subscription"}`},
	}
	require.NoError(t, db.Create(&fixtures).Error)
	for _, tc := range []struct {
		name, source string
		count        int64
		quota        int
	}{{"all", "", 5, 650}, {"wallet", "wallet", 3, 150}, {"subscription", "subscription", 2, 500}} {
		t.Run(tc.name, func(t *testing.T) {
			filter := UserLogFilter{APIOnly: true, BillingSource: tc.source}
			rows, total, err := GetUserLogs(81701, 0, now-60, now+1, "", "", 0, 1, "", "", "", filter)
			require.NoError(t, err)
			assert.Equal(t, tc.count, total)
			require.Len(t, rows, 1)
			assert.Equal(t, 81701, rows[0].UserId)
			assert.NotContains(t, rows[0].Other, "admin_info")
			stat, err := SumUsedQuota(0, now-60, now+1, "", "funding-reader", "", 0, "", filter)
			require.NoError(t, err)
			assert.Equal(t, tc.quota, stat.Quota)
		})
	}
	rows, total, err := GetUserLogs(81701, 0, now-60, now+1, "model-a", "", 0, 20, "", "", "", UserLogFilter{APIOnly: true, BillingSource: "subscription"})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	require.Len(t, rows, 1)
	assert.Equal(t, 200, rows[0].Quota)
	stat, err := SumUsedQuota(0, now-60, now+1, "model-a", "funding-reader", "", 0, "", UserLogFilter{APIOnly: true, BillingSource: "subscription"})
	require.NoError(t, err)
	assert.Equal(t, 200, stat.Quota)
	_, _, err = GetUserLogs(81701, 0, 0, 0, "", "", 0, 20, "", "", "", UserLogFilter{BillingSource: "invalid"})
	require.Error(t, err)
}
