package common

import (
	"fmt"
	"html"
)

// VerificationEmailHTML keeps the code contiguous for selection in email clients.
// It uses inline styles and tables because email clients do not support clipboard scripts.
func VerificationEmailHTML(systemName, code string, validMinutes int) string {
	return fmt.Sprintf(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>邮箱验证</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;color:#171717;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">请使用本邮件中的验证码完成邮箱验证，%[3]d 分钟内有效。</div>
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:48px 24px">
<table role="presentation" width="440" cellspacing="0" cellpadding="0" border="0" style="width:100%%;max-width:440px">
<tr><td style="padding-bottom:28px;border-bottom:1px solid #e8e8e8"><p style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.5px"><span style="color:#ff4b2b">R.</span>&nbsp; %[1]s</p></td></tr>
<tr><td style="padding:36px 0 0">
<p style="margin:0 0 14px;color:#a5a5a5;font-size:10px;letter-spacing:2px">EMAIL VERIFICATION</p>
<h1 style="margin:0 0 14px;font-size:26px;line-height:1.4;font-weight:600;letter-spacing:-0.5px">验证你的邮箱</h1>
<p style="margin:0;color:#737373;font-size:14px;line-height:1.8">在页面中输入以下验证码，完成邮箱验证。</p>
<p style="margin:32px 0 20px"><span style="font-family:Consolas,Menlo,monospace;font-size:42px;line-height:1.4;letter-spacing:7px;font-weight:500;color:#171717;white-space:nowrap;user-select:all">%[2]s</span></p>
<p style="margin:0;color:#8a8a8a;font-size:12px;line-height:1.8">选中即可复制<span style="color:#d3d3d3">&nbsp; / &nbsp;</span><span style="color:#c13c23">%[3]d 分钟内有效</span></p>
</td></tr>
<tr><td style="padding-top:36px"><p style="margin:0;padding-top:20px;border-top:1px solid #e8e8e8;color:#999999;font-size:12px;line-height:1.8">请勿向他人分享验证码。若非本人操作，请忽略此邮件。</p><p style="margin:10px 0 0;color:#aaaaaa;font-size:11px;line-height:1.8">%[1]s · 自动发送，无需回复</p></td></tr>
</table></td></tr></table></body></html>`, html.EscapeString(systemName), html.EscapeString(code), validMinutes)
}
