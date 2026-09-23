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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { GatewayModels } from '../components/gateway-models'

const pricing = {
  success: true,
  data: [
    {
      id: 1,
      model_name: 'gpt-standard',
      vendor_id: 1,
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 3,
      enable_groups: ['Codex', 'ClaudeKiro'],
      cache_ratio: 0,
    },
    {
      id: 2,
      model_name: 'claude-tiered',
      vendor_id: 2,
      quota_type: 0,
      model_ratio: 999,
      completion_ratio: 999,
      enable_groups: ['ClaudeKiro'],
      billing_mode: 'tiered_expr',
      billing_expr:
        'len <= 200000 ? tier("standard", p * 2 + c * 6 + cr * 0.2 + cc * 2.5 + cc1h * 4) : tier("long", p * 4 + c * 12 + cr * 0.4 + cc * 5 + cc1h * 8)',
    },
    {
      id: 3,
      model_name: 'gpt-image-request',
      supported_endpoint_types: ['image-generation'],
      quota_type: 1,
      model_price: 0.04,
      model_ratio: 0,
      completion_ratio: 0,
      enable_groups: ['Codex'],
    },
  ],
  vendors: [
    { id: 1, name: 'OpenAI' },
    { id: 2, name: 'Anthropic' },
  ],
  group_ratio: { Codex: 1, ClaudeKiro: 0.5, default: 1, vip: 1 },
  auto_groups: ['Codex', 'ClaudeKiro'],
  usable_group: {
    Codex: { desc: 'Codex', ratio: 1 },
    ClaudeKiro: { desc: 'Claude Kiro', ratio: 0.5 },
    default: { desc: 'Default', ratio: 1 },
    vip: { desc: 'VIP', ratio: 1 },
    auto: { desc: 'Automatic grouping', ratio: 'auto' },
  },
}
const clients: QueryClient[] = []

async function renderModels(
  access = { enabled: true, requireAuth: false },
  fail = false
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(['status'], {
    HeaderNavModules: { pricing: access },
    price: 1,
    usd_exchange_rate: 7.3,
  })
  if (!fail) client.setQueryData(['pricing'], pricing)
  const root = createRootRoute({ component: () => <GatewayModels /> })
  const home = createRoute({ getParentRoute: () => root, path: '/' })
  const router = createRouter({
    routeTree: root.addChildren([home]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

describe('Homepage model catalog', () => {
  it('filters providers and selects one group without exposing unused groups', async () => {
    const user = userEvent.setup()
    await renderModels()
    const table = await screen.findByRole('table', { name: /OpenAI/ })
    expect(
      within(table).getByRole('row', { name: /gpt-standard/ })
    ).toHaveTextContent('$2')
    const select = screen.getByRole('combobox', { name: 'Group' })
    expect(select).toHaveValue('Codex')
    expect(within(select).getAllByRole('option')).toHaveLength(2)
    expect(select).not.toHaveTextContent('VIP')
    await user.selectOptions(select, 'ClaudeKiro')
    expect(screen.getByRole('row', { name: /gpt-standard/ })).toHaveTextContent(
      '$1'
    )
    expect(
      screen.queryByRole('row', { name: /gpt-image-request/ })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Anthropic' }))
    expect(screen.getAllByRole('table')).toHaveLength(1)
    expect(screen.getByRole('table', { name: /Anthropic/ })).toBeVisible()
    expect(
      screen.queryByRole('row', { name: /gpt-standard/ })
    ).not.toBeInTheDocument()
    expect(select).toHaveValue('ClaudeKiro')
  })

  it('keeps long-context prices collapsed and expands every correctly adjusted tier on request', async () => {
    const user = userEvent.setup()
    await renderModels()
    await user.click(await screen.findByRole('button', { name: 'Anthropic' }))
    const standard = screen.getByRole('row', { name: /claude-tiered/ })
    expect(
      screen.queryByRole('row', { name: /> 200K/ })
    ).not.toBeInTheDocument()
    for (const text of ['$1', '$3', '$0.1', '$1.25']) {
      expect(within(standard).getByText(text, { exact: true })).toBeVisible()
    }
    expect(
      within(standard)
        .getAllByTitle('Base price before group multiplier')
        .map((el) => el.textContent)
    ).toContain('$2')
    const toggle = screen.getByRole('button', { name: 'Show price tiers' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(screen.getByRole('row', { name: /> 200K/ })).toHaveTextContent('$6')
    expect(
      screen.getByRole('button', { name: 'Hide price tiers' })
    ).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText('claude-tiered')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Hide price tiers' }))
    expect(
      screen.queryByRole('row', { name: /> 200K/ })
    ).not.toBeInTheDocument()
  })

  it('keeps models without vendor metadata visible within their group', async () => {
    await renderModels()
    expect(
      await screen.findByRole('row', { name: /gpt-image-request/ })
    ).toBeVisible()
  })

  it('does not expose cached pricing when anonymous access requires sign-in', async () => {
    await renderModels({ enabled: true, requireAuth: true })
    expect(
      await screen.findByRole('link', { name: 'Sign in' })
    ).toHaveAttribute('href', '/sign-in?redirect=%2Fpricing')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('offers retry after a pricing request fails', async () => {
    const request = vi
      .spyOn(api, 'get')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: pricing })
    const user = userEvent.setup()
    await renderModels({ enabled: true, requireAuth: false }, true)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to load pricing'
    )
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('table', { name: /OpenAI/ })).toBeVisible()
    request.mockRestore()
  })
})

it('shows fixed image pricing per image after applying the selected group ratio', async () => {
  const original = pricing.data[2]
  pricing.data[2] = {
    id: 3,
    quota_type: 1,
    model_ratio: 0,
    completion_ratio: 0,
    enable_groups: ['Codex'],
    model_name: 'gpt-image-2',
    model_price: 0.248,
    supported_endpoint_types: ['image-generation'],
  }
  const ratio = pricing.group_ratio.Codex
  pricing.group_ratio.Codex = 0.5
  try {
    await renderModels()
    expect(
      await screen.findByRole('row', { name: /gpt-image-2/ })
    ).toHaveTextContent('$0.124 / image')
  } finally {
    pricing.data[2] = original
    pricing.group_ratio.Codex = ratio
  }
})
