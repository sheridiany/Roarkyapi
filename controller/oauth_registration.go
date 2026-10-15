package controller

import (
	"errors"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/oauth"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var errOAuthInvitationRequired = errors.New("an invitation is required to create an account")

type oauthInvitationRegistration struct {
	FlowToken    string
	InvitationID int
	Provider     string
}

type oauthRegistrationPayload struct {
	User          oauth.OAuthUser `json:"user"`
	AffiliateCode string          `json:"affiliate_code,omitempty"`
}

// The pending flow contains only the verified identity, never provider tokens
// or the invitation secret. It cannot establish a session until completed.
func beginInvitedOAuthRegistration(c *gin.Context, providerName string, provider oauth.Provider, user *oauth.OAuthUser, source oauthFlowPayload) {
	if providerName == "google" && (user.Email == "" || user.Extra["email_verified"] != true) {
		common.ApiErrorI18n(c, "oauth.verified_email_required")
		return
	}
	payload, err := common.Marshal(oauthRegistrationPayload{User: *user, AffiliateCode: source.AffiliateCode})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	expiresAt := time.Now().Add(oauthAuthFlowTTL)
	token, _, err := model.CreateAuthFlow(model.AuthFlowCreate{Purpose: model.AuthFlowPurposeOAuthRegistration, Provider: providerName, Intent: model.AuthFlowIntentLogin, Payload: string(payload), ExpiresAt: expiresAt})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if source.InvitationID > 0 {
		registered, err := finishInvitedOAuthRegistration(token, source.InvitationID)
		if err == nil {
			setupLogin(registered, nil, c)
			return
		}
		if !errors.Is(err, model.ErrRegistrationInvitationInvalid) {
			handleOAuthError(c, err)
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"action": "invitation_required", "flow_token": token, "expires_at": expiresAt.Unix(), "provider": provider.GetName(),
	}})
}

func CompleteInvitedOAuthRegistration(c *gin.Context) {
	var request struct {
		FlowToken      string `json:"flow_token"`
		InvitationCode string `json:"invitation_code"`
	}
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	invitationID, err := model.GetRegistrationInvitationID(request.InvitationCode)
	if err != nil {
		common.ApiErrorI18n(c, "user.invitation_invalid")
		return
	}
	user, err := finishInvitedOAuthRegistration(request.FlowToken, invitationID)
	if err != nil {
		switch {
		case errors.Is(err, model.ErrRegistrationInvitationInvalid):
			common.ApiErrorI18n(c, "user.invitation_invalid")
		case errors.Is(err, model.ErrAuthFlowInvalid), errors.Is(err, model.ErrAuthFlowExpired), errors.Is(err, model.ErrAuthFlowConsumed):
			c.JSON(http.StatusGone, gin.H{"success": false, "code": "OAUTH_REGISTRATION_EXPIRED", "message": i18n.T(c, "oauth.registration_expired")})
		case errors.Is(err, model.ErrEmailAlreadyTaken):
			common.ApiErrorT(c, "Email address is already in use")
		default:
			handleOAuthError(c, err)
		}
		return
	}
	setupLogin(user, nil, c)
}

func finishInvitedOAuthRegistration(token string, invitationID int) (*model.User, error) {
	flow, err := model.GetAuthFlow(token, model.AuthFlowMatch{Purpose: model.AuthFlowPurposeOAuthRegistration, Intent: model.AuthFlowIntentLogin})
	if err != nil {
		return nil, err
	}
	provider := oauth.GetProvider(flow.Provider)
	if provider == nil || !provider.IsEnabled() {
		return nil, model.ErrAuthFlowInvalid
	}
	var payload oauthRegistrationPayload
	if err := common.UnmarshalJsonStr(flow.Payload, &payload); err != nil {
		return nil, err
	}
	user, err := findOAuthUser(provider, &payload.User)
	if err == nil {
		if user.Status != common.UserStatusEnabled {
			return nil, oauth.NewOAuthError(common.NewMessage("User has been banned"))
		}
		// Another flow may have created this identity in the meantime. Authenticate
		// it once, without consuming a second invitation.
		_, err = model.ConsumeAuthFlow(token, model.AuthFlowMatch{Purpose: model.AuthFlowPurposeOAuthRegistration, Provider: flow.Provider, Intent: model.AuthFlowIntentLogin})
		return user, err
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if !common.RegisterEnabled {
		return nil, &OAuthRegistrationDisabledError{}
	}
	return createOAuthUser(provider, &payload.User, payload.AffiliateCode, &oauthInvitationRegistration{FlowToken: token, InvitationID: invitationID, Provider: flow.Provider})
}
