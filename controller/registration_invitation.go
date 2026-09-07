package controller

import (
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func ListRegistrationInvitations(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	if page > 100000 {
		page = 100000
	}
	var rows []model.RegistrationInvitation
	var total int64
	if err := model.DB.Model(&model.RegistrationInvitation{}).Count(&total).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DB.Order("id desc").Offset((page - 1) * 20).Limit(20).Find(&rows).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"items": rows, "total": total}})
}

func CreateRegistrationInvitations(c *gin.Context) {
	var request struct {
		Name      string `json:"name"`
		Count     int    `json:"count"`
		ValidDays int    `json:"valid_days"`
	}
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiError(c, err)
		return
	}
	request.Name = strings.TrimSpace(request.Name)
	if request.Count < 1 || request.Count > 50 || request.ValidDays < 1 || request.ValidDays > 30 || utf8.RuneCountInString(request.Name) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid invitation parameters"})
		return
	}
	expiresAt := common.GetTimestamp() + int64(request.ValidDays)*86400
	rows, err := model.CreateRegistrationInvitations(c.GetInt("id"), request.Name, request.Count, expiresAt)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAudit(c, "registration_invitation.create", map[string]any{"count": len(rows), "expires_at": expiresAt})
	c.JSON(http.StatusOK, gin.H{"success": true, "data": rows})
}

func RevokeRegistrationInvitation(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid invitation parameters"})
		return
	}
	result := model.DB.Model(&model.RegistrationInvitation{}).Where("id = ? AND status = ?", id, model.InvitationAvailable).Update("status", model.InvitationRevoked)
	if result.Error != nil {
		common.ApiError(c, result.Error)
		return
	}
	if result.RowsAffected != 1 {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Invitation is no longer available"})
		return
	}
	recordManageAudit(c, "registration_invitation.revoke", map[string]any{"invitation_id": id})
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// VerifyRegistrationInvitation is a rate-limited preflight, not a claim.
func VerifyRegistrationInvitation(c *gin.Context) {
	var request struct {
		Code string `json:"invitation_code"`
	}
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if err := model.ValidateRegistrationInvitation(request.Code); err != nil {
		common.ApiErrorI18n(c, "user.invitation_invalid")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
