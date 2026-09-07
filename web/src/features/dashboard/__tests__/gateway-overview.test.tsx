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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { GatewayOverview } from '../components/overview/gateway-overview'
import OverviewUsageChart from '../components/overview/overview-usage-chart'

vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))
let client: QueryClient

afterEach(() => {
  client?.clear()
  useAuthStore.getState().auth.reset()
})

it('shows personal usage for an administrator and reloads the selected period', async () => {
  useAuthStore
    .getState()
    .auth.setUser({ id: 7, username: 'admin', role: 100, quota: 500000 })
  const request = vi.spyOn(api, 'get').mockImplementation(async (url) => ({
    data:
      url === '/api/data/self'
        ? {
            success: true,
            data: [
              {
                created_at: Math.floor(Date.now() / 1000),
                model_name: 'gpt-4.1',
                count: 3,
                token_used: 12,
                quota: 500000,
              },
              {
                created_at: Math.floor(Date.now() / 1000),
                model_name: 'claude-sonnet-4-5',
                count: 4,
                token_used: 8,
                quota: 500000,
              },
            ],
          }
        : {
            success: true,
            data:
              url === '/api/user/self/groups'
                ? { default: { desc: 'Default group', ratio: 1 } }
                : { subscriptions: [] },
          },
  }))
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <GatewayOverview />
    </QueryClientProvider>
  )
  await waitFor(() =>
    expect(
      screen.getByText('7-day requests').nextElementSibling
    ).toHaveTextContent('7')
  )
  expect(screen.getByText('7-day tokens').nextElementSibling).toHaveTextContent(
    '20'
  )
  expect(request.mock.calls.some(([url]) => url === '/api/data')).toBe(false)
  for (const label of ['API Info', 'Announcements', 'FAQ', 'Uptime']) {
    expect(screen.queryByText(label, { exact: true })).not.toBeInTheDocument()
  }
  const user = userEvent.setup()
  expect(screen.getByRole('tab', { name: 'Spending trend' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await user.click(screen.getByRole('tab', { name: 'Spending ranking' }))
  expect(
    screen.getByRole('tabpanel', { name: 'Spending ranking' })
  ).toBeVisible()
  const ranking = await screen.findByRole('table', { name: 'Spending ranking' })
  expect(within(ranking).getAllByRole('row')).toHaveLength(3)
  await user.keyboard('{ArrowLeft}{Enter}')
  expect(
    screen.getByRole('tab', { name: 'Model distribution' })
  ).toHaveAttribute('aria-selected', 'true')
  expect(
    await screen.findByRole('list', { name: 'Model distribution' })
  ).toBeVisible()
  await user.click(screen.getByRole('tab', { name: 'Request trend' }))
  await user.click(screen.getByRole('combobox', { name: 'Model' }))
  await user.click(screen.getByRole('option', { name: 'gpt-4.1' }))
  const panel = screen.getByRole('tabpanel', { name: 'Request trend' })
  expect(
    within(panel).getByText('Total requests').nextElementSibling
  ).toHaveTextContent('3')
  expect(
    within(panel).getByText('Dates without records are left blank.')
  ).toBeVisible()
  await user.click(screen.getByRole('combobox', { name: 'Time range' }))
  await user.click(screen.getByRole('option', { name: 'Last 30 days' }))
  await waitFor(() => {
    const requests = request.mock.calls.filter(
      ([url]) => url === '/api/data/self'
    )
    expect(requests).toHaveLength(2)
    const params = requests[1][1]?.params
    const start = new Date(params.start_timestamp * 1000)
    expect(start.getHours()).toBe(0)
    expect(
      params.end_timestamp - params.start_timestamp
    ).toBeGreaterThanOrEqual(29 * 86400)
    expect(params.end_timestamp - params.start_timestamp).toBeLessThan(
      30 * 86400
    )
  })
})

it('shows a retry action on usage failure and an empty state after a successful retry', async () => {
  useAuthStore
    .getState()
    .auth.setUser({ id: 7, username: 'admin', role: 100, quota: 500000 })
  let unavailable = true
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/data/self') {
      return { data: { success: !unavailable, data: [] } }
    }
    return {
      data: {
        success: true,
        data: url === '/api/user/self/groups' ? {} : { subscriptions: [] },
      },
    }
  })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <GatewayOverview />
    </QueryClientProvider>
  )
  const retry = await screen.findByRole('button', { name: 'Retry' })
  expect(
    screen.getByText('7-day requests').nextElementSibling
  ).toHaveTextContent('—')
  unavailable = false
  await userEvent.setup().click(retry)
  expect(await screen.findByText('No usage in this period')).toBeVisible()
  expect(
    screen.getByText('7-day requests').nextElementSibling
  ).toHaveTextContent('0')
})

it('shows every model with its request count and share when more than five models have usage', () => {
  const start = new Date(2026, 8, 7).getTime() / 1000
  const models = [
    'gpt-6-astra',
    'gpt-5.6-terra',
    'claude-sonnet-5',
    'gpt-5.5',
    'gemini-3.8-flash',
    'gpt-image-2',
  ]
  render(
    <OverviewUsageChart
      data={models.map((model_name) => ({
        created_at: start,
        model_name,
        count: 1,
        quota: 1,
      }))}
      loading={false}
      view='Model distribution'
      start={start}
      days={7}
    />
  )
  const list = screen.getByRole('list', { name: 'Model distribution' })
  expect(within(list).getAllByRole('listitem')).toHaveLength(6)
  for (const model of models)
    expect(within(list).getByText(model)).toBeVisible()
  expect(within(list).getAllByText('16.7%')).toHaveLength(6)
  expect(within(list).queryByText('Other')).not.toBeInTheDocument()
})
