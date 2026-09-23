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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { Profile } from '../../index'
import { ProfileSecurityCard } from '../profile-security-card'

let client: QueryClient

afterEach(() => {
  client?.clear()
})

test('profile exposes email, Google, and password actions while hiding other account settings', async () => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(['status'], {
    github_oauth: true,
    wechat_login: true,
    custom_oauth_providers: [
      {
        id: 9,
        name: 'Other provider',
        slug: 'other',
        authorization_endpoint: 'https://example.test/authorize',
      },
    ],
  })
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/user/self') {
      return {
        data: {
          success: true,
          data: {
            id: 2,
            username: 'preview',
            email: 'preview@example.test',
            role: 1,
          },
        },
      }
    }
    throw new Error(`Unexpected request: ${url}`)
  })
  render(
    <QueryClientProvider client={client}>
      <Profile />
    </QueryClientProvider>
  )
  expect(await screen.findByText('preview@example.test')).toBeInTheDocument()
  expect(screen.getByText('Google')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Not enabled' })).toBeDisabled()
  for (const label of [
    'GitHub',
    'WeChat',
    'Other provider',
    'Access Token',
    'Delete Account',
    'Settings & Preferences',
    'Login Sessions',
  ]) {
    expect(screen.queryByText(label)).not.toBeInTheDocument()
  }
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Change' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Current Password')).toBeVisible()
  expect(screen.getByLabelText('New Password')).toBeVisible()
  expect(screen.getByLabelText('Confirm New Password')).toBeVisible()
})

test('inline password form rejects mismatched confirmation, reports server failure, then clears after success', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        scope: 'account.password.change',
        methods: [{ method: 'password', available: true }],
        oauth_providers: [],
        password_encryption_enabled: false,
      },
    },
  })
  vi.spyOn(api, 'post').mockResolvedValue({
    data: {
      success: true,
      data: {
        scope: 'account.password.change',
        method: 'password',
        proof_token: 'password-proof',
        expires_at: Math.floor(Date.now() / 1000) + 60,
      },
    },
  })

  const put = vi
    .spyOn(api, 'put')
    .mockResolvedValueOnce({
      data: { success: false, message: 'Current password is incorrect' },
    })
    .mockResolvedValueOnce({
      data: { success: true, data: { has_password: true } },
    })
  render(
    <ProfileSecurityCard
      loading={false}
      profile={{
        id: 2,
        username: 'preview',
        display_name: 'Preview',
        role: 1,
        group: 'default',
        quota: 0,
        used_quota: 0,
        request_count: 0,
        status: 1,
        created_time: 1,
      }}
    />
  )
  const user = userEvent.setup()
  const current = screen.getByLabelText('Current Password')
  const next = screen.getByLabelText('New Password')
  const confirmation = screen.getByLabelText('Confirm New Password')
  await user.type(current, 'old-password')
  await user.type(next, 'new-password')
  await user.type(confirmation, 'mismatch')
  await user.click(screen.getByRole('button', { name: 'Change Password' }))
  expect(await screen.findByText('Passwords do not match')).toBeVisible()
  expect(put).not.toHaveBeenCalled()
  await user.clear(confirmation)
  await user.type(confirmation, 'new-password')
  await user.click(screen.getByRole('button', { name: 'Change Password' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Current password is incorrect'
  )
  expect(next).toHaveValue('new-password')
  await user.click(screen.getByRole('button', { name: 'Change Password' }))
  await waitFor(() => expect(current).toHaveValue(''))
  expect(next).toHaveValue('')
  expect(confirmation).toHaveValue('')
  expect(put).toHaveBeenLastCalledWith(
    '/api/user/self',
    { original_password: 'old-password', password: 'new-password' },
    expect.objectContaining({
      acceptAuthRotation: true,
      headers: { 'X-Security-Proof': 'password-proof' },
    })
  )
})

