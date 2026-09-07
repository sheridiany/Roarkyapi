import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { RegistrationInvitations } from '@/features/registration-invitations'
import { api } from '@/lib/api'

it('copies generated links and codes separately, then removes a revoked invitation from the shareable result', async () => {
  const user = userEvent.setup()
  const clipboard = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const row = {
    id: 7,
    name: 'Partner',
    code_prefix: 'aaaaaaaa',
    status: 1,
    expires_at: 4102444800,
    used_user_id: 0,
    used_at: 0,
  }
  const code = 'A1B2C3D4E5'
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: { items: [row], total: 1 } },
  })
  vi.spyOn(api, 'post').mockResolvedValue({
    data: { success: true, data: [{ ...row, code }] },
  })
  const revoke = vi
    .spyOn(api, 'delete')
    .mockResolvedValue({ data: { success: true } })
  const view = render(
    <QueryClientProvider client={client}>
      <RegistrationInvitations />
    </QueryClientProvider>
  )
  try {
    await user.click(
      screen.getByRole('button', { name: 'Generate invitation codes' })
    )
    expect(
      await screen.findByRole('textbox', { name: 'Invitation link' })
    ).toHaveValue(`${window.location.origin}/sign-up#invite=${code}`)
    await user.click(
      screen.getByRole('button', { name: 'Copy invitation links' })
    )
    expect(clipboard).toHaveBeenLastCalledWith(
      `${window.location.origin}/sign-up#invite=${code}`
    )
    await user.click(
      screen.getByRole('button', { name: 'Copy invitation codes' })
    )
    expect(clipboard).toHaveBeenLastCalledWith(code)
    await user.click(screen.getByRole('button', { name: 'Revoke invitation' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'Invitation link' })
      ).not.toBeInTheDocument()
    )
    expect(revoke).toHaveBeenCalledWith('/api/registration-invitations/7')
  } finally {
    view.unmount()
    client.clear()
  }
})
