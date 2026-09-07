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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import type { ApiKey } from '../../types'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { api } = await import('@/lib/api')
const { ApiKeysProvider } = await import('../api-keys-provider')
const { ApiKeysMutateDrawer } = await import('../api-keys-mutate-drawer')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

type ApiMethod = (url: string, data?: unknown) => Promise<{ data: unknown }>
type MockableApi = {
  get: ApiMethod
  post: ApiMethod
}
type RenderedDrawer = {
  queryClient: InstanceType<typeof QueryClient>
}

const apiClient = api as unknown as MockableApi
const originalGet = apiClient.get
const originalPost = apiClient.post
let renderedDrawer: RenderedDrawer | null = null

function installApiFixtures(createdPayloads: Array<Record<string, unknown>>) {
  apiClient.get = async (url) => {
    switch (url) {
      case '/api/status':
        return { data: { data: { default_use_auto_group: true } } }
      case '/api/user/models':
        return { data: { success: true, data: [] } }
      case '/api/user/self/groups':
        return {
          data: {
            success: true,
            data: {
              auto: { desc: 'Automatic routing', ratio: 'auto' },
              default: { desc: 'Standard access', ratio: 1 },
              vip: { desc: 'Priority access', ratio: 2 },
            },
          },
        }
      case '/api/token/auto-groups':
        return {
          data: {
            success: true,
            data: { groups: ['vip', 'default'], max_count: 3 },
          },
        }
      default:
        throw new Error(`Unexpected GET ${url}`)
    }
  }
  apiClient.post = async (url, data) => {
    expect(url).toBe('/api/token/')
    expect(data && typeof data === 'object').toBeTruthy()
    createdPayloads.push(data as Record<string, unknown>)
    return { data: { success: true, data: {} } }
  }
}

async function renderCreateDrawer(currentRow?: ApiKey): Promise<void> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const freshAt = Date.now() + 60_000
  queryClient.setQueryData(
    ['status'],
    { default_use_auto_group: true },
    { updatedAt: freshAt }
  )
  queryClient.setQueryData(
    ['user-models'],
    { success: true, data: [] },
    { updatedAt: freshAt }
  )
  queryClient.setQueryData(
    ['user-groups'],
    {
      success: true,
      data: {
        auto: { desc: 'Automatic routing', ratio: 'auto' },
        default: { desc: 'Standard access', ratio: 1 },
        vip: { desc: 'Priority access', ratio: 2 },
      },
    },
    { updatedAt: freshAt }
  )
  queryClient.setQueryData(
    ['token-auto-groups'],
    {
      success: true,
      data: { groups: ['vip', 'default'], max_count: 3 },
    },
    { updatedAt: freshAt }
  )
  renderedDrawer = { queryClient }

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ApiKeysProvider>
          <ApiKeysMutateDrawer
            open
            onOpenChange={() => undefined}
            currentRow={currentRow}
          />
        </ApiKeysProvider>
      </I18nextProvider>
    </QueryClientProvider>
  )
  await waitFor(
    () => {
      const saveButton = findButton(
        currentRow ? 'Save changes' : 'Create',
        false
      )
      expect(saveButton).toBeEnabled()
    },
    { timeout: 1500 }
  )
}

function findButton(text: string, required: true): HTMLButtonElement
function findButton(text: string, required: false): HTMLButtonElement | null
function findButton(text: string, required = true): HTMLButtonElement | null {
  const button = screen
    .queryAllByRole<HTMLButtonElement>('button')
    .find((candidate) => candidate.textContent?.includes(text))
  if (required && !button) {
    throw new Error(`Expected button containing "${text}"`)
  }
  return button ?? null
}

function getControlByLabel(labelText: 'Name' | 'Quantity'): HTMLInputElement
function getControlByLabel(labelText: 'Group'): HTMLButtonElement
function getControlByLabel(labelText: 'Auto group order'): HTMLElement
function getControlByLabel(labelText: string): HTMLElement {
  if (labelText === 'Name') {
    return screen.getByRole('textbox', { name: /API Key Name/ })
  }
  const label = [...document.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === labelText
  )
  if (!label) {
    throw new Error(`Expected label "${labelText}"`)
  }

  const control =
    label.control ??
    label
      .closest('[data-slot="form-item"]')
      ?.querySelector<HTMLElement>(
        '[data-slot="form-control"], input, textarea, button[role="combobox"], [role="group"]'
      )
  if (!control) {
    throw new Error(`Expected control for label "${labelText}"`)
  }
  return control
}

function changeInput(input: HTMLInputElement, value: string): void {
  fireEvent.input(input, { target: { value } })
}