test('email and configured Google bindings use full-width rows', async () => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(['status'], {
    custom_oauth_providers: [
      {
        id: 9,
        name: 'Google',
        slug: 'google',
        authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      },
    ],
  })
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/user/self') {
      return {
        data: {
          success: true,
          data: {
            id: 2,
            username: 'preview',
            email: 'preview@example.test',
            role: 1,
          },
        },
      }
    }
    if (url === '/api/user/oauth/bindings') {
      return {
        data: {
          success: true,
          data: [
            {
              provider_id: 9,
              provider_user_id: 'opaque-google-id',
              provider_name: 'Google',
            },
          ],
        },
      }
    }
    throw new Error(`Unexpected request: ${url}`)
  })
  render(
    <QueryClientProvider client={client}>
      <Profile />
    </QueryClientProvider>
  )
  expect(await screen.findByRole('button', { name: 'Unbind' })).toBeEnabled()
  const googleRow = screen.getByText('Google').closest('.grid')
  const emailRow = screen.getByText('preview@example.test').closest('.grid')
  expect(googleRow).toHaveClass('grid-cols-1')
  expect(googleRow).not.toHaveClass('sm:grid-cols-2')
  expect(emailRow).toHaveClass('grid-cols-1')
  expect(screen.queryByText('opaque-google-id')).not.toBeInTheDocument()
})

test('Google users without a password can start identity verification without entering an old password', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        scope: 'account.password.set',
        methods: [{ method: 'oauth', available: true }],
        oauth_providers: [{ slug: 'google', name: 'Google' }],
        password_encryption_enabled: false,
      },
    },
  })
  render(
    <ProfileSecurityCard
      loading={false}
      profile={{
        id: 2,
        username: 'google',
        has_password: false,
        display_name: 'Google',
        role: 1,
        group: 'default',
        quota: 0,
        used_quota: 0,
        request_count: 0,
        status: 1,
        created_time: 1,
      }}
    />
  )
  expect(screen.queryByLabelText('Current Password')).not.toBeInTheDocument()
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('New Password'), 'first-password')
  await user.type(
    screen.getByLabelText('Confirm New Password'),
    'first-password'
  )
  await user.click(screen.getByRole('button', { name: 'Set Password' }))
  expect(await screen.findByRole('dialog')).toBeVisible()
  expect(get).toHaveBeenCalledWith(
    '/api/verify/methods',
    expect.objectContaining({ params: { scope: 'account.password.set' } })
  )
})

test('first password setup submits the proof without an old password and then switches to change mode', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        scope: 'account.password.set',
        methods: [{ method: '2fa', available: true }],
        oauth_providers: [],
        password_encryption_enabled: false,
      },
    },
  })
  vi.spyOn(api, 'post').mockResolvedValue({
    data: {
      success: true,
      data: {
        scope: 'account.password.set',
        method: '2fa',
        proof_token: 'first-password-proof',
        expires_at: Math.floor(Date.now() / 1000) + 60,
      },
    },
  })
  const put = vi.spyOn(api, 'put').mockResolvedValue({
    data: { success: true, data: { has_password: true } },
  })
  const refresh = vi.fn()
  render(
    <ProfileSecurityCard
      onProfileUpdate={refresh}
      loading={false}
      profile={{
        id: 2,
        username: 'google',
        has_password: false,
        display_name: 'Google',
        role: 1,
        group: 'default',
        quota: 0,
        used_quota: 0,
        request_count: 0,
        status: 1,
        created_time: 1,
      }}
    />
  )
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('New Password'), 'first-password')
  await user.type(
    screen.getByLabelText('Confirm New Password'),
    'first-password'
  )
  await user.click(screen.getByRole('button', { name: 'Set Password' }))
  await user.type(
    await screen.findByLabelText('Authenticator code or backup code'),
    '123456'
  )
  await user.click(screen.getByRole('button', { name: 'Verify' }))
  expect(await screen.findByLabelText('Current Password')).toBeVisible()
  expect(put).toHaveBeenCalledWith(
    '/api/user/self',
    { password: 'first-password' },
    expect.objectContaining({
      headers: { 'X-Security-Proof': 'first-password-proof' },
    })
  )
  expect(screen.getByLabelText('New Password')).toHaveValue('')
  expect(refresh).toHaveBeenCalledTimes(1)
})
