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

import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { useStatus } from '@/hooks/use-status'
import { getModuleAccessFromStatus } from '@/lib/nav-modules'
import { useAuthStore } from '@/stores/auth-store'

import { GatewayModelPriceRows } from './gateway-model-price-rows'

export function GatewayModels(props: { showCatalogLink?: boolean }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const user = useAuthStore((state) => state.auth.user)
  const access = getModuleAccessFromStatus(status, 'pricing')
  const canView =
    Boolean(status) && access.enabled && (!access.requireAuth || Boolean(user))
  const data = usePricingData(canView)
  const [selectedGroup, setSelectedGroup] = useState('all')
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
  const group = groups.includes(selectedGroup) ? selectedGroup : 'all'
  const visibleGroups = group === 'all' ? groups : [group]
  return (
    <section id='models' className='gateway-models gateway-wide'>
      <div className='gateway-filters'>
        <div className='gateway-vendors' role='group' aria-label={t('Group')}>
          <button
            type='button'
            aria-pressed={group === 'all'}
            onClick={() => setSelectedGroup('all')}
          >
            {t('All groups')}
          </button>
          {groups.map((name) => (
            <button
              type='button'
              key={name}
              aria-pressed={group === name}
              onClick={() => setSelectedGroup(name)}
            >
              {name}{' '}
              <span className='opacity-60'>
                ({data.groupRatio[name] ?? data.usableGroup[name]?.ratio}x)
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className='gateway-price-note'>{t('Per 1M tokens')}</p>
      {data.isLoading && (
        <p role='status' className='gateway-empty'>
          {t('Loading...')}
        </p>
      )}
      {data.error && (
        <div role='alert' className='gateway-empty'>
          <p>{t('Failed to load pricing')}</p>
          <button
            type='button'
            className='gateway-button gateway-button-secondary'
            onClick={() => void data.refetch()}
          >
            {t('Retry')}
          </button>
        </div>
      )}
      {!data.isLoading && !data.error && visibleGroups.length === 0 && (
        <p className='gateway-empty'>{t('No models available')}</p>
      )}
      {visibleGroups.map((name) => {
        const models = data.models.filter((model) =>
          model.enable_groups.includes(name)
        )
        return (
          <div className='gateway-model-table' key={name}>
            <div className='gateway-model-heading'>
              {name}
              <span>
                {models.length} {t('Models')}
              </span>
            </div>
            <div className='gateway-table-scroll'>
              <table>
                <caption className='sr-only'>
                  {name} — {t('Models and pricing')}
                </caption>
                <thead>
                  <tr>
                    {[
                      'Model',
                      'Context',
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
                      key={model.model_name}
                      model={model}
                      group={name}
                      groupRatio={data.groupRatio[name] ?? 1}
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
