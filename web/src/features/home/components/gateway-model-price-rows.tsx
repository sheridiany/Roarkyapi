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
  isDynamicPricingModel,
  isUnconfiguredTaskUsageModel,
} from '@/features/pricing/lib/dynamic-price'
import type { PricingModel } from '@/features/pricing/types'
import { toIntlLocale } from '@/i18n/languages'

import { getOfficialTokenPrices } from '../lib/official-price-comparison'

type Props = {
  model: PricingModel
  group: string
  groupRatio: number
  priceRate: number
  usdExchangeRate: number
}

function PriceValue(props: { price: number; base?: number }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  // Existing currency helpers follow wallet settings; this catalog explicitly compares CNY with USD.
  const options = { minimumFractionDigits: 2, maximumFractionDigits: 6 }
  const price = Number.isFinite(props.price)
    ? `¥${new Intl.NumberFormat(locale, options).format(props.price)}`
    : '—'
  return (
    <span className='gateway-price-value'>
      <span>{price}</span>
      {Number.isFinite(props.price) && props.base !== undefined && (
        <del title={t('Official price (USD)')}>
          ${new Intl.NumberFormat(locale, options).format(props.base)}
        </del>
      )}
    </span>
  )
}

export function GatewayModelPriceRows({ model, groupRatio, priceRate }: Props) {
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
      const prices = priceFields.map(([variable, field]) =>
        new RegExp(`\\b${variable}\\b`).test(billingExpr)
          ? Number(tier[field] ?? 0) * groupRatio * priceRate
          : Number.NaN
      )
      const official =
        getOfficialTokenPrices(model.model_name, conditions) || []
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
            <PriceValue price={prices[0]} base={official[0]} />
          </td>
          <td>
            <PriceValue price={prices[1]} base={official[1]} />
          </td>
          <td>
            <PriceValue price={prices[2]} base={official[2]} />
            {Number.isFinite(prices[4]) && (
              <>
                <span className='text-muted-foreground ml-1 text-xs'>5m</span>
                <div>
                  <PriceValue price={prices[4]} base={official[4]} />
                  <span className='text-muted-foreground ml-1 text-xs'>1h</span>
                </div>
              </>
            )}
          </td>
          <td>
            <PriceValue price={prices[3]} base={official[3]} />
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
          <PriceValue
            price={Number(model.model_price) * groupRatio * priceRate}
          />{' '}
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
                price={
                  model.model_ratio *
                  2 *
                  groupRatio *
                  priceRate *
                  {
                    input: 1,
                    output: model.completion_ratio,
                    cache: Number(model.cache_ratio),
                    create_cache: Number(model.create_cache_ratio),
                  }[type]
                }
                base={
                  getOfficialTokenPrices(model.model_name)?.[
                    { input: 0, output: 1, create_cache: 2, cache: 3 }[type]
                  ]
                }
              />
            )}
          </td>
        ))}
    </tr>
  )
}
