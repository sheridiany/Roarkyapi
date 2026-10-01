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
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { useStatus } from '@/hooks/use-status'
import { getLobeIcon } from '@/lib/lobe-icon'
import { getModuleAccessFromStatus } from '@/lib/nav-modules'
import { useAuthStore } from '@/stores/auth-store'

import { getOfficialPriceComparison } from '../lib/official-price-comparison'
import { GatewayModelPriceRows } from './gateway-model-price-rows'

export function GatewayModels(props: { showCatalogLink?: boolean }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const user = useAuthStore((state) => state.auth.user)
  const access = getModuleAccessFromStatus(status, 'pricing')
  const canView =
    Boolean(status) && access.enabled && (!access.requireAuth || Boolean(user))
  const data = usePricingData(canView)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedVendor, setSelectedVendor] = useState('all')
  if (!access.enabled) return null
  if (!status) {
    return (
      <section id='models' className='gateway-models gateway-wide'>
        <p role='status'>{t('Loading...')}</p>
      </section>
    )
  }
  if (!canView) {
    return (
      <section id='models' className='gateway-models gateway-wide'>
        <div className='gateway-section-heading'>
          <h2>{t('Models and pricing')}</h2>
          <p>{t('Sign in required')}</p>
          <Link
            className='gateway-button gateway-button-primary mt-6'
            to='/sign-in'
            search={{ redirect: '/pricing' }}
          >
            {t('Sign in')}
          </Link>
        </div>
      </section>
    )
  }
  const groups = [
    ...new Set([...data.autoGroups, ...Object.keys(data.usableGroup)]),
  ].filter(
    (name) =>
      !['auto', 'default', 'vip', 'svip'].includes(name) &&
      data.usableGroup[name] &&
      data.models.some((model) => model.enable_groups.includes(name))
  )
  const vendors = [
    ...new Set(data.models.map((model) => model.vendor_name || t('Other'))),
  ]
  const vendor = vendors.includes(selectedVendor) ? selectedVendor : 'all'
  const matchingModels = data.models.filter(
    (model) => vendor === 'all' || (model.vendor_name || t('Other')) === vendor
  )
  const availableGroups = groups.filter((name) =>
    matchingModels.some((model) => model.enable_groups.includes(name))
  )
  const group = availableGroups.includes(selectedGroup)
    ? selectedGroup
    : availableGroups[0] || ''
  const visibleModels = matchingModels.filter((model) =>
    model.enable_groups.includes(group)
  )
  const visibleVendors = [
    ...new Set(visibleModels.map((model) => model.vendor_name || t('Other'))),
  ]
  const ratio = data.groupRatio[group] ?? data.usableGroup[group]?.ratio ?? 1
  const comparison = getOfficialPriceComparison(
    visibleModels,
    Number(ratio),
    data.priceRate,
    data.usdExchangeRate
  )
  let discount = ''
  if (comparison) {
    const min = (comparison.min * 10).toFixed(2)
    const max = (comparison.max * 10).toFixed(2)
    discount = min === max ? min : `${min}–${max}`
  }
  return (
    <section id='models' className='gateway-models gateway-wide'>
      <div className='gateway-filters'>
        <div className='gateway-vendors' role='group' aria-label={t('Vendor')}>
          <Button
            variant='outline'
            aria-pressed={vendor === 'all'}
            onClick={() => setSelectedVendor('all')}
          >
            {t('All vendors')}
          </Button>
          {vendors.map((name) => {
            const icon = data.vendors.find((item) => item.name === name)?.icon
            return (
              <Button
                key={name}
                variant='outline'
                aria-pressed={vendor === name}
                onClick={() => setSelectedVendor(name)}
              >
                {icon && getLobeIcon(icon, 16)}
                {name}
              </Button>
            )
          })}
        </div>
        <div className='gateway-group'>
          <label htmlFor='pricing-group'>{t('Group')}</label>
          <Select
            value={group}
            onValueChange={(value) => {
              if (value !== null) setSelectedGroup(value)
            }}
            disabled={!availableGroups.length}
          >
            <SelectTrigger id='pricing-group' className='gateway-group-trigger'>
              <SelectValue>
                {group} · ×{ratio}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align='start'
              alignItemWithTrigger={false}
              className='gateway-group-menu'
            >
              {availableGroups.map((name) => (
                <SelectItem
                  key={name}
                  value={name}
                  className='gateway-group-option'
                >
                  {name} · ×
                  {data.groupRatio[name] ?? data.usableGroup[name]?.ratio ?? 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {comparison && (
            <span className='gateway-ratio-badge'>
              {t('≈ {{discount}} tenths of official price', { discount })}
            </span>
          )}
        </div>
      </div>
      <p className='gateway-price-note'>
        {t('Token prices per 1M tokens. Fixed prices use the unit shown.')}{' '}
        {t(
          'Prices are in CNY at the standard recharge rate, including the group multiplier. Crossed-out prices are official USD prices.'
        )}
      </p>
      {comparison && (
        <p className='gateway-price-note'>
          {t(
            'Compared with official standard text input/output rates, using the standard recharge price and exchange rate. Excludes long context, cache, images and recharge offers. Reference: 2026-09-23.'
          )}
        </p>
      )}
      <p className='gateway-price-note sm:hidden'>
        {t('Swipe the table to see all prices.')}
      </p>
      {data.isLoading && (
        <p role='status' className='gateway-empty'>
          {t('Loading...')}
        </p>
      )}
      {data.error && (
        <div role='alert' className='gateway-empty'>
          <p>{t('Failed to load pricing')}</p>
          <Button
            type='button'
            variant='outline'
            onClick={() => void data.refetch()}
          >
            {t('Retry')}
          </Button>
        </div>
      )}
      {!data.isLoading && !data.error && visibleModels.length === 0 && (
        <p className='gateway-empty'>{t('No models available')}</p>
      )}
      {visibleVendors.map((name) => {
        const models = visibleModels.filter(
          (model) => (model.vendor_name || t('Other')) === name
        )
        const icon = data.vendors.find((item) => item.name === name)?.icon
        return (
          <div className='gateway-model-table' key={name}>
            <div className='gateway-model-heading'>
              {icon && getLobeIcon(icon, 20)}
              {name}
              <span>
                {models.length} {t('Models')}
              </span>
            </div>
            <div
              className='gateway-table-scroll'
              role='region'
              aria-label={`${name} ${t('Models and pricing')}`}
              tabIndex={0}
            >
              <table>
                <caption className='sr-only'>
                  {name} — {t('Models and pricing')}
                </caption>
                <thead>
                  <tr>
                    {[
                      'Model',
                      'Input',
                      'Output',
                      'Cache creation',
                      'Cache read',
                    ].map((label) => (
                      <th key={label}>{t(label)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <GatewayModelPriceRows
                      key={`${group}-${model.model_name}`}
                      model={model}
                      group={group}
                      groupRatio={Number(ratio)}
                      priceRate={data.priceRate}
                      usdExchangeRate={data.usdExchangeRate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      {props.showCatalogLink !== false && (
        <Link className='gateway-catalog-link' to='/pricing'>
          {t('View full model catalog')} →
        </Link>
      )}
    </section>
  )
}
