package controller

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/oauth"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestRegistrationInvitationLifecycle(t *testing.T) {
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousMain, previousLog := common.MainDatabaseType(), common.LogDatabaseType()
	oldInvite, oldRegister, oldPassword, oldEmail, oldRedis := common.InvitationOnlyEnabled, common.RegisterEnabled, common.PasswordRegisterEnabled, common.EmailVerificationEnabled, common.RedisEnabled
	var dialect gorm.Dialector = sqlite.Open(filepath.Join(t.TempDir(), "invitations.db"))
	databaseType := common.DatabaseTypeSQLite
	if dsn := os.Getenv("INVITATION_TEST_MYSQL_DSN"); dsn != "" {
		dialect = mysql.Open(dsn)
		databaseType = common.DatabaseTypeMySQL
	}
	if dsn := os.Getenv("INVITATION_TEST_POSTGRES_DSN"); dsn != "" {
		dialect = postgres.Open(dsn)
		databaseType = common.DatabaseTypePostgreSQL
	}
	db, err := gorm.Open(dialect, &gorm.Config{})
	require.NoError(t, err)
	model.DB, model.LOG_DB = db, db
	common.SetDatabaseTypes(databaseType, databaseType)
	common.InvitationOnlyEnabled, common.RegisterEnabled, common.PasswordRegisterEnabled = true, true, true
	common.EmailVerificationEnabled, common.RedisEnabled = false, false
	sqlDB, err := db.DB()
	require.NoError(t, err)
	// SQLite serializes writers; two goroutines still compete for the same code.
	if databaseType == common.DatabaseTypeSQLite {
		sqlDB.SetMaxOpenConns(1)
	}
	t.Cleanup(func() {
		model.DB, model.LOG_DB = previousDB, previousLogDB
		common.SetDatabaseTypes(previousMain, previousLog)
		common.InvitationOnlyEnabled, common.RegisterEnabled, common.PasswordRegisterEnabled, common.EmailVerificationEnabled, common.RedisEnabled = oldInvite, oldRegister, oldPassword, oldEmail, oldRedis
		_ = sqlDB.Close()
	})
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Log{}, &model.RegistrationInvitation{}, &model.Token{}, &model.AuthFlow{}, &model.UserOAuthBinding{}))
	suffix := fmt.Sprint(common.GetTimestamp())
	register := func(username, code string) bool {
		body, marshalErr := common.Marshal(map[string]string{"username": username, "password": "Invitation123!", "invitation_code": code})
		require.NoError(t, marshalErr)
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/user/register", strings.NewReader(string(body)))
		Register(c)
		var result struct {
			Success bool `json:"success"`
		}
		require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &result))
		return result.Success
	}
	require.False(t, register("missing"+suffix, ""))
	require.False(t, register("invalid"+suffix, strings.Repeat("0", 64)))
	rows, err := model.CreateRegistrationInvitations(1, "registration test", 5, common.GetTimestamp()+3600)
	require.NoError(t, err)
	require.Len(t, rows, 5)
	for _, row := range rows {
		assert.Regexp(t, `^[A-Z0-9]{10}$`, row.Code)
		assert.Regexp(t, `[A-Z]`, row.Code)
		assert.Regexp(t, `[0-9]`, row.Code)
		assert.NoError(t, model.ValidateRegistrationInvitation(strings.ToLower(row.Code)))
	}
	legacyCode := fmt.Sprintf("%064s", suffix)
	legacyDigest := sha256.Sum256([]byte(legacyCode))
	legacy := model.RegistrationInvitation{CodeHash: hex.EncodeToString(legacyDigest[:]), CodePrefix: legacyCode[:8], Status: model.InvitationAvailable, CreatedBy: 1, ExpiresAt: common.GetTimestamp() + 3600}
	require.NoError(t, db.Create(&legacy).Error)
	assert.True(t, register("legacy"+suffix, legacyCode))

	require.NoError(t, db.Model(&model.RegistrationInvitation{}).Where("id = ?", rows[0].Id).Update("expires_at", common.GetTimestamp()-1).Error)
	assert.False(t, register("expired"+suffix, rows[0].Code))
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprint(rows[1].Id)}}
	c.Set("id", 1)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/registration-invitations/", nil)
	RevokeRegistrationInvitation(c)
	require.Equal(t, http.StatusOK, recorder.Code)
	assert.False(t, register("revoked"+suffix, rows[1].Code))
	assert.True(t, register("valid"+suffix, strings.ToLower(rows[2].Code)))
	assert.False(t, register("reused"+suffix, rows[2].Code))
	var used model.RegistrationInvitation
	require.NoError(t, db.First(&used, rows[2].Id).Error)
	assert.Equal(t, model.InvitationUsed, used.Status)
	assert.Positive(t, used.UsedUserId)
	assert.Positive(t, used.UsedAt)
	// Failed user insertion must not consume a valid invitation.
	duplicate := model.User{Username: "valid" + suffix, Password: "Invitation123!"}
	require.Error(t, duplicate.InsertWithRegistrationInvitation(rows[3].Code, 0))
	require.NoError(t, model.ValidateRegistrationInvitation(rows[3].Code))
	// Simultaneous signups: exactly one succeeds, the other cannot reuse the code.
	start := make(chan struct{})
	outcomes := make(chan error, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			<-start
			user := model.User{Username: fmt.Sprintf("race%d%s", index, suffix), Password: "Invitation123!"}
			outcomes <- user.InsertWithRegistrationInvitation(rows[3].Code, 0)
		}(i)
	}
	close(start)
	wg.Wait()
	close(outcomes)
	successes := 0
	for err := range outcomes {
		if err == nil {
			successes++
		} else {
			assert.ErrorIs(t, err, model.ErrRegistrationInvitationInvalid)
		}
	}
	assert.Equal(t, 1, successes)
	// Public list never contains a complete code or its digest.
	recorder = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/registration-invitations/", nil)
	ListRegistrationInvitations(c)
	assert.NotContains(t, recorder.Body.String(), rows[3].Code)
	assert.NotContains(t, recorder.Body.String(), rows[3].CodeHash)
	// Email verification failure leaves the invitation available.
	common.EmailVerificationEnabled = true
	assert.False(t, register("email"+suffix, rows[4].Code))
	require.NoError(t, model.ValidateRegistrationInvitation(rows[4].Code))
	// A verified email and a valid invitation must succeed together.
	email := "invited" + suffix + "@example.com"
	common.RegisterVerificationCodeWithKey(email, "123456", common.EmailVerificationPurpose)
	t.Cleanup(func() { common.DeleteKey(email, common.EmailVerificationPurpose) })
	body, err := common.Marshal(map[string]string{"username": "verified" + suffix, "password": "Invitation123!", "email": email, "verification_code": "123456", "invitation_code": rows[4].Code})
	require.NoError(t, err)
	recorder = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/user/register", strings.NewReader(string(body)))
	Register(c)
	var verifiedResult struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &verifiedResult))
	require.True(t, verifiedResult.Success, recorder.Body.String())
	var verifiedUser model.User
	require.NoError(t, db.Where("email = ?", email).First(&verifiedUser).Error)
	assert.Positive(t, verifiedUser.Id)
	require.ErrorIs(t, model.ValidateRegistrationInvitation(rows[4].Code), model.ErrRegistrationInvitationInvalid)
	// Third-party sign-in cannot create a new account, but a linked user can sign in.
	provider := &oauth.GitHubProvider{}
	oauthUser := &oauth.OAuthUser{ProviderUserID: "invite-" + suffix}
	c, _ = gin.CreateTestContext(httptest.NewRecorder())
	_, _, err = findOrCreateOAuthUser(c, provider, oauthUser, nil, "")
	require.ErrorIs(t, err, errOAuthInvitationRequired)
	require.NoError(t, db.Model(&model.User{}).Where("id = ?", used.UsedUserId).Update("github_id", oauthUser.ProviderUserID).Error)
	linked, _, err := findOrCreateOAuthUser(c, provider, oauthUser, nil, "")
	require.NoError(t, err)
	assert.Equal(t, used.UsedUserId, linked.Id)

	// OAuth registration consumes the verified identity, invitation and binding together.
	config := &model.CustomOAuthProvider{Id: 9876, Name: "Google", Slug: "invitation-test", Enabled: true}
	generic := oauth.NewGenericOAuthProvider(config)
	oauth.RegisterCustom(config.Slug, generic)
	t.Cleanup(func() { oauth.UnregisterCustomProvider(config.Slug) })
	oauthCodes, err := model.CreateRegistrationInvitations(1, "oauth registration", 5, common.GetTimestamp()+3600)
	require.NoError(t, err)
	newFlow := func(subject string, expires time.Time) string {
		payload, marshalErr := common.Marshal(oauthRegistrationPayload{User: oauth.OAuthUser{ProviderUserID: subject, Username: subject, Extra: map[string]any{"email_verified": true}}})
		require.NoError(t, marshalErr)
		token, _, createErr := model.CreateAuthFlow(model.AuthFlowCreate{Purpose: model.AuthFlowPurposeOAuthRegistration, Provider: config.Slug, Intent: model.AuthFlowIntentLogin, Payload: string(payload), ExpiresAt: expires})
		require.NoError(t, createErr)
		return token
	}
	flowToken := newFlow("google"+suffix, time.Now().Add(time.Minute))
	registered, err := finishInvitedOAuthRegistration(flowToken, oauthCodes[0].Id)
	require.NoError(t, err)
	binding, err := model.GetUserOAuthBinding(registered.Id, config.Id)
	require.NoError(t, err)
	assert.Equal(t, "google"+suffix, binding.ProviderUserId)
	require.ErrorIs(t, model.ValidateRegistrationInvitation(oauthCodes[0].Code), model.ErrRegistrationInvitationInvalid)
	_, err = finishInvitedOAuthRegistration(flowToken, oauthCodes[1].Id)
	require.ErrorIs(t, err, model.ErrAuthFlowConsumed)
	require.NoError(t, model.ValidateRegistrationInvitation(oauthCodes[1].Code))
	// A second pending authorization for an account now registered only signs it in.
	secondToken := newFlow("google"+suffix, time.Now().Add(time.Minute))
	existing, err := finishInvitedOAuthRegistration(secondToken, oauthCodes[1].Id)
	require.NoError(t, err)
	assert.Equal(t, registered.Id, existing.Id)
	require.NoError(t, model.ValidateRegistrationInvitation(oauthCodes[1].Code))
	// Invalid invitation leaves the verified OAuth identity available for correction.
	retryToken := newFlow("retry"+suffix, time.Now().Add(time.Minute))
	_, err = finishInvitedOAuthRegistration(retryToken, oauthCodes[0].Id)
	require.ErrorIs(t, err, model.ErrRegistrationInvitationInvalid)
	_, err = model.GetAuthFlow(retryToken, model.AuthFlowMatch{Purpose: model.AuthFlowPurposeOAuthRegistration})
	require.NoError(t, err)
	_, err = finishInvitedOAuthRegistration(retryToken, oauthCodes[1].Id)
	require.NoError(t, err)
	// Provider binding failure rolls back both invitation and pending-flow consumption.
	rollbackToken := newFlow("rollback"+suffix, time.Now().Add(time.Minute))
	config.Id = 0
	_, err = finishInvitedOAuthRegistration(rollbackToken, oauthCodes[2].Id)
	require.Error(t, err)
	require.NoError(t, model.ValidateRegistrationInvitation(oauthCodes[2].Code))
	_, err = model.GetAuthFlow(rollbackToken, model.AuthFlowMatch{Purpose: model.AuthFlowPurposeOAuthRegistration})
	require.NoError(t, err)
	config.Id = 9876
	_, err = finishInvitedOAuthRegistration(rollbackToken, oauthCodes[2].Id)
	require.NoError(t, err)
	expiredToken := newFlow("expiredgoogle"+suffix, time.Now().Add(time.Minute))
	expiredFlow, err := model.GetAuthFlow(expiredToken, model.AuthFlowMatch{Purpose: model.AuthFlowPurposeOAuthRegistration})
	require.NoError(t, err)
	require.NoError(t, db.Model(expiredFlow).Update("expires_at", time.Now().Add(-time.Minute)).Error)
	_, err = finishInvitedOAuthRegistration(expiredToken, oauthCodes[3].Id)
	require.ErrorIs(t, err, model.ErrAuthFlowExpired)
	require.NoError(t, model.ValidateRegistrationInvitation(oauthCodes[3].Code))
	// Starting OAuth verifies the invitation but persists only its internal ID.
	recorder = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(recorder)
	body, err = common.Marshal(map[string]string{"provider": config.Slug, "intent": "login", "invitation_code": oauthCodes[3].Code})
	require.NoError(t, err)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/oauth/state", strings.NewReader(string(body)))
	GenerateOAuthCode(c)
	var stateResult struct {
		Success bool `json:"success"`
		Data    struct {
			FlowToken string `json:"flow_token"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &stateResult))
	require.True(t, stateResult.Success)
	startFlow, err := model.GetAuthFlow(stateResult.Data.FlowToken, model.AuthFlowMatch{Purpose: model.AuthFlowPurposeOAuth})
	require.NoError(t, err)
	assert.NotContains(t, startFlow.Payload, oauthCodes[3].Code)
	require.NoError(t, model.ValidateRegistrationInvitation(oauthCodes[3].Code))
	// Cancelled provider authorization consumes state, never the invitation.
	recorder = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(recorder)
	c.Params = gin.Params{{Key: "provider", Value: config.Slug}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/oauth/"+config.Slug+"?state="+stateResult.Data.FlowToken+"&error=access_denied", nil)
	HandleOAuth(c)
	require.NoError(t, model.ValidateRegistrationInvitation(oauthCodes[3].Code))
	_, err = model.GetAuthFlow(stateResult.Data.FlowToken, model.AuthFlowMatch{Purpose: model.AuthFlowPurposeOAuth})
	require.ErrorIs(t, err, model.ErrAuthFlowConsumed)

	// Google accounts without a verified email cannot enter invited registration.
	var beforeFlows int64
	require.NoError(t, db.Model(&model.AuthFlow{}).Count(&beforeFlows).Error)
	recorder = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/oauth/google", nil)
	beginInvitedOAuthRegistration(c, "google", generic, &oauth.OAuthUser{ProviderUserID: "unverified", Email: "unverified@example.com", Extra: map[string]any{"email_verified": false}}, oauthFlowPayload{})
	var denied struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &denied))
	assert.False(t, denied.Success)
	var afterFlows int64
	require.NoError(t, db.Model(&model.AuthFlow{}).Count(&afterFlows).Error)
	assert.Equal(t, beforeFlows, afterFlows)
	// Different OAuth identities competing for one invitation cannot both register.
	raceFlows := []string{newFlow("oauthrace0"+suffix, time.Now().Add(time.Minute)), newFlow("oauthrace1"+suffix, time.Now().Add(time.Minute))}
	raceStart := make(chan struct{})
	raceResults := make(chan error, 2)
	for _, raceFlow := range raceFlows {
		go func(token string) {
			<-raceStart
			_, err := finishInvitedOAuthRegistration(token, oauthCodes[3].Id)
			raceResults <- err
		}(raceFlow)
	}
	close(raceStart)
	raceSuccesses := 0
	for range raceFlows {
		if err := <-raceResults; err == nil {
			raceSuccesses++
		} else {
			assert.ErrorIs(t, err, model.ErrRegistrationInvitationInvalid)
		}
	}
	assert.Equal(t, 1, raceSuccesses)
	// Retrying the same authorization with another code must remain possible.
	for _, raceFlow := range raceFlows {
		if _, err := model.GetAuthFlow(raceFlow, model.AuthFlowMatch{Purpose: model.AuthFlowPurposeOAuthRegistration}); err == nil {
			_, err = finishInvitedOAuthRegistration(raceFlow, oauthCodes[4].Id)
			require.NoError(t, err)
		}
	}

}
