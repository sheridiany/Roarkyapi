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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  parseTiersFromExpr,
  splitBillingExprAndRequestRules,
} from '@/features/pricing/lib/billing-expr'
import { getFixedPriceUnitKey } from '@/features/pricing/lib/billing-mode'
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

function PriceValue(props: { price: string; base: string }) {
  const { t } = useTranslation()
  return (
    <span className='gateway-price-value'>
      <span>{props.price}</span>
      {props.base !== '—' && props.base !== props.price && (
        <del title={t('Base price before group multiplier')}>{props.base}</del>
      )}
    </span>
  )
}

export function GatewayModelPriceRows({
  model,
  group,
  groupRatio,
  priceRate,
  usdExchangeRate,
}: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  if (isDynamicPricingModel(model)) {
    const { billingExpr } = splitBillingExprAndRequestRules(
      model.billing_expr || ''
    )
    const tiers = parseTiersFromExpr(billingExpr)
    if (!tiers.length) {
      return (
        <tr>
          <th scope='row'>{model.model_name}</th>
          <td colSpan={4}>{t('Dynamic Pricing')}</td>
        </tr>
      )
    }
    return tiers.map((tier, index) => {
      if (index > 0 && !expanded) return null
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
      const priceFields = [
        ['p', 'inputPrice'],
        ['c', 'outputPrice'],
        ['cc', 'cacheCreatePrice'],
        ['cr', 'cacheReadPrice'],
        ['cc1h', 'cacheCreate1hPrice'],
      ]
      const prices = [groupRatio, 1].map((ratio) =>
        priceFields.map(([variable, field]) =>
          new RegExp(`\\b${variable}\\b`).test(billingExpr)
            ? formatDynamicUnitPrice(Number(tier[field] ?? 0), {
                tokenUnit: 'M',
                showRechargePrice: false,
                priceRate,
                usdExchangeRate,
                groupRatioMultiplier: ratio,
              })
            : '—'
        )
      )
      return (
        <tr key={`${model.model_name}-${tier.label}-${context}`}>
          <th scope='row'>
            {index === 0 && (
              <span className='gateway-model-name'>{model.model_name}</span>
            )}
            {context !== '—' && (
              <span className='gateway-tier-context'>{context}</span>
            )}
            {index === 0 && tiers.length > 1 && (
              <Button
                variant='ghost'
                size='sm'
                className='gateway-tier-toggle'
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? t('Hide price tiers') : t('Show price tiers')}
              </Button>
            )}
          </th>
          <td>
            <PriceValue price={prices[0][0]} base={prices[1][0]} />
          </td>
          <td>
            <PriceValue price={prices[0][1]} base={prices[1][1]} />
          </td>
          <td>
            <PriceValue price={prices[0][2]} base={prices[1][2]} />
            {prices[0][4] !== '—' && (
              <>
                <span className='text-muted-foreground ml-1 text-xs'>5m</span>
                <div>
                  <PriceValue price={prices[0][4]} base={prices[1][4]} />
                  <span className='text-muted-foreground ml-1 text-xs'>1h</span>
                </div>
              </>
            )}
          </td>
          <td>
            <PriceValue price={prices[0][3]} base={prices[1][3]} />
          </td>
        </tr>
      )
    })
  }
  return (
    <tr>
      <th scope='row'>{model.model_name}</th>
      {isUnconfiguredTaskUsageModel(model) && <td colSpan={4}>—</td>}
      {!isUnconfiguredTaskUsageModel(model) && model.quota_type === 1 && (
        <td colSpan={4}>
          {formatRequestPrice(model, false, priceRate, usdExchangeRate, group)}{' '}
          / {t(getFixedPriceUnitKey(model))}
        </td>
      )}
      {!isUnconfiguredTaskUsageModel(model) &&
        model.quota_type !== 1 &&
        (['input', 'output', 'create_cache', 'cache'] as const).map((type) => (
          <td key={type}>
            {(type === 'cache' && model.cache_ratio == null) ||
            (type === 'create_cache' && model.create_cache_ratio == null) ? (
              '—'
            ) : (
              <PriceValue
                price={formatPrice(
                  model,
                  type,
                  'M',
                  false,
                  priceRate,
                  usdExchangeRate,
                  group
                )}
                base={formatPrice(
                  { ...model, group_ratio: { [group]: 1 } },
                  type,
                  'M',
                  false,
                  priceRate,
                  usdExchangeRate,
                  group
                )}
              />
            )}
          </td>
        ))}
    </tr>
  )
}
