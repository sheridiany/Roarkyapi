package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEpayQRCodeGatewayResponses(t *testing.T) {
	for _, tc := range []struct {
		name, body string
		valid      bool
	}{
		{"QR payload", `{"code":1,"qrcode":"https://qr.alipay.com/test"}`, true},
		{"image payload", `{"code":"1","img":"/qr/test.png"}`, true},
		{"gateway rejection", `{"code":"error","msg":"private merchant details"}`, false},
		{"unsafe payload", `{"code":1,"qrcode":"javascript:alert(1)","img":"data:text/html,test"}`, false},
		{"missing QR", `{"code":1,"payurl":"https://checkout.example"}`, false},
		{"invalid JSON", `<html>gateway error</html>`, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				assert.Equal(t, "/mapi.php", r.URL.Path)
				assert.NoError(t, r.ParseForm())
				params := map[string]string{}
				for k := range r.Form {
					params[k] = r.Form.Get(k)
				}
				assert.Equal(t, "192.0.2.1", params["clientip"])
				receivedSign := params["sign"]
				assert.Equal(t, epay.GenerateParams(params, "test-key")["sign"], receivedSign)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer server.Close()
			qr, err := requestEpayQRCode(context.Background(), server.URL+"/submit.php", map[string]string{"pid": "test-pid", "money": "10.00"}, "test-key", "192.0.2.1")
			if tc.valid {
				require.NoError(t, err)
				assert.NotEmpty(t, qr.URL+qr.Image)
			} else {
				require.Error(t, err)
				assert.Nil(t, qr)
				assert.NotContains(t, err.Error(), "private merchant")
			}
		})
	}
}

