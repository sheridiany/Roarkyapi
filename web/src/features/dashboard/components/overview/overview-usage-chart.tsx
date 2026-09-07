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
import { VChart } from '@visactor/react-vchart'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTheme } from '@/context/theme-provider'
import { buildOverviewUsage } from '@/features/dashboard/lib/overview-usage'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { getCurrencyDisplay } from '@/lib/currency'
import { formatQuota } from '@/lib/format'
import { VCHART_OPTION } from '@/lib/vchart'

import type { OverviewAnalysisView } from './gateway-overview'

interface OverviewUsageChartProps {
  data: QuotaDataItem[]
  loading: boolean
  view: OverviewAnalysisView
  start: number
  days: number
}

export default function OverviewUsageChart(props: OverviewUsageChartProps) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const [selectedModel, setSelectedModel] = useState('__all__')
  const all = useMemo(
    () => buildOverviewUsage(props.data, props.start, props.days),
    [props.data, props.start, props.days]
  )
  const model = all.ranking.some((row) => row.model === selectedModel)
    ? selectedModel
    : '__all__'
  const rows = useMemo(
    () =>
      model === '__all__'
        ? all
        : buildOverviewUsage(
            props.data.filter((row) => (row.model_name || '') === model),
            props.start,
            props.days
          ),
    [all, model, props.data, props.start, props.days]
  )
  const isCost =
    props.view === 'Spending trend' || props.view === 'Spending ranking'
  const isRanking = props.view === 'Spending ranking'
  const isDistribution = props.view === 'Model distribution'
  const isTrend = !isRanking && !isDistribution
  const current = isTrend ? rows : all
  const { config, meta } = getCurrencyDisplay()
  const rate = 'exchangeRate' in meta ? meta.exchangeRate : 1
  const divisor = meta.kind === 'tokens' ? 1 : config.quotaPerUnit / rate
  const currencySymbol = 'symbol' in meta ? meta.symbol : ''
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
  const accent = resolvedTheme === 'dark' ? '#ff785d' : '#ed5536'
  const axisColor = resolvedTheme === 'dark' ? '#a3a3a3' : '#88817b'
  const gridColor = resolvedTheme === 'dark' ? '#303030' : '#eeeae7'
  const summaryLabel = isCost ? 'Total spending' : 'Total requests'
  const values = rows.daily.map((row) => ({
    ...row,
    cost: row.quota === null ? null : row.quota / divisor,
  }))
  const tooltip = {
    title: { value: (datum: Record<string, unknown>) => String(datum.day) },
    content: [
      {
        key: t('Requests'),
        value: (datum: Record<string, unknown>) =>
          datum.requests === null
            ? t('No records')
            : Number(datum.requests).toLocaleString(),
      },
      {
        key: t('Spending'),
        value: (datum: Record<string, unknown>) =>
          datum.quota === null ? '—' : formatQuota(Number(datum.quota)),
      },
    ],
  }
  const shared = {
    data: [{ id: 'daily', values }],
    xField: 'day',
    color: [accent],
    invalidType: 'break' as const,
    padding: { top: 18, right: 16, bottom: 4, left: 4 },
    axes: [
      {
        orient: 'bottom' as const,
        type: 'band' as const,
        domainLine: { visible: false },
        tick: { visible: false },
        grid: { visible: false },
        label: { style: { fill: axisColor, fontSize: 11 }, autoRotate: false },
      },
      {
        orient: 'left' as const,
        type: 'linear' as const,
        min: 0,
        domainLine: { visible: false },
        tick: { visible: false },
        grid: { visible: true, style: { stroke: gridColor, lineDash: [3, 5] } },
        label: {
          style: { fill: axisColor, fontSize: 11 },
          formatMethod: (value: string | number) =>
            isCost ? `${currencySymbol}${value}` : String(value),
        },
      },
    ],
    legends: { visible: false },
    crosshair: {
      xField: {
        visible: true,
        line: {
          type: 'line' as const,
          style: { stroke: axisColor, lineDash: [3, 4], lineWidth: 1 },
        },
      },
    },
    tooltip: { mark: tooltip, dimension: tooltip },
    animation: false,
    theme,
    background: 'transparent',
  }
  const spec = isCost
    ? {
        ...shared,
        type: 'bar' as const,
        yField: 'cost',
        barMaxWidth: 28,
        bar: { style: { cornerRadius: [4, 4, 0, 0], fillOpacity: 0.86 } },
      }
    : {
        ...shared,
        type: 'area' as const,
        yField: 'requests',
        area: { style: { fillOpacity: 0.07, curveType: 'linear' as const } },
        line: { style: { lineWidth: 2, curveType: 'linear' as const } },
        point: {
          visible: true,
          style: { size: 4, fill: accent, stroke: accent },
        },
      }
  if (props.loading) {
    return <div className='gateway-empty'>{t('Loading...')}</div>
  }
  return (
    <div className='gateway-usage-visual'>
      <div className='gateway-usage-summary'>
        <div>
          <span className='gateway-usage-summary-label'>{t(summaryLabel)}</span>
          <strong>
            {isCost
              ? formatQuota(current.totalQuota)
              : current.totalRequests.toLocaleString()}
          </strong>
          <span className='gateway-usage-summary-caption'>
            {t('Last {{days}} days', { days: props.days })}
          </span>
        </div>
        {isTrend && (
          <Select
            value={model}
            onValueChange={(value) => {
              if (value !== null) setSelectedModel(value)
            }}
          >
            <SelectTrigger
              size='sm'
              aria-label={t('Model')}
              className='gateway-usage-model-select'
            >
              <SelectValue>
                {model === '__all__' ? t('All models') : model || t('Unknown')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align='end' alignItemWithTrigger={false}>
              <SelectItem value='__all__'>{t('All models')}</SelectItem>
              {all.ranking.map((row) => (
                <SelectItem value={row.model} key={row.model}>
                  {row.model || t('Unknown')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {current.recordedDays === 0 ? (
        <div className='gateway-usage-no-data'>
          {t('No usage in this period')}
        </div>
      ) : (
        <>
          {isTrend && (
            <>
              <div className='gateway-usage-canvas' aria-label={t(props.view)}>
                <VChart
                  key={`${props.view}-${theme}-${model}`}
                  spec={spec}
                  option={VCHART_OPTION}
                />
              </div>
              {rows.recordedDays < props.days && (
                <p className='gateway-usage-chart-note'>
                  {t('Dates without records are left blank.')}
                </p>
              )}
            </>
          )}
          {isDistribution && (
            <ol
              className='gateway-usage-distribution'
              aria-label={t('Model distribution')}
            >
              {all.distribution.map((row) => (
                <li key={row.model}>
                  <div>
                    <span>{row.model || t('Unknown')}</span>
                    <span>
                      {row.requests.toLocaleString()}{' '}
                      <small>
                        {all.totalRequests > 0
                          ? ((row.requests / all.totalRequests) * 100).toFixed(
                              1
                            )
                          : '0'}
                        %
                      </small>
                    </span>
                  </div>
                  <div className='gateway-usage-track' aria-hidden='true'>
                    <span
                      style={{
                        width: `${all.totalRequests > 0 ? (row.requests / all.totalRequests) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
          {isRanking && (
            <div className='gateway-usage-ranking'>
              <table aria-label={t('Spending ranking')}>
                <thead>
                  <tr>
                    <th>{t('Model')}</th>
                    <th>{t('Spending')}</th>
                    <th>{t('Share')}</th>
                  </tr>
                </thead>
                <tbody>
                  {all.ranking.map((row) => (
                    <tr key={row.model}>
                      <th scope='row'>{row.model || t('Unknown')}</th>
                      <td>{formatQuota(row.quota)}</td>
                      <td>
                        <span>
                          {all.totalQuota > 0
                            ? ((row.quota / all.totalQuota) * 100).toFixed(1)
                            : '0'}
                          %
                        </span>
                        <span
                          className='gateway-usage-track'
                          aria-hidden='true'
                        >
                          <span
                            style={{
                              width: `${all.totalQuota > 0 ? (row.quota / all.totalQuota) * 100 : 0}%`,
                            }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
