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
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSelfSubscriptionFull } from '@/features/subscriptions/api'
import { getUserGroups } from '@/lib/api'
import { formatCompactNumber, formatNumber, formatQuota } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

import { getUserQuotaDates } from '../../api'
import { calculateDashboardStats } from '../../lib'

const OverviewUsageChart = lazy(() => import('./overview-usage-chart'))
const analysisViews = [
  'Request trend',
  'Spending trend',
  'Model distribution',
  'Spending ranking',
] as const
export type OverviewAnalysisView = (typeof analysisViews)[number]

export function GatewayOverview() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const [days, setDays] = useState(7)
  const [view, setView] = useState<OverviewAnalysisView>('Spending trend')
  const range = useMemo(() => {
    const end = Math.floor(Date.now() / 1000)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - days + 1)
    return {
      start_timestamp: Math.floor(start.getTime() / 1000),
      end_timestamp: end,
      default_time: 'day',
    }
  }, [days])
  const usage = useQuery({
    queryKey: ['gateway-overview', user?.id, range],
    queryFn: async () => {
      const result = await getUserQuotaDates(range)
      if (!result.success) throw new Error('Usage unavailable')
      return result.data ?? []
    },
    enabled: Boolean(user),
  })
  const subscriptions = useQuery({
    queryKey: ['gateway-overview-subscriptions', user?.id],
    queryFn: async () => {
      const result = await getSelfSubscriptionFull()
      if (!result.success) throw new Error('Subscriptions unavailable')
      return result.data
    },
    enabled: Boolean(user),
  })
  const groups = useQuery({
    queryKey: ['user-groups'],
    queryFn: getUserGroups,
    enabled: Boolean(user),
  })
  const totals = calculateDashboardStats(usage.data ?? [])
  const pending = usage.isPending || usage.isError
  const activeSubscriptions =
    subscriptions.data?.subscriptions?.filter(
      ({ subscription }) =>
        subscription.status === 'active' &&
        subscription.end_time > Date.now() / 1000
    ).length ?? 0
  const statistics = [
    { label: t('Account balance'), value: formatQuota(user?.quota ?? 0) },
    {
      label: t('{{days}}-day requests', { days }),
      value: pending ? '—' : formatNumber(totals.totalCount),
    },
    {
      label: t('{{days}}-day spending', { days }),
      value: pending ? '—' : formatQuota(totals.totalQuota),
    },
    {
      label: t('{{days}}-day tokens', { days }),
      value: pending ? '—' : formatCompactNumber(totals.totalTokens),
    },
  ]
  return (
    <div className='gateway-overview'>
      <dl className='gateway-overview-stats'>
        {statistics.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
        <div>
          <dt>
            {t('Subscription status')}
            <span className='gateway-subscription-badge'>
              {activeSubscriptions > 0 ? t('Active') : t('None')}
            </span>
          </dt>
          <dd className='gateway-subscription-value'>
            {subscriptions.isPending || subscriptions.isError
              ? '—'
              : t(activeSubscriptions > 0 ? 'Subscription' : 'Pay as you go')}
          </dd>
        </div>
      </dl>
      <section
        className='gateway-overview-analysis'
        aria-label={t('Usage analysis')}
      >
        <div className='gateway-overview-analysis-header'>
          <div className='flex items-center gap-2'>
            <h3>{t('Usage analysis')}</h3>
            <Select
              value={String(days)}
              onValueChange={(value) => {
                if (value) setDays(Number(value))
              }}
            >
              <SelectTrigger
                size='sm'
                aria-label={t('Time range')}
                className='gateway-overview-range'
              >
                <SelectValue>{t('Last {{days}} days', { days })}</SelectValue>
              </SelectTrigger>
              <SelectContent align='start' alignItemWithTrigger={false}>
                {[7, 14, 30].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {t('Last {{days}} days', { days: value })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as OverviewAnalysisView)}
          >
            <TabsList aria-label={t('Usage analysis')}>
              {analysisViews.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {t(item)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div
          role='tabpanel'
          aria-label={t(view)}
          className='gateway-overview-chart'
        >
          {usage.isError ? (
            <div className='gateway-empty'>
              <p>{t('Loading failed')}</p>
              <button
                type='button'
                className='gateway-button gateway-button-secondary'
                onClick={() => void usage.refetch()}
              >
                {t('Retry')}
              </button>
            </div>
          ) : (
            <Suspense
              fallback={<div className='gateway-empty'>{t('Loading...')}</div>}
            >
              <OverviewUsageChart
                data={usage.data ?? []}
                loading={usage.isPending}
                view={view}
                start={range.start_timestamp}
                days={days}
              />
            </Suspense>
          )}
        </div>
      </section>
      <section
        className='gateway-overview-groups'
        aria-label={t('Available groups')}
      >
        <h3>{t('Available groups')}</h3>
        <p>{t('Groups and billing multipliers available to your account')}</p>
        {groups.isPending && <p>{t('Loading...')}</p>}
        {(groups.isError || groups.data?.success === false) && (
          <p>{t('Loading failed')}</p>
        )}
        {groups.data?.success && (
          <div className='gateway-overview-group-grid'>
            {Object.entries(groups.data.data ?? {})
              .filter(([name]) => name !== 'auto')
              .map(([name, group]) => (
                <div className='gateway-overview-group' key={name}>
                  <div className='min-w-0'>
                    <strong>{name}</strong>
                    {group.desc && group.desc !== name && <p>{group.desc}</p>}
                  </div>
                  <span>
                    {t('Multiplier')} <b>×{group.ratio}</b>
                  </span>
                </div>
              ))}
            {Object.keys(groups.data.data ?? {}).filter(
              (name) => name !== 'auto'
            ).length === 0 && <p>{t('No data')}</p>}
          </div>
        )}
      </section>
    </div>
  )
}