func TestEpayInlineCheckout(t *testing.T) {
	for _, dialect := range []string{"sqlite", "mysql", "postgres"} {
		t.Run(dialect, func(t *testing.T) {
			dsn := os.Getenv("TEST_" + strings.ToUpper(dialect) + "_DSN")
			if dialect != "sqlite" && dsn == "" {
				t.Skip("external payment database DSN not provided")
			}
			oldDB, oldLogDB := model.DB, model.LOG_DB
			oldMain, oldLog := common.MainDatabaseType(), common.LogDatabaseType()
			oldMaster, oldRedis, oldPath := common.IsMasterNode, common.RedisEnabled, common.SQLitePath
			oldAddress, oldID, oldKey := operation_setting.PayAddress, operation_setting.EpayId, operation_setting.EpayKey
			oldPrice, oldMin, oldMethods := operation_setting.Price, operation_setting.MinTopUp, operation_setting.PayMethods
			oldCallback, oldQuota := operation_setting.CustomCallbackAddress, common.QuotaPerUnit
			oldDisplay := operation_setting.GetGeneralSetting().QuotaDisplayType
			oldCompliance := *operation_setting.GetPaymentSetting()
			operation_setting.GetPaymentSetting().ComplianceConfirmed = true
			operation_setting.GetPaymentSetting().ComplianceTermsVersion = operation_setting.CurrentComplianceTermsVersion
			common.IsMasterNode = false
			common.RedisEnabled = false
			common.SQLitePath = filepath.Join(t.TempDir(), "payment.db")
			if dialect == "sqlite" {
				dsn = "local"
			}
			t.Setenv("SQL_DSN", dsn)
			require.NoError(t, model.InitDB())
			db := model.DB
			model.LOG_DB = db
			sqlDB, err := db.DB()
			require.NoError(t, err)
			t.Cleanup(func() {
				assert.NoError(t, sqlDB.Close())
				model.DB = oldDB
				model.LOG_DB = oldLogDB
				common.SetDatabaseTypes(oldMain, oldLog)
				common.IsMasterNode = oldMaster
				common.RedisEnabled = oldRedis
				common.SQLitePath = oldPath
				operation_setting.PayAddress = oldAddress
				operation_setting.EpayId = oldID
				operation_setting.EpayKey = oldKey
				operation_setting.Price = oldPrice
				operation_setting.MinTopUp = oldMin
				operation_setting.PayMethods = oldMethods
				operation_setting.CustomCallbackAddress = oldCallback
				common.QuotaPerUnit = oldQuota
				operation_setting.GetGeneralSetting().QuotaDisplayType = oldDisplay
				*operation_setting.GetPaymentSetting() = oldCompliance
			})
			for _, table := range []any{&model.User{}, &model.TopUp{}, &model.Log{}} {
				require.False(t, db.Migrator().HasTable(table), "use a dedicated empty test database")
			}
			require.NoError(t, db.AutoMigrate(&model.User{}, &model.TopUp{}, &model.Log{}))
			t.Cleanup(func() { assert.NoError(t, db.Migrator().DropTable(&model.Log{}, &model.TopUp{}, &model.User{})) })
			user := model.User{Username: "checkout-test", Status: common.UserStatusEnabled, Group: "default"}
			require.NoError(t, db.Create(&user).Error)
			operation_setting.Price = 1
			operation_setting.MinTopUp = 10
			common.QuotaPerUnit = 500000
			operation_setting.GetGeneralSetting().QuotaDisplayType = "USD"
			operation_setting.PayMethods = []map[string]string{{"type": "alipay"}}
			operation_setting.EpayId = "test-pid"
			operation_setting.EpayKey = "test-key"
			operation_setting.CustomCallbackAddress = "https://gateway.example"
			var tradeNo string
			rejectGateway := false
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				assert.NoError(t, r.ParseForm())
				tradeNo = r.Form.Get("out_trade_no")
				var record model.TopUp
				assert.NoError(t, db.Where("trade_no = ?", tradeNo).First(&record).Error)
				assert.Equal(t, "pending", record.Status, "persist before contacting gateway")
				if rejectGateway {
					_, _ = w.Write([]byte(`{"code":"error"}`))
					return
				}
				_, _ = w.Write([]byte(`{"code":1,"qrcode":"https://qr.alipay.com/test"}`))
			}))
			defer server.Close()
			operation_setting.PayAddress = server.URL
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(func(c *gin.Context) { c.Set("id", user.Id) })
			router.POST("/pay", RequestEpay)
			router.GET("/notify", EpayNotify)
			router.GET("/history", GetUserTopUps)
			req := httptest.NewRequest(http.MethodPost, "/pay", strings.NewReader(`{"amount":10,"payment_method":"alipay","inline_qr":true}`))
			req.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, req)
			var result struct {
				Message  string
				Checkout struct {
					TradeNo string `json:"trade_no"`
					QRCode  string `json:"qrcode"`
					Money   float64
				}
			}
			require.NoError(t, common.Unmarshal(response.Body.Bytes(), &result))
			require.Equal(t, "success", result.Message)
			assert.Equal(t, tradeNo, result.Checkout.TradeNo)
			assert.Equal(t, 10.0, result.Checkout.Money)
			assert.Equal(t, "https://qr.alipay.com/test", result.Checkout.QRCode)
			assert.NotContains(t, response.Body.String(), "test-key")
			assert.NotContains(t, response.Body.String(), "sign")
			history := httptest.NewRecorder()
			router.ServeHTTP(history, httptest.NewRequest(http.MethodGet, "/history?keyword="+tradeNo, nil))
			assert.Contains(t, history.Body.String(), `"status":"pending"`)
			invalid := httptest.NewRecorder()
			router.ServeHTTP(invalid, httptest.NewRequest(http.MethodGet, "/notify?sign=wrong&out_trade_no="+tradeNo, nil))
			assert.Equal(t, "fail", invalid.Body.String())
			require.NoError(t, db.First(&user, user.Id).Error)
			assert.Zero(t, user.Quota)
			otherOrders, total, searchErr := model.SearchUserTopUps(user.Id+1, tradeNo, &common.PageInfo{Page: 1, PageSize: 10})
			require.NoError(t, searchErr)
			assert.Empty(t, otherOrders)
			assert.Zero(t, total)
			params := epay.GenerateParams(map[string]string{"pid": "test-pid", "type": "alipay", "out_trade_no": tradeNo, "trade_no": "upstream-1", "trade_status": "TRADE_SUCCESS", "money": "10.00", "sign_type": "MD5"}, "test-key")
			query := url.Values{}
			for k, v := range params {
				query.Set(k, v)
			}
			for i := 0; i < 2; i++ {
				callback := httptest.NewRecorder()
				router.ServeHTTP(callback, httptest.NewRequest(http.MethodGet, "/notify?"+query.Encode(), nil))
				assert.Equal(t, "success", callback.Body.String())
			}
			require.NoError(t, db.First(&user, user.Id).Error)
			assert.Equal(t, 5000000, user.Quota, "duplicate notification must not credit twice")
			rejectGateway = true
			rejected := httptest.NewRecorder()
			retry := httptest.NewRequest(http.MethodPost, "/pay", strings.NewReader(`{"amount":10,"payment_method":"alipay","inline_qr":true}`))
			retry.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(rejected, retry)
			assert.Contains(t, rejected.Body.String(), `"message":"error"`)
			var pending model.TopUp
			require.NoError(t, db.Where("trade_no = ?", tradeNo).First(&pending).Error)
			assert.Equal(t, "pending", pending.Status)
		})
	}
}
