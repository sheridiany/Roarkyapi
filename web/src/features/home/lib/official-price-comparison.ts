/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import {
  type TierCondition,
  parseTiersFromExpr,
  splitBillingExprAndRequestRules,
} from '@/features/pricing/lib/billing-expr'
import type { PricingModel } from '@/features/pricing/types'

// Standard short-context text input/output USD per million tokens, checked 2026-09-23.
// https://developers.openai.com/api/docs/pricing (Standard, not Batch/Flex)
// https://developers.openai.com/api/docs/models/gpt-5.6-terra
// https://developers.openai.com/api/docs/models/gpt-5.5
// https://platform.claude.com/docs/en/about-claude/pricing
// https://docs.x.ai/developers/pricing
// https://ai.google.dev/gemini-api/docs/pricing
const officialPrices: Record<
  string,
  [number, number, number | undefined, number, number?]
> = {
  'gpt-6-astra': [10, 50, 12.5, 1],
  'gpt-6-sol': [2, 10, 2.5, 0.2],
  'gpt-6-luna': [0.1, 0.5, 0.125, 0.01],
  'gpt-5.6-sol': [4, 20, 5, 0.4],
  'gpt-5.6-terra': [2, 12, 2.5, 0.2],
  'gpt-5.5': [5, 30, undefined, 0.5],
  'claude-fable-5-1': [10, 50, 12.5, 0.25, 20],
  'claude-fable-5': [10, 50, 12.5, 1, 20],
  'claude-sonnet-5': [2, 10, 2.5, 0.2, 4],
  'claude-opus-5': [5, 25, 6.25, 0.5, 10],
  'claude-opus-4-8': [5, 25, 6.25, 0.5, 10],
  'claude-opus-5-5': [4, 20, 5, 0.2, 8],
  'grok-4.5': [2, 6, undefined, 0.3],
  'grok-4.6': [2, 6, undefined, 0.5],
  'grok-4.7': [2, 6, undefined, 0.5],
  'gemini-3.5-flash-lite': [0.3, 2.5, undefined, 0.03],
  'gemini-3.7-flash': [0.75, 3.75, undefined, 0.075],
  'gemini-3.8-flash': [0.75, 3.75, undefined, 0.075],
}

/** Prices ordered as input, output, 5m cache write, cache read, 1h cache write. */
export function getOfficialTokenPrices(
  modelName: string,
  conditions: TierCondition[] = []
): (number | undefined)[] | undefined {
  const name = modelName.replace(/^codex\//, '')
  const prices = officialPrices[name]
  if (!prices) return undefined
  if (
    ['gemini-3.7-flash', 'gemini-3.8-flash'].includes(name) &&
    Date.now() >= Date.parse('2027-01-01T00:00:00Z')
  ) {
    return undefined
  }
  if (!conditions.length) return prices
  // Only compare explicitly matching published context tiers, never arbitrary tiers.
  if (conditions.length !== 1 || conditions[0].var !== 'len') return undefined
  const condition = conditions[0]
  const isGPT = name.startsWith('gpt-')
  const isGrok = name.startsWith('grok-')
  if ((!isGPT && !isGrok) || condition.value !== (isGPT ? 272000 : 200000)) {
    return undefined
  }
  if (condition.op === (isGPT ? '<=' : '<')) return prices
  if (condition.op !== (isGPT ? '>' : '>=')) return undefined
  return prices.map((price, index) =>
    price === undefined ? undefined : price * (isGPT && index === 1 ? 1.5 : 2)
  )
}

/** Compare standard text rates using the site's standard CNY recharge price. */
export function getOfficialPriceComparison(
  models: PricingModel[],
  groupRatio: number,
  priceRate: number,
  usdExchangeRate: number
): { min: number; max: number } | null {
  if (
    ![groupRatio, priceRate, usdExchangeRate].every(
      (value) => Number.isFinite(value) && value > 0
    )
  ) {
    return null
  }
  const fractions: number[] = []
  for (const model of models) {
    const name = model.model_name.replace(/^codex\//, '')
    const official = getOfficialTokenPrices(name)
    if (!official || model.quota_type !== 0) continue
    let input = model.model_ratio * 2
    let output = input * model.completion_ratio
    if (model.billing_mode === 'tiered_expr') {
      const { billingExpr, requestRuleExpr } = splitBillingExprAndRequestRules(
        model.billing_expr || ''
      )
      if (requestRuleExpr) continue
      const tier = parseTiersFromExpr(billingExpr)[0]
      if (!tier) continue
      input = Number(tier.inputPrice)
      output = Number(tier.outputPrice)
    }
    if (
      ![input, output].every((value) => Number.isFinite(value) && value > 0)
    ) {
      continue
    }
    const conversion = (groupRatio * priceRate) / usdExchangeRate
    fractions.push(
      (input * conversion) / Number(official[0]),
      (output * conversion) / Number(official[1])
    )
  }
  if (!fractions.length) return null
  return { min: Math.min(...fractions), max: Math.max(...fractions) }
}
