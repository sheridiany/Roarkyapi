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
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, test } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { useTopNavLinks } from '../use-top-nav-links'

let client: QueryClient
afterEach(() => {
  client?.clear()
  useAuthStore.getState().auth.reset()
  localStorage.clear()
})

test.each([false, true])(
  'saved navigation cannot restore removed public pages (authenticated: %s)',
  (authenticated) => {
    if (authenticated) {
      useAuthStore
        .getState()
        .auth.setUser({ id: 1, username: 'preview', role: 1 })
    }
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['status'], {
      HeaderNavModules: JSON.stringify({
        home: true,
        console: true,
        pricing: { enabled: true, requireAuth: true },
        rankings: { enabled: true, requireAuth: false },
        docs: true,
        about: true,
      }),
      docs_link: 'https://docs.example.com',
    })
    const { result } = renderHook(() => useTopNavLinks(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    expect(result.current.map((link) => [link.title, link.href])).toEqual([
      ['Console', '/dashboard'],
    ])
  }
)
