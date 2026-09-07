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
import { useTranslation } from 'react-i18next'

import {
  parseTiersFromExpr,
  splitBillingExprAndRequestRules,
} from '@/features/pricing/lib/billing-expr'
import {
  formatDynamicUnitPrice,
  isDynamicPricingModel,
  isUnconfiguredTaskUsageModel,
} from '@/features/pricing/lib/dynamic-price'
import { formatPrice, formatRequestPrice } from '@/features/pricing/lib/price'
import type { PricingModel } from '@/features/pricing/types'

type Props = {
  model: PricingModel
  group: string
  groupRatio: number
  priceRate: number
  usdExchangeRate: number
}

export function GatewayModelPriceRows({
  model,
  group,
  groupRatio,
  priceRate,
  usdExchangeRate,
}: Props) {
  const { t } = useTranslation()
  if (isDynamicPricingModel(model)) {
    const { billingExpr } = splitBillingExprAndRequestRules(
      model.billing_expr || ''
    )
    const tiers = parseTiersFromExpr(billingExpr)
    if (!tiers.length) {
      return (
        <tr>
          <th scope='row'>{model.model_name}</th>
          <td colSpan={5}>{t('Dynamic Pricing')}</td>
        </tr>
      )
    }
    return tiers.map((tier, index) => {
      let conditions = tier.conditions
      if (
        !conditions.length &&
        tiers.length === 2 &&
        index === 1 &&
        tiers[0].conditions.length === 1
      ) {
        const first = tiers[0].conditions[0]
        const inverse = { '<': '>=', '<=': '>', '>': '<=', '>=': '<' } as const
        conditions = [{ ...first, op: inverse[first.op] }]
      }
      const context =
        conditions
          .map((condition) => {
            const op = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' }[
              condition.op
            ]
            const count =
              condition.value % 1000 === 0
                ? `${condition.value / 1000}K`
                : String(condition.value)
            const field =
              condition.var === 'len'
                ? ''
                : `${t(condition.var === 'p' ? 'Input' : 'Output')} `
            return `${field}${op} ${count}`
          })
          .join(' / ') || (tiers.length === 1 ? '—' : t('Other'))
      const prices = [
        ['p', 'inputPrice'],
        ['c', 'outputPrice'],
        ['cc', 'cacheCreatePrice'],
        ['cr', 'cacheReadPrice'],
        ['cc1h', 'cacheCreate1hPrice'],
      ].map(([variable, field]) =>
        new RegExp(`\\b${variable}\\b`).test(billingExpr)
          ? formatDynamicUnitPrice(Number(tier[field] ?? 0), {
              tokenUnit: 'M',
              showRechargePrice: false,
              priceRate,
              usdExchangeRate,
              groupRatioMultiplier: groupRatio,
            })
          : '—'
      )
      return (
        <tr key={`${model.model_name}-${tier.label}-${context}`}>
          <th scope='row'>{model.model_name}</th>
          <td className='text-muted-foreground'>{context}</td>
          <td>{prices[0]}</td>
          <td>{prices[1]}</td>
          <td>
            <span>{prices[2]}</span>
            {prices[4] !== '—' && (
              <>
                <span className='text-muted-foreground ml-1 text-xs'>5m</span>
                <div>
                  <span>{prices[4]}</span>
                  <span className='text-muted-foreground ml-1 text-xs'>1h</span>
                </div>
              </>
            )}
          </td>
          <td>{prices[3]}</td>
        </tr>
      )
    })
  }
  return (
    <tr>
      <th scope='row'>{model.model_name}</th>
      <td>—</td>
      {isUnconfiguredTaskUsageModel(model) && <td colSpan={4}>—</td>}
      {!isUnconfiguredTaskUsageModel(model) && model.quota_type === 1 && (
        <td colSpan={4}>
          {formatRequestPrice(model, false, priceRate, usdExchangeRate, group)}{' '}
          / {t('request')}
        </td>
      )}
      {!isUnconfiguredTaskUsageModel(model) &&
        model.quota_type !== 1 &&
        (['input', 'output', 'create_cache', 'cache'] as const).map((type) => (
          <td key={type}>
            {(type === 'cache' && model.cache_ratio == null) ||
            (type === 'create_cache' && model.create_cache_ratio == null)
              ? '—'
              : formatPrice(
                  model,
                  type,
                  'M',
                  false,
                  priceRate,
                  usdExchangeRate,
                  group
                )}
          </td>
        ))}
    </tr>
  )
}
