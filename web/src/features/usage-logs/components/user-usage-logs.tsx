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
import { getRouteApi } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DateTimePicker } from '@/components/datetime-picker'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSelfSubscriptionFull } from '@/features/subscriptions/api'
import { getUserBillingHistory } from '@/features/wallet/api'
import dayjs from '@/lib/dayjs'
import { formatCurrencyUSD, formatLogQuota, formatQuota } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

import { getUserLogs, getUserLogStats } from '../api'
import { usageLogSchema } from '../data/schema'
import { parseLogOther } from '../lib/format'
import { getDefaultTimeRange } from '../lib/utils'

const columnLabels = {
  api: [
    'Time',
    'Model',
    'Type',
    'Billing',
    'Group',
    'Input',
    'Output',
    'Cache Read',
    'Cache Write',
    'Duration',
    'Status',
    'Spending',
  ],
  subscription: [
    'Time',
    'Subscription',
    'Status',
    'Total Quota',
    'Used Quota',
    'Expiration Time',
  ],
  topup: ['Time', 'Order Number', 'Payment Method', 'Status', 'Amount'],
}

const route = getRouteApi('/_authenticated/usage-logs/$section')
const billingOptions = [
  { value: 'all', label: 'All billing' },
  { value: 'wallet', label: 'Pay as you go' },
  { value: 'subscription', label: 'Subscription' },
] as const

