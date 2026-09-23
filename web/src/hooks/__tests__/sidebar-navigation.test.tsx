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
import { afterEach, expect, it } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { useSidebarConfig } from '../use-sidebar-config'
import { useSidebarData } from '../use-sidebar-data'

let client: QueryClient

afterEach(() => {
  client?.clear()
  useAuthStore.getState().auth.reset()
})

it.each([true, false])(
  'restores playground according to its saved visibility (%s) while keeping chat presets removed',
  (playground) => {
    const saved = JSON.stringify({
      chat: { enabled: true, chat: true, playground },
      console: { enabled: true, token: true, log: false },
    })
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'preview',
      role: 1,
      sidebar_modules: saved,
    })
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['status'], { SidebarModulesAdmin: saved })
    const { result } = renderHook(
      () => useSidebarConfig(useSidebarData().navGroups),
      {
        wrapper: (props: PropsWithChildren) => (
          <QueryClientProvider client={client}>
            {props.children}
          </QueryClientProvider>
        ),
      }
    )
    const names = result.current.flatMap((group) =>
      group.items.map((item) => item.title)
    )
    expect(names.includes('Model Testing')).toBe(playground)
    if (playground) {
      const personal = result.current.find((group) => group.id === 'personal')
      expect(personal?.items.map((item) => item.url)).toEqual([
        '/plans',
        '/wallet',
        '/playground',
        '/profile',
        '/security',
      ])
    }
    expect(names).not.toContain('Playground')
    expect(names).not.toContain('Chat')
    expect(names).toContain('API Keys')
    expect(names).toContain('Data Analysis')
    expect(names).toContain('Model Pricing')
    expect(names).not.toContain('Dashboard')
    expect(names).not.toContain('Usage Logs')
  }
)
