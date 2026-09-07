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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { AuthLayout } from '@/features/auth/auth-layout'
import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

let client: QueryClient
beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})
afterEach(() => {
  client.clear()
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

it('keeps focus inside the sign-in dialog and returns home when Escape closes it', async () => {
  const user = userEvent.setup()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['status'], { HeaderNavModules: { pricing: false } })
  vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: '' } })
  const root = createRootRoute()
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <h1>Home destination</h1>,
  })
  const signIn = createRoute({
    getParentRoute: () => root,
    path: '/sign-in',
    component: () => (
      <AuthLayout modalTitle='Sign in'>
        <label>
          Username
          <input />
        </label>
      </AuthLayout>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([home, signIn]),
    history: createMemoryHistory({ initialEntries: ['/sign-in'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  const dialog = await screen.findByRole('dialog', { name: 'Sign in' })
  expect(dialog).toContainElement(
    screen.getByRole('textbox', { name: 'Username' })
  )
  screen.getByRole('textbox', { name: 'Username' }).focus()
  await user.tab({ shift: true })
  expect(dialog).toContainElement(document.activeElement as HTMLElement)
  await user.keyboard('{Escape}')
  expect(
    await screen.findByRole('heading', { name: 'Home destination' })
  ).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('shows one legal consent before submit and keeps Google gated until consent', async () => {
  const user = userEvent.setup()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['status'], {
    user_agreement_enabled: true,
    privacy_policy_enabled: true,
    custom_oauth_providers: [{ slug: 'google', name: 'Google' }],
  })
  const root = createRootRoute()
  const signIn = createRoute({
    getParentRoute: () => root,
    path: '/sign-in',
    component: UserAuthForm,
  })
  const router = createRouter({
    routeTree: root.addChildren([signIn]),
    history: createMemoryHistory({ initialEntries: ['/sign-in'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  const google = await screen.findByRole('button', {
    name: 'Continue with Google',
  })
  const submit = screen.getByRole('button', { name: 'Sign in' })
  const consent = screen.getByRole('checkbox')
  expect(google).toBeDisabled()
  expect(submit).toBeDisabled()
  expect(screen.getAllByRole('link', { name: 'Privacy Policy' })).toHaveLength(
    1
  )
  expect(screen.getAllByRole('link', { name: 'User Agreement' })).toHaveLength(
    1
  )
  expect(consent).toHaveAccessibleName(
    'I have read and agree to the User Agreement and Privacy Policy'
  )
  expect(
    screen.getByRole('link', { name: 'Forgot password?' })
  ).toHaveAttribute('href', '/forgot-password')
  await user.click(consent)
  expect(google).toBeEnabled()
  expect(submit).toBeEnabled()
  await user.tab()
  expect(screen.getByRole('link', { name: 'User Agreement' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveFocus()
  await user.tab()
  expect(submit).toHaveFocus()
})

it('verifies an invitation link before showing Google and carries the same code into email registration', async () => {
  const { SignUpForm } =
    await import('@/features/auth/sign-up/components/sign-up-form')
  const user = userEvent.setup()
  const code = 'A1B2C3D4E5'
  window.history.replaceState({}, '', `/#invite=${code}`)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['status'], {
    invitation_only_enabled: true,
    user_agreement_enabled: true,
    privacy_policy_enabled: true,
    custom_oauth_providers: [{ slug: 'google', name: 'Google' }],
  })
  let resolveVerification: (value: {
    data: { success: boolean }
  }) => void = () => undefined
  const verification = new Promise<{ data: { success: boolean } }>(
    (resolve) => {
      resolveVerification = resolve
    }
  )
  const post = vi.spyOn(api, 'post').mockImplementation(async (url) => {
    if (url === '/api/registration-invitations/verify') return verification
    return { data: { success: false, message: 'Registration rejected' } }
  })
  const root = createRootRoute()
  const signUp = createRoute({
    getParentRoute: () => root,
    path: '/sign-up',
    component: SignUpForm,
  })
  const router = createRouter({
    routeTree: root.addChildren([signUp]),
    history: createMemoryHistory({ initialEntries: ['/sign-up'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  expect(
    await screen.findByRole('textbox', { name: 'Invitation code' })
  ).toHaveValue(code)
  expect(window.location.hash).toBe('')
  expect(
    screen.queryByRole('button', { name: 'Continue with Google' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('textbox', { name: 'Username' })
  ).not.toBeInTheDocument()
  resolveVerification({ data: { success: true } })
  const google = await screen.findByRole('button', {
    name: 'Continue with Google',
  })
  expect(google).toBeDisabled()
  await user.click(screen.getByRole('checkbox'))
  expect(google).toBeEnabled()
  expect(screen.getByRole('status')).toHaveTextContent(
    'Invitation code verified'
  )
  await user.click(screen.getByRole('button', { name: 'Continue with email' }))
  await user.type(
    screen.getByRole('textbox', { name: 'Username' }),
    'inviteduser'
  )
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'Invitation123!'
  )
  await user.type(
    screen.getByLabelText('Confirm password', { exact: true }),
    'Invitation123!'
  )
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      '/api/user/register',
      expect.objectContaining({
        username: 'inviteduser',
        invitation_code: code,
      }),
      expect.any(Object)
    )
  )
  await user.click(screen.getByRole('button', { name: /^Change$/ }))
  expect(
    await screen.findByRole('textbox', { name: 'Invitation code' })
  ).toHaveValue('')
  expect(
    screen.queryByRole('button', { name: 'Continue with Google' })
  ).not.toBeInTheDocument()
})

it('keeps the invitation step visible when validation fails and allows a corrected code', async () => {
  const { InvitationGate } =
    await import('@/features/auth/components/invitation-gate')
  client = new QueryClient()
  const user = userEvent.setup()
  const verified = vi.fn()
  const post = vi
    .spyOn(api, 'post')
    .mockResolvedValueOnce({
      data: { success: false, message: 'Invitation expired' },
    })
    .mockResolvedValueOnce({ data: { success: true } })
  render(<InvitationGate onVerified={verified} />)
  const input = screen.getByRole('textbox', { name: 'Invitation code' })
  await user.type(input, 'short')
  await user.click(screen.getByRole('button', { name: 'Verify and continue' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Please enter a valid invitation code'
  )
  expect(post).not.toHaveBeenCalled()
  await user.clear(input)
  await user.type(input, 'A1B2C3D4E5')
  await user.click(screen.getByRole('button', { name: 'Verify and continue' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Invitation expired'
  )
  expect(verified).not.toHaveBeenCalled()
  await user.clear(input)
  await user.type(input, 'b'.repeat(64))
  await user.click(screen.getByRole('button', { name: 'Verify and continue' }))
  await waitFor(() => expect(verified).toHaveBeenCalledWith('b'.repeat(64)))
})

it('asks a Google newcomer for an invitation and offers sign-in again when the pending authorization expires', async () => {
  const { OAuthInvitationCompletion } =
    await import('@/features/auth/components/oauth-invitation-completion')
  const user = userEvent.setup()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['status'], { invitation_only_enabled: true })
  const post = vi
    .spyOn(api, 'post')
    .mockResolvedValueOnce({ data: { success: true } })
    .mockRejectedValueOnce({
      response: { status: 410, data: { message: 'Authorization expired' } },
    })
  const root = createRootRoute()
  const callback = createRoute({
    getParentRoute: () => root,
    path: '/oauth/google',
    component: () => (
      <OAuthInvitationCompletion
        pending={{
          action: 'invitation_required',
          flow_token: 'verified-identity-token',
          expires_at: 4102444800,
          provider: 'Google',
        }}
      />
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([callback]),
    history: createMemoryHistory({ initialEntries: ['/oauth/google'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  const invitation = await screen.findByRole('textbox', {
    name: 'Invitation code',
  })
  await user.type(invitation, 'A1B2C3D4E5')
  await user.click(screen.getByRole('button', { name: 'Verify and continue' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your authorization has expired. Please sign in again.'
  )
  expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
    'href',
    '/sign-in'
  )
  expect(post).toHaveBeenCalledWith(
    '/api/oauth/registration/complete',
    { flow_token: 'verified-identity-token', invitation_code: 'A1B2C3D4E5' },
    expect.any(Object)
  )
})
