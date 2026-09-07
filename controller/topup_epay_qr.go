package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/QuantumNous/new-api/common"
)

type epayQRCode struct {
	URL   string `json:"qrcode"`
	Image string `json:"qr_image,omitempty"`
}

// requestEpayQRCode uses the gateway's API rather than exposing a signed
// merchant form to the browser. The local pending order must already exist:
// a gateway notification can arrive before this request finishes.
func requestEpayQRCode(ctx context.Context, purchaseURL string, params map[string]string, key, clientIP string) (*epayQRCode, error) {
	u, err := url.Parse(purchaseURL)
	if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" {
		return nil, errors.New("invalid payment gateway URL")
	}
	u.Path = strings.TrimSuffix(u.Path, "/submit.php") + "/mapi.php"
	u.RawQuery = ""
	u.Fragment = ""
	apiParams := make(map[string]string, len(params)+1)
	for k, v := range params {
		apiParams[k] = v
	}
	apiParams["clientip"] = clientIP
	form := url.Values{}
	for k, v := range epay.GenerateParams(apiParams, key) {
		form.Set(k, v)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), strings.NewReader(form.Encode()))
	if err != nil {
		return nil, errors.New("cannot create payment gateway request")
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.New("payment gateway request failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("payment gateway returned HTTP %d", resp.StatusCode)
	}
	var result struct {
		Code   json.RawMessage `json:"code"`
		QRCode string          `json:"qrcode"`
		Image  string          `json:"img"`
	}
	if err := common.DecodeJson(io.LimitReader(resp.Body, 1<<20), &result); err != nil {
		return nil, errors.New("invalid payment gateway response")
	}
	if string(result.Code) != "1" && string(result.Code) != `"1"` {
		return nil, errors.New("payment gateway rejected QR request")
	}
	qr := &epayQRCode{}
	for _, field := range []struct {
		source string
		target *string
	}{{result.QRCode, &qr.URL}, {result.Image, &qr.Image}} {
		source, target := field.source, field.target
		if source == "" || len(source) > 8192 {
			continue
		}
		ref, err := url.Parse(source)
		if err != nil {
			continue
		}
		ref = u.ResolveReference(ref)
		if (ref.Scheme == "https" || ref.Scheme == "http") && ref.Host != "" && ref.User == nil {
			*target = ref.String()
		}
	}
	if qr.URL == "" && qr.Image == "" {
		return nil, errors.New("payment gateway did not return a usable QR code")
	}
	return qr, nil
}
