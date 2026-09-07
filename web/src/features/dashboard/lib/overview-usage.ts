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
import type { QuotaDataItem } from '../types'

export function buildOverviewUsage(
  data: QuotaDataItem[],
  start: number,
  days: number
) {
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(start * 1000)
    date.setDate(date.getDate() + index)
    date.setHours(0, 0, 0, 0)
    return {
      timestamp: date.getTime(),
      day: `${date.getMonth() + 1}/${date.getDate()}`,
      requests: null as number | null,
      quota: null as number | null,
    }
  })
  const byDate = new Map(daily.map((row) => [row.timestamp, row]))
  const models = new Map<
    string,
    { model: string; requests: number; quota: number }
  >()
  for (const item of data) {
    const date = new Date(item.created_at * 1000)
    date.setHours(0, 0, 0, 0)
    const day = byDate.get(date.getTime())
    if (!day) continue
    const requests = Number.isFinite(Number(item.count))
      ? Number(item.count)
      : 0
    const quota = Number.isFinite(Number(item.quota)) ? Number(item.quota) : 0
    day.requests = (day.requests ?? 0) + requests
    day.quota = (day.quota ?? 0) + quota
    const name = item.model_name || ''
    const model = models.get(name) ?? { model: name, requests: 0, quota: 0 }
    model.requests += requests
    model.quota += quota
    models.set(name, model)
  }
  const ranking = [...models.values()].sort(
    (a, b) => b.quota - a.quota || a.model.localeCompare(b.model)
  )
  const distribution = [...models.values()].sort(
    (a, b) => b.requests - a.requests || a.model.localeCompare(b.model)
  )
  const topModels = distribution.slice(0, 5)
  const remainder = distribution.slice(5)
  return {
    daily,
    ranking,
    topModels,
    otherRequests: remainder.reduce((sum, row) => sum + row.requests, 0),
    otherModelCount: remainder.length,
    totalRequests: ranking.reduce((sum, row) => sum + row.requests, 0),
    totalQuota: ranking.reduce((sum, row) => sum + row.quota, 0),
    recordedDays: daily.filter((day) => day.requests !== null).length,
  }
}
