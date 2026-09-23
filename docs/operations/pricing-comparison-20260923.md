# Pricing comparison — 2026-09-23

The public pricing catalog now displays CNY effective prices at the standard recharge rate, with verified official USD prices struck through. The green badge compares standard short-context text input/output prices after converting recharge cost to USD; different ratios produce a range. Group multipliers and billing remain unchanged.

Formula: CNY = configured USD-credit unit price × group multiplier × standard recharge price. Discount in tenths = CNY / configured USD/CNY exchange rate / official USD price × 10. Production currently has Price=1 and USDExchangeRate=7.3; group-specific or preset recharge promotions are explicitly excluded.

Reference prices checked against:
- https://developers.openai.com/api/docs/pricing (Standard; not Batch or Flex)
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
- https://developers.openai.com/api/docs/models/gpt-5.5
- https://platform.claude.com/docs/en/about-claude/pricing
- https://docs.x.ai/developers/pricing
- https://ai.google.dev/gemini-api/docs/pricing

Official data is separate from administrator billing expressions. Unknown models and incomparable fixed image rates do not receive invented official prices. Only exact published GPT/Grok context boundaries get long-context references. Gemini promotional comparisons expire on 2027-01-01 and require re-verification. Reference data is dated and must be maintained when vendors change prices.

Validation: 12 catalog regression tests, frontend typecheck, focused lint, production frontend and Linux binary builds. Local browser with production pricing snapshot confirmed green Codex 0.68 / Grok 0.96 badges, CNY selling prices alongside official USD strikethroughs, and 390px mobile document width equal to viewport width. Production authenticated UI was not impersonated; release status and static assets are checked separately.

Deployed release: `roark-20260923-discounts`. Binary SHA256: `f3f4a9b2e0f8d2d4607d48b52d4fba6f971ded85447f5161cce4991278c6c8c8`. Public status reports the release; all 1,763 static assets verified on the origin and all three changed assets fetched from the public domain matched their SHA256. Recovery compose: `/opt/roarkapi/backups/discounts-20260923-125344/compose.yml`; previous binary retained. No database or pricing configuration writes.