function selectComboboxOption(
  trigger: HTMLButtonElement,
  optionDescription: string
): void {
  fireEvent.click(trigger)
  const option = [
    ...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]'),
  ].find((candidate) => candidate.textContent?.includes(optionDescription))
  if (!option) {
    throw new Error(`Expected option containing "${optionDescription}"`)
  }
  fireEvent.click(option)
}

afterEach(() => {
  apiClient.get = originalGet
  apiClient.post = originalPost
  localStorage.clear()
  if (renderedDrawer) {
    renderedDrawer.queryClient.clear()
    renderedDrawer = null
  }
})

test('creating with Auto uses global routing without advanced controls', async () => {
  const createdPayloads: Array<Record<string, unknown>> = []
  installApiFixtures(createdPayloads)
  await renderCreateDrawer()
  expect(
    screen.queryByRole('button', { name: 'Advanced Settings' })
  ).not.toBeInTheDocument()
  changeInput(getControlByLabel('Name'), 'auto-key')
  fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  await waitFor(() => expect(createdPayloads).toHaveLength(1))
  expect(createdPayloads[0]).toMatchObject({
    name: 'auto-key',
    group: 'auto',
    auto_groups: [],
    cross_group_retry: true,
    model_limits_enabled: false,
    model_limits: '',
    allow_ips: '',
  })
})

test('compact create dialog keeps advanced fields collapsed and preserves expiry and quota choices on submit', async () => {
  const createdPayloads: Array<Record<string, unknown>> = []
  installApiFixtures(createdPayloads)
  await renderCreateDrawer()
  expect(screen.getByRole('dialog', { name: 'Create API Key' })).toBeVisible()
  expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument()
  changeInput(getControlByLabel('Name'), 'limited')
  selectComboboxOption(getControlByLabel('Group'), 'Standard access')
  fireEvent.click(screen.getByRole('checkbox', { name: 'Never expires' }))
  expect(
    screen.getByRole('checkbox', { name: 'Never expires' })
  ).not.toBeChecked()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Unlimited Quota' }))
  const quota = screen.getByRole('spinbutton')
  fireEvent.change(quota, { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  await waitFor(() => expect(createdPayloads).toHaveLength(1))
  expect(createdPayloads[0]).toMatchObject({
    name: 'limited',
    group: 'default',
    unlimited_quota: false,
  })
  expect(createdPayloads[0]?.expired_time).toBeGreaterThan(0)
  expect(createdPayloads[0]?.remain_quota).toBeGreaterThan(0)
})

test('new key form requires a name and shows quota before expiry with unlimited defaults', async () => {
  installApiFixtures([])
  await renderCreateDrawer()
  expect(screen.getByRole('textbox', { name: /API Key Name/ })).toHaveAttribute(
    'aria-required',
    'true'
  )
  const quota = screen.getByRole('checkbox', { name: 'Unlimited Quota' })
  const expiry = screen.getByRole('checkbox', { name: 'Never expires' })
  expect(quota).toBeChecked()
  expect(expiry).toBeChecked()
  expect(
    quota.compareDocumentPosition(expiry) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()
  expect(screen.queryByText('Auto group order')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
})

test.each(['default', 'auto'])(
  'editing basic fields preserves hidden restrictions for %s routing',
  async (group) => {
    installApiFixtures([])
    const row: ApiKey = {
      id: 7,
      name: 'Restricted',
      key: '',
      status: 1,
      remain_quota: 500000,
      used_quota: 0,
      unlimited_quota: false,
      expired_time: -1,
      created_time: 1,
      accessed_time: 1,
      group,
      auto_groups: group === 'auto' ? ['retired-group'] : [],
      cross_group_retry: false,
      model_limits_enabled: true,
      model_limits: 'gpt-5.1',
      allow_ips: '10.0.0.0/8',
    }
    const get = apiClient.get
    apiClient.get = async (url) =>
      url === '/api/token/7' ? { data: { success: true, data: row } } : get(url)
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    await renderCreateDrawer(row)
    expect(
      screen.queryByRole('button', { name: 'Advanced Settings' })
    ).not.toBeInTheDocument()
    changeInput(getControlByLabel('Name'), 'Renamed')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put.mock.calls[0]?.[1]).toMatchObject({
      id: 7,
      name: 'Renamed',
      model_limits_enabled: true,
      model_limits: 'gpt-5.1',
      allow_ips: '10.0.0.0/8',
      auto_groups: group === 'auto' ? ['retired-group'] : [],
    })
  }
)

test('compact key form scrolls with the dialog only when the viewport is too short', async () => {
  installApiFixtures([])
  await renderCreateDrawer()
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveClass('overflow-y-auto')
  const form = screen
    .getByRole('textbox', { name: /API Key Name/ })
    .closest('form')
  expect(form).not.toHaveClass('overflow-y-auto')
})