export function UserUsageLogs() {
  const { t } = useTranslation()
  const userId = useAuthStore((state) => state.auth.user?.id)
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const defaults = useMemo(() => getDefaultTimeRange(), [])
  const active = search.activity ?? 'api'
  const page = Math.max(1, search.page ?? 1)
  const pageSize = search.pageSize ?? 20
  const [draft, setDraft] = useState(() => ({
    start: dayjs(search.startTime ?? defaults.start).format('YYYY-MM-DDTHH:mm'),
    end: dayjs(search.endTime ?? defaults.end).format('YYYY-MM-DDTHH:mm'),
    model: search.model ?? '',
    billing: search.billing ?? 'all',
  }))
  useEffect(() => {
    setDraft({
      start: dayjs(search.startTime ?? defaults.start).format(
        'YYYY-MM-DDTHH:mm'
      ),
      end: dayjs(search.endTime ?? defaults.end).format('YYYY-MM-DDTHH:mm'),
      model: search.model ?? '',
      billing: search.billing ?? 'all',
    })
  }, [search.startTime, search.endTime, search.model, search.billing, defaults])
  const start = Math.floor(
    (search.startTime ?? defaults.start.getTime()) / 1000
  )
  const end = Math.floor((search.endTime ?? defaults.end.getTime()) / 1000)
  const params = {
    category: 'api' as const,
    billing_source: search.billing,
    model_name: search.model,
    start_timestamp: start,
    end_timestamp: end,
  }
  const logs = useQuery({
    queryKey: ['user-request-logs', userId, page, pageSize, params],
    queryFn: async () => {
      const result = await getUserLogs({
        ...params,
        p: page,
        page_size: pageSize,
      })
      if (!result.success) throw new Error(result.message || 'Logs unavailable')
      return {
        total: result.data?.total ?? 0,
        items: (result.data?.items ?? []).map((item) =>
          usageLogSchema.parse(item)
        ),
      }
    },
    enabled: active === 'api',
  })
  const stats = useQuery({
    queryKey: ['user-request-stats', userId, params],
    queryFn: async () => {
      const result = await getUserLogStats(params)
      if (!result.success) throw new Error('Statistics unavailable')
      return result.data
    },
    enabled: active === 'api',
  })
  const subscriptions = useQuery({
    queryKey: ['user-subscription-history', userId],
    queryFn: async () => {
      const result = await getSelfSubscriptionFull()
      if (!result.success) throw new Error('Subscriptions unavailable')
      return result.data?.all_subscriptions ?? []
    },
    enabled: active === 'subscription',
  })
  const topups = useQuery({
    queryKey: ['user-topup-history', userId],
    queryFn: async () => {
      const result = await getUserBillingHistory(1, 100)
      if (!result.success) throw new Error('Orders unavailable')
      const items = [...(result.data?.items ?? [])]
      const total = result.data?.total ?? 0
      for (let nextPage = 2; items.length < total; nextPage++) {
        const next = await getUserBillingHistory(nextPage, 100)
        if (!next.success || !next.data?.items.length) {
          throw new Error('Orders unavailable')
        }
        items.push(...next.data.items)
      }
      return items
    },
    enabled: active === 'topup',
  })
  const subscriptionRows = (subscriptions.data ?? [])
    .filter(
      ({ subscription }) =>
        subscription.start_time >= start && subscription.start_time <= end
    )
    .sort((a, b) => b.subscription.start_time - a.subscription.start_time)
  const topupRows = (topups.data ?? []).filter(
    (row) => row.create_time >= start && row.create_time <= end
  )
  let total = logs.data?.total ?? 0
  let loading = logs.isPending
  let failed = logs.isError
  if (active === 'subscription') {
    total = subscriptionRows.length
    loading = subscriptions.isPending
    failed = subscriptions.isError
  }
  if (active === 'topup') {
    total = topupRows.length
    loading = topups.isPending
    failed = topups.isError
  }
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const retry = () => {
    void logs.refetch()
    void stats.refetch()
    if (active === 'subscription') void subscriptions.refetch()
    if (active === 'topup') void topups.refetch()
  }
  const applyFilters = (activity = active) => {
    void navigate({
      search: {
        activity,
        page: 1,
        pageSize,
        startTime: new Date(draft.start).getTime(),
        endTime: new Date(draft.end).getTime(),
        model: draft.model || undefined,
        billing: draft.billing,
      },
    })
  }
  return (
    <Main className='gateway-console-page gateway-user-logs'>
      <header className='gateway-user-logs-heading'>
        <h1>{t('Usage Logs')}</h1>
        <p>{t('View your activity logs')}</p>
      </header>
      <div className='gateway-user-logs-toolbar'>
        <form
          className='gateway-user-logs-filters'
          onSubmit={(event) => {
            event.preventDefault()
            applyFilters()
          }}
        >
          <DateTimePicker
            compact
            allowClear={false}
            className='gateway-log-date'
            placeholder={t('Start time')}
            value={new Date(draft.start)}
            maxDate={new Date(draft.end)}
            onChange={(date) => {
              if (date) {
                setDraft({
                  ...draft,
                  start: dayjs(date).format('YYYY-MM-DDTHH:mm'),
                })
              }
            }}
          />
          <DateTimePicker
            compact
            allowClear={false}
            className='gateway-log-date'
            placeholder={t('End time')}
            value={new Date(draft.end)}
            minDate={new Date(draft.start)}
            onChange={(date) => {
              if (date) {
                setDraft({
                  ...draft,
                  end: dayjs(date).format('YYYY-MM-DDTHH:mm'),
                })
              }
            }}
          />
          {active === 'api' && (
            <>
              <Input
                placeholder={t('Model Name')}
                aria-label={t('Model Name')}
                value={draft.model}
                onChange={(event) =>
                  setDraft({ ...draft, model: event.target.value })
                }
              />
              <Select
                value={draft.billing}
                onValueChange={(value) => {
                  if (value) setDraft({ ...draft, billing: value })
                }}
              >
                <SelectTrigger aria-label={t('Billing')}>
                  <SelectValue>
                    {t(
                      billingOptions.find(
                        (option) => option.value === draft.billing
                      )?.label ?? 'All billing'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align='start' alignItemWithTrigger={false}>
                  {billingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <Button
            type='submit'
            variant='outline'
            size='icon'
            aria-label={t('Search')}
          >
            <Search className='size-4' />
          </Button>
        </form>
        <Tabs value={active} onValueChange={applyFilters}>
          <TabsList aria-label={t('Log category')}>
            <TabsTrigger value='api'>{t('API Calls')}</TabsTrigger>
            <TabsTrigger value='subscription'>{t('Subscription')}</TabsTrigger>
            <TabsTrigger value='topup'>{t('Top-up')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className='gateway-user-log-scroll' aria-busy={loading}>
        {loading && <div className='gateway-empty'>{t('Loading...')}</div>}
        {failed && (
          <div className='gateway-empty'>
            <p>{t('Loading failed')}</p>
            <Button variant='outline' onClick={retry}>
              {t('Retry')}
            </Button>
          </div>
        )}
        {!loading && !failed && (
          <table
            className={
              active === 'api'
                ? 'gateway-user-log-table'
                : 'gateway-user-history-table'
            }
          >
            <thead>
              <tr>
                {columnLabels[active].map((label) => (
                  <th key={label}>{t(label)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active === 'api' &&
                (logs.data?.items ?? []).map((log) => {
                  const other = parseLogOther(log.other)
                  const ratio =
                    other?.user_group_ratio && other.user_group_ratio !== -1
                      ? other.user_group_ratio
                      : (other?.group_ratio ?? 1)
                  const cacheWrite =
                    (other?.cache_creation_tokens_5m ?? 0) +
                      (other?.cache_creation_tokens_1h ?? 0) ||
                    other?.cache_creation_tokens ||
                    0
                  return (
                    <tr key={log.request_id || log.id}>
                      <td>
                        {dayjs.unix(log.created_at).format('YYYY/M/D HH:mm:ss')}
                      </td>
                      <td>
                        <span
                          className='gateway-user-log-model'
                          title={log.model_name}
                        >
                          {log.model_name}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            log.is_stream
                              ? 'gateway-log-tag gateway-log-tag-stream'
                              : 'gateway-log-tag'
                          }
                        >
                          {t(log.is_stream ? 'Streamed' : 'Non-stream')}
                        </span>
                      </td>
                      <td>
                        <span className='gateway-log-tag'>
                          {t(
                            other?.billing_source === 'subscription'
                              ? 'Subscription'
                              : 'Metered'
                          )}
                        </span>
                      </td>
                      <td>
                        <span className='text-muted-foreground'>
                          {log.group}
                          <small> ({ratio}x)</small>
                        </span>
                      </td>
                      <td>{log.prompt_tokens.toLocaleString()}</td>
                      <td>{log.completion_tokens.toLocaleString()}</td>
                      <td>{(other?.cache_tokens ?? 0).toLocaleString()}</td>
                      <td>{cacheWrite.toLocaleString()}</td>
                      <td>
                        {log.use_time.toFixed(2)}s
                        {log.is_stream && other?.frt != null && (
                          <span className='text-muted-foreground'>
                            {' '}
                            / {(other.frt / 1000).toFixed(2)}s
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={
                            log.type === 5
                              ? 'gateway-log-status-error'
                              : 'gateway-log-status-success'
                          }
                        >
                          {other?.status_code ??
                            t(log.type === 5 ? 'Error' : 'Success')}
                        </span>
                      </td>
                      <td>
                        <span className='gateway-user-log-cost'>
                          {formatLogQuota(log.quota)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              {active === 'subscription' &&
                subscriptionRows
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map(({ subscription }) => (
                    <tr key={subscription.id}>
                      <td>
                        {dayjs
                          .unix(subscription.start_time)
                          .format('YYYY/M/D HH:mm:ss')}
                      </td>
                      <td>#{subscription.id}</td>
                      <td>
                        {t(
                          subscription.status === 'active'
                            ? 'Active'
                            : 'Expired'
                        )}
                      </td>
                      <td>{formatQuota(subscription.amount_total)}</td>
                      <td>{formatQuota(subscription.amount_used)}</td>
                      <td>
                        {dayjs
                          .unix(subscription.end_time)
                          .format('YYYY/M/D HH:mm:ss')}
                      </td>
                    </tr>
                  ))}
              {active === 'topup' &&
                topupRows
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map((row) => (
                    <tr key={row.id}>
                      <td>
                        {dayjs
                          .unix(row.create_time)
                          .format('YYYY/M/D HH:mm:ss')}
                      </td>
                      <td>{row.trade_no}</td>
                      <td>{row.payment_method}</td>
                      <td>
                        {t(row.status === 'success' ? 'Success' : 'Pending')}
                      </td>
                      <td>{formatCurrencyUSD(row.money)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
        {!loading && !failed && total === 0 && (
          <div className='gateway-empty'>{t('No Logs Found')}</div>
        )}
      </div>
      <footer className='gateway-user-logs-footer'>
        <div>
          {t('Total:')} {loading ? '—' : total}
          {active === 'api' && (
            <>
              <span className='mx-2'>|</span>
              {t('Total spending:')}{' '}
              <span className='gateway-user-log-cost'>
                {stats.isPending || stats.isError
                  ? '—'
                  : formatLogQuota(stats.data?.quota ?? 0)}
              </span>
            </>
          )}
        </div>
        <nav aria-label={t('Pagination')}>
          <Button
            variant='ghost'
            size='icon'
            aria-label={t('Previous page')}
            disabled={page <= 1 || loading}
            onClick={() =>
              void navigate({ search: { ...search, page: page - 1 } })
            }
          >
            <ChevronLeft />
          </Button>
          <span aria-current='page'>{page}</span>
          <Button
            variant='ghost'
            size='icon'
            aria-label={t('Next page')}
            disabled={page >= pageCount || loading}
            onClick={() =>
              void navigate({ search: { ...search, page: page + 1 } })
            }
          >
            <ChevronRight />
          </Button>
        </nav>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            if (value) {
              void navigate({
                search: { ...search, page: 1, pageSize: Number(value) },
              })
            }
          }}
        >
          <SelectTrigger aria-label={t('Rows per page')}>
            <SelectValue>
              {t('{{count}} rows/page', { count: pageSize })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {[20, 50, 100].map((value) => (
              <SelectItem key={value} value={String(value)}>
                {t('{{count}} rows/page', { count: value })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </footer>
    </Main>
  )
}
