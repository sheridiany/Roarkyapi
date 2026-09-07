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
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { afterEach, expect, test, vi } from 'vitest'

import type { PlanRecord } from '../../types'
import { SubscriptionPlanCatalog } from '../subscription-plan-catalog'

const record: PlanRecord = {
  plan: {
    id: 1,
    title: 'Pro',
    price_amount: 49,
    currency: 'USD',
    duration_unit: 'month',
    duration_value: 1,
    quota_reset_period: 'monthly',
    enabled: true,
    sort_order: 0,
    allow_balance_pay: true,
    allow_wallet_overflow: true,
    max_purchase_per_user: 1,
    total_amount: 50000000,
  },
}
async function showCatalog(
  options: {
    empty?: boolean
    preview?: boolean
    count?: number
    available?: boolean
  } = {}
) {
  const onSelect = vi.fn()
  const root = createRootRoute({
    component: () => (
      <SubscriptionPlanCatalog
        plans={options.empty ? [] : [record]}
        purchaseCounts={new Map([[1, options.count || 0]])}
        preview={options.preview}
        canPurchase={() => options.available !== false}
        onSelect={onSelect}
      />
    ),
  })
  const index = createRoute({ getParentRoute: () => root, path: '/' })
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  await screen.findByRole('heading', { name: 'Pay as you go' })
  return onSelect
}
afterEach(async () => {
  await i18next.changeLanguage('en')
})
test('available plan opens checkout with the selected plan', async () => {
  const onSelect = await showCatalog()
  fireEvent.click(screen.getByRole('button', { name: 'Subscribe Now' }))
  expect(onSelect).toHaveBeenCalledWith(record)
  expect(screen.getByRole('link', { name: 'Top Up Balance' })).toHaveAttribute(
    'href',
    '/wallet'
  )
})
test.each([
  [{ preview: true }, 'Preview only'],
  [{ count: 1 }, 'Limit Reached'],
  [{ available: false }, 'Not available'],
])('unavailable checkout %j is disabled', async (options, label) => {
  const onSelect = await showCatalog(options)
  const button = screen.getByRole('button', { name: label })
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(onSelect).not.toHaveBeenCalled()
})
test('empty catalog keeps balance payment available', async () => {
  await showCatalog({ empty: true })
  expect(screen.getByText('No plans available')).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Top Up Balance' })
  ).toBeInTheDocument()
})
test('project Chinese locale displays currency without crashing', async () => {
  await i18next.changeLanguage('zhCN')
  await showCatalog()
  expect(screen.getByText(/49/)).toBeInTheDocument()
})
