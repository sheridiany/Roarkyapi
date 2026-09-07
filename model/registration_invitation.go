package model

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"math/big"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	InvitationAvailable = 1
	InvitationUsed      = 2
	InvitationRevoked   = 3
)

var ErrRegistrationInvitationInvalid = errors.New("Invitation code is invalid, expired, or already used")

// Only a digest is persisted. The complete code is returned once, at creation.
type RegistrationInvitation struct {
	Id         int    `json:"id"`
	CodeHash   string `json:"-" gorm:"type:char(64);uniqueIndex"`
	CodePrefix string `json:"code_prefix" gorm:"type:varchar(8)"`
	Name       string `json:"name" gorm:"type:varchar(100)"`
	Status     int    `json:"status"`
	CreatedBy  int    `json:"created_by"`
	CreatedAt  int64  `json:"created_at" gorm:"autoCreateTime:false"`
	ExpiresAt  int64  `json:"expires_at"`
	UsedAt     int64  `json:"used_at"`
	UsedUserId int    `json:"used_user_id"`
}

type CreatedRegistrationInvitation struct {
	RegistrationInvitation
	Code string `json:"code"`
}

func CreateRegistrationInvitations(creator int, name string, count int, expiresAt int64) ([]CreatedRegistrationInvitation, error) {
	if creator <= 0 || count < 1 || count > 50 || utf8.RuneCountInString(name) > 100 || expiresAt <= common.GetTimestamp() {
		return nil, errors.New("invalid invitation parameters")
	}
	invitations := make([]CreatedRegistrationInvitation, 0, count)
	err := DB.Transaction(func(tx *gorm.DB) error {
		for i := 0; i < count; i++ {
			const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
			secret := make([]byte, 10)
			for {
				hasLetter, hasDigit := false, false
				for j := range secret {
					index, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
					if err != nil {
						return err
					}
					secret[j] = alphabet[index.Int64()]
					hasLetter = hasLetter || secret[j] >= 'A'
					hasDigit = hasDigit || secret[j] <= '9'
				}
				if hasLetter && hasDigit {
					break
				}
			}
			code := string(secret)
			digest := sha256.Sum256([]byte(code))
			row := RegistrationInvitation{CodeHash: hex.EncodeToString(digest[:]), CodePrefix: code[:4], Name: name, Status: InvitationAvailable, CreatedBy: creator, CreatedAt: common.GetTimestamp(), ExpiresAt: expiresAt}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
			invitations = append(invitations, CreatedRegistrationInvitation{RegistrationInvitation: row, Code: code})
		}
		return nil
	})
	return invitations, err
}

func ValidateRegistrationInvitation(code string) error {
	_, err := GetRegistrationInvitationID(code)
	return err
}

// GetRegistrationInvitationID validates a secret without claiming it. Only the
// internal ID may be carried in a server-side OAuth flow, never the secret.
func GetRegistrationInvitationID(code string) (int, error) {
	code = strings.TrimSpace(code)
	if len(code) == 10 {
		code = strings.ToUpper(code)
		for _, character := range code {
			if !(character >= 'A' && character <= 'Z') && !(character >= '0' && character <= '9') {
				return 0, ErrRegistrationInvitationInvalid
			}
		}
	} else if len(code) != 64 {
		return 0, ErrRegistrationInvitationInvalid
	}
	digest := sha256.Sum256([]byte(code))
	var row RegistrationInvitation
	err := DB.Select("id").Where("code_hash = ? AND status = ? AND expires_at > ?", hex.EncodeToString(digest[:]), InvitationAvailable, common.GetTimestamp()).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, ErrRegistrationInvitationInvalid
	}
	return row.Id, err
}

func (user *User) InsertWithRegistrationInvitation(code string, inviterId int) error {
	invitationID, err := GetRegistrationInvitationID(code)
	if err != nil {
		return err
	}
	err = DB.Transaction(func(tx *gorm.DB) error {
		return user.InsertWithRegistrationInvitationTx(tx, invitationID, inviterId)
	})
	if err != nil {
		return err
	}
	user.finishInsert(inviterId)
	return nil
}

// InsertWithRegistrationInvitationTx lets OAuth binding and its one-time flow
// commit with invitation consumption and account creation in one transaction.
func (user *User) InsertWithRegistrationInvitationTx(tx *gorm.DB, invitationID, inviterId int) error {
	now := common.GetTimestamp()
	claim := tx.Model(&RegistrationInvitation{}).Where("id = ? AND status = ? AND expires_at > ?", invitationID, InvitationAvailable, now).Updates(map[string]any{"status": InvitationUsed, "used_at": now})
	if claim.Error != nil {
		return claim.Error
	}
	if claim.RowsAffected != 1 {
		return ErrRegistrationInvitationInvalid
	}
	if err := user.InsertWithTx(tx, inviterId); err != nil {
		return err
	}
	return tx.Model(&RegistrationInvitation{}).Where("id = ?", invitationID).Update("used_user_id", user.Id).Error
}
