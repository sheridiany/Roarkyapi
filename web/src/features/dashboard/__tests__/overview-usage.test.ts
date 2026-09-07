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
import { describe, expect, it } from 'vitest'

import { buildOverviewUsage } from '../lib/overview-usage'

const start = new Date(2026, 7, 31).getTime() / 1000
const day = (offset: number) =>
  new Date(2026, 7, 31 + offset, 12).getTime() / 1000

describe('overview usage summaries', () => {
  it('aggregates models by day without turning missing records into zero usage', () => {
    const result = buildOverviewUsage(
      [
        { created_at: day(0), model_name: 'gpt-4.1', count: 3, quota: 100 },
        {
          created_at: day(0),
          model_name: 'claude-sonnet',
          count: 4,
          quota: 200,
        },
        { created_at: day(2), model_name: 'gpt-4.1', count: 0, quota: 0 },
        {
          created_at: day(7),
          model_name: 'outside-range',
          count: 90,
          quota: 900,
        },
      ],
      start,
      7
    )
    expect(result.daily[0]).toMatchObject({
      day: '8/31',
      requests: 7,
      quota: 300,
    })
    expect(result.daily[1]).toMatchObject({
      day: '9/1',
      requests: null,
      quota: null,
    })
    expect(result.daily[2]).toMatchObject({ requests: 0, quota: 0 })
    expect(result.totalRequests).toBe(7)
    expect(result.totalQuota).toBe(300)
    expect(result.recordedDays).toBe(2)
    expect(result.ranking.map((row) => row.model)).toEqual([
      'claude-sonnet',
      'gpt-4.1',
    ])
  })

  it('keeps every model in request order when more than five models have usage', () => {
    const result = buildOverviewUsage(
      [
        { created_at: day(0), model_name: 'a', count: 1, quota: 700 },
        { created_at: day(0), model_name: 'b', count: 2, quota: 600 },
        { created_at: day(0), model_name: 'c', count: 3, quota: 500 },
        { created_at: day(0), model_name: 'd', count: 4, quota: 400 },
        { created_at: day(0), model_name: 'e', count: 5, quota: 300 },
        { created_at: day(0), model_name: 'f', count: 6, quota: 200 },
        { created_at: day(0), model_name: 'g', count: 7, quota: 100 },
      ],
      start,
      7
    )
    expect(result.distribution.map((row) => row.model)).toEqual([
      'g',
      'f',
      'e',
      'd',
      'c',
      'b',
      'a',
    ])
    expect(result.distribution.map((row) => row.requests)).toEqual([
      7, 6, 5, 4, 3, 2, 1,
    ])
    expect(result.totalRequests).toBe(28)
    expect(result.totalQuota).toBe(2800)
    expect(result.ranking.map((row) => row.model)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
    ])
  })

  it('returns no recorded dates and no model rows for an empty period', () => {
    const result = buildOverviewUsage([], start, 7)
    expect(result.daily).toHaveLength(7)
    expect(
      result.daily.every((row) => row.requests === null && row.quota === null)
    ).toBe(true)
    expect(result.ranking).toEqual([])
    expect(result.distribution).toEqual([])
    expect(result.recordedDays).toBe(0)
  })
})
