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
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { UsageLogs } from '../../index'

let client: QueryClient
const requests: URL[] = []
afterEach(() => {
  client?.clear()
  requests.length = 0
  useAuthStore.getState().auth.reset()
  localStorage.clear()
})

test('log tabs and model search update API filters while token categories remain separately readable', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  useAuthStore.getState().auth.setUser({ id: 8, username: 'reader', role: 1 })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['status'], {})
  vi.spyOn(api, 'get').mockImplementation(async (path) => {
    const url = new URL(path, 'https://preview.example')
    requests.push(url)
    if (url.pathname.endsWith('/stat')) {
      return { data: { success: true, data: { quota: 20, rpm: 1, tpm: 44 } } }
    }
    if (url.pathname === '/api/log/self') {
      return {
        data: {
          success: true,
          data: {
            total: 1,
            items: [
              {
                id: 4,
                user_id: 8,
                created_at: 1788560000,
                type: 2,
                content: '',
                username: 'reader',
                token_name: 'work',
                model_name: 'gpt-5',
                quota: 20,
                prompt_tokens: 21,
                completion_tokens: 52,
                use_time: 2,
                is_stream: true,
                channel: 0,
                token_id: 3,
                group: 'default',
                ip: '',
                request_id: 'test-request',
                other: JSON.stringify({
                  cache_tokens: 3080,
                  cache_creation_tokens_5m: 4213,
                  cache_creation_tokens_1h: 100,
                  billing_source: 'wallet',
                }),
              },
            ],
          },
        },
      }
    }
    return { data: { success: true, data: {} } }
  })
  const root = createRootRoute()
  const authenticated = createRoute({
    getParentRoute: () => root,
    id: '_authenticated',
  })
  const logsRoute = createRoute({
    getParentRoute: () => authenticated,
    path: 'usage-logs/$section',
    component: UsageLogs,
    validateSearch: (search) => search,
  })
  const router = createRouter({
    routeTree: root.addChildren([authenticated.addChildren([logsRoute])]),
    history: createMemoryHistory({ initialEntries: ['/usage-logs/common'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  expect(
    await screen.findByRole('columnheader', { name: 'Input' })
  ).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'Output' })).toBeVisible()
  expect(await screen.findByRole('cell', { name: '3,080' })).toBeVisible()
  expect(screen.getByRole('cell', { name: '4,313' })).toBeVisible()
  expect(
    screen.queryByTitle('Click to view full details')
  ).not.toBeInTheDocument()
  const spending = screen.getByRole('cell', { name: '$0.00004' })
  expect(spending.querySelector('button')).toBeNull()
  fireEvent.click(spending)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.change(screen.getByPlaceholderText('Model Name'), {
    target: { value: 'gpt-5' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
  await waitFor(() =>
    expect(
      requests.some(
        (url) =>
          url.pathname === '/api/log/self' &&
          url.searchParams.get('model_name') === 'gpt-5' &&
          url.searchParams.get('category') === 'api'
      )
    ).toBe(true)
  )
  expect(screen.getByRole('tab', { name: 'API Calls' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: 'Billing' }))
  await user.click(screen.getByRole('option', { name: 'Subscription' }))
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
  await waitFor(() =>
    expect(
      requests.some(
        (url) =>
          url.pathname === '/api/log/self' &&
          url.searchParams.get('billing_source') === 'subscription'
      )
    ).toBe(true)
  )
  await waitFor(() =>
    expect(
      requests.some(
        (url) =>
          url.pathname === '/api/log/self/stat' &&
          url.searchParams.get('billing_source') === 'subscription'
      )
    ).toBe(true)
  )
})
