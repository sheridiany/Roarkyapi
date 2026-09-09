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
import i18next from 'i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { Home } from '../index'

beforeEach(() => {
  useAuthStore.getState().auth.reset()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(async () => {
  useAuthStore.getState().auth.reset()
  await i18next.changeLanguage('en')
})

it.each([false, true])(
  'opens the correct console destination when authenticated is %s',
  async (authenticated) => {
    if (authenticated) {
      useAuthStore
        .getState()
        .auth.setUser({ id: 1, username: 'preview', role: 1 })
    }
    await i18next.changeLanguage('zh')
    const root = createRootRoute()
    const home = createRoute({
      getParentRoute: () => root,
      path: '/',
      component: Home,
    })
    const signIn = createRoute({
      getParentRoute: () => root,
      path: '/sign-in',
      component: () => <h1>Sign-in destination</h1>,
    })
    const dashboard = createRoute({
      getParentRoute: () => root,
      path: '/dashboard',
      component: () => <h1>Console destination</h1>,
    })
    const router = createRouter({
      routeTree: root.addChildren([home, signIn, dashboard]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()
    const client = new QueryClient()
    client.setQueryData(['status'], {
      user_agreement_enabled: true,
      privacy_policy_enabled: true,
    })
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
    expect(
      await screen.findByRole('heading', {
        name: /Your models\.\s*One gateway\./,
      })
    ).toBeVisible()
    expect(screen.getAllByRole('article')).toHaveLength(4)
    for (const [name, count] of [
      ['OpenAI', 8],
      ['Anthropic', 5],
      ['Gemini', 3],
      ['xAI', 2],
    ] as const) {
      const card = screen.getByRole('article', { name })
      expect(card).toBeVisible()
      expect(within(card).getAllByRole('listitem')).toHaveLength(count)
    }
    expect(screen.getByRole('listitem', { name: 'GPT Image 2' })).toBeVisible()
    expect(
      screen.getByRole('listitem', { name: 'GPT Image 2.5 Flare' })
    ).toBeVisible()
    expect(
      screen.getByRole('listitem', { name: 'GPT Image 2.5 Sunburst' })
    ).toBeVisible()
    expect(screen.getByRole('main')).toHaveAttribute('lang', 'en')
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' })
    ).toHaveAttribute('href', '/privacy-policy')
    expect(
      screen.getByRole('link', { name: 'User Agreement' })
    ).toHaveAttribute('href', '/user-agreement')
    expect(
      screen.queryByRole('link', { name: 'GitHub' })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    const button = screen.getByRole('link', { name: 'Console' })
    expect(button).toHaveAttribute(
      'href',
      authenticated ? '/dashboard' : '/sign-in'
    )
    button.focus()
    await userEvent.setup().keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', {
        name: authenticated ? 'Console destination' : 'Sign-in destination',
      })
    ).toBeVisible()
  }
)
